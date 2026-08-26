---
title: "对客 AI Agent 平台建设思路"
description: "从合规约束出发，讨论银行对客场景下 AI Agent 平台的分层设计、知识检索、安全管控与评测体系。"
date: 2026-02-09
tags: ["AI", "Agent", "平台架构", "银行"]
weight: 92
---

内部效率类的 AI 应用怎么做都不算太难，做错了也就是员工少用几次。对客不一样：一句话说错可能就是投诉、监管问询甚至赔付。这篇记录我们做对客 Agent 平台时的思路，重点不在模型，在约束。

## 对客场景的特殊约束

先把约束写清楚，架构自然就出来了。

- **不能瞎说**。产品收益率、费率、期限这类数字，只要模型自由生成就一定会出错。这类回答必须来自系统数据，不能来自模型记忆。
- **不能越权**。查余额要认证到本人，代客操作要有明确授权链路。Agent 调用工具时的身份必须是真实用户身份，不是服务账号。
- **要能复盘**。每一次对话的输入、检索命中、工具调用、最终输出都要能查到，而且要留存到合规要求的期限。
- **延迟有上限**。用户在 App 里等超过三秒基本就退出了。多轮反思、多次检索这些提升准确率的手段，成本是延迟。
- **要能降级**。模型服务不可用时，必须能退回到规则问答或人工客服，不能白屏。

> 对客 Agent 的技术难点不是让它更聪明，而是让它在不确定的地方老实承认不知道，并且把用户交给正确的下一环节。

## 平台分层：从模型到业务

我们最后落在四层。分层的目的很实际：业务方只关心自己那层，不用理解底下的模型细节。

### 网关层

统一的模型接入层，屏蔽底层模型差异。做三件事：

1. 多模型路由与降级（主模型超时自动切备用模型）
2. 配额与限流（按业务方、按用户维度双重限流）
3. 计费与用量统计（按 token 归集到业务方成本中心）

这一层不允许有任何业务逻辑。它唯一的职责是让上层调用模型像调用一个稳定的内部服务。

### 编排层

Agent 的运行时。定义一个 Agent 需要：系统提示词、可用工具集、知识库范围、护栏规则、降级策略。我们用配置描述而不是写代码，业务方在控制台就能改提示词并灰度发布。

```yaml
agent:
  code: retail-product-consult
  name: 零售产品咨询助手
  model:
    primary: qwen-max
    fallback: internal-7b
    temperature: 0.2
    timeout_ms: 2500
  autonomy: tool_calling   # 可选 qa_only / tool_calling / multi_step
  max_steps: 3
  knowledge:
    collections: [product-manual, faq-retail]
    top_k: 5
    min_score: 0.62
  tools:
    - code: query_product_rate
      auth: user_token       # 以真实用户身份调用
    - code: query_my_balance
      auth: user_token
      require_mfa: true
  guardrail:
    input: [prompt_injection, sensitive_topic]
    output: [pii_mask, number_grounding, disclaimer_append]
  fallback:
    on_model_error: rule_based_faq
    on_low_confidence: transfer_human
```

### 工具层

工具就是被包装成模型可调用形式的业务接口。我们的规范是：工具必须是幂等查询，或者是带确认步骤的操作。**没有确认步骤的写操作一律不开放给 Agent。**

```java
@AgentTool(
    code = "query_product_rate",
    description = "查询指定理财产品的当前费率与业绩比较基准。"
                + "仅当用户明确提到产品名称或产品代码时调用。",
    auth = AuthMode.USER_TOKEN)
public class QueryProductRateTool implements Tool<RateQuery, RateResult> {

    private final ProductFacade productFacade;

    @Override
    public RateResult invoke(RateQuery query, AgentContext ctx) {
        // 身份透传：用当前会话用户的凭据调用下游，而非服务账号
        UserPrincipal user = ctx.currentUser();
        ProductDetail detail = productFacade.detail(
                query.productCode(), user.credential());

        if (detail == null) {
            // 明确返回"查不到"，让模型据此回复，而不是让它猜
            return RateResult.notFound(query.productCode());
        }
        return new RateResult(
                detail.code(), detail.name(),
                detail.rateDesc(), detail.benchmarkDesc(),
                detail.updatedAt());
    }
}
```

工具描述写得好不好，直接决定模型调用得准不准。我们的经验是描述里一定要写清楚**什么时候不该调用**，比只写功能有效得多。

### 应用层

具体的对客入口：App 智能助手、微信客服、电话语音。这一层负责渠道适配和会话管理，不重复实现编排逻辑。

## 知识与检索

### 检索质量决定上限

做了几个月才认清一件事：对客问答的准确率瓶颈几乎全在检索，不在模型。模型拿到正确的三段材料，回答质量差异很小；拿到错的材料，多强的模型都救不回来。

有效的改进按性价比排序：

1. **文档切分对齐语义单元**。产品说明书按条款切，不按固定字数切。这一项改完召回率提升最明显。
2. **补充问法别名**。用户问"提前拿出来要扣钱吗"，文档写的是"提前赎回费率"。人工维护一批别名映射，比换 embedding 模型有用。
3. **混合检索**。向量召回加上关键词召回，产品代码、专有名词这类精确匹配场景必须靠关键词兜底。
4. **元数据过滤**。按渠道、客群、生效日期过滤，避免把已下架产品的材料检索出来。

> 已下架产品的文档留在知识库里，是我们上线初期最严重的问题来源。知识库需要和产品生命周期联动下架，不能只做增量入库。

### 数字必须落地到系统数据

只要回答里出现金额、比率、日期，就必须能追溯到某次工具调用的返回值。我们在输出护栏里做了一道数字接地校验：抽取回答中的数字，逐个比对本轮工具返回和检索片段，比不上的直接拦截重试。

## 安全与合规

### 输入输出双向管控

输入侧拦提示注入和敏感话题，输出侧做四件事：

| 环节 | 做法 | 拦截后策略 |
| --- | --- | --- |
| 个人信息脱敏 | 正则加命名实体识别，卡号手机号身份证掩码 | 直接改写后放行 |
| 数字接地校验 | 回答中数字必须来自工具返回或检索片段 | 重试一次，仍失败转人工 |
| 越权内容检测 | 是否回答了当前用户无权查看的信息 | 拦截并记录审计 |
| 免责声明 | 投资类回答追加风险提示 | 追加后放行 |

### 留痕要按会话为单位组织

审计需要的不是零散日志，而是能还原一次完整对话的证据链。我们把会话 ID 贯穿全链路，每轮记录：用户输入原文、护栏判定、检索命中的文档 ID 与分数、工具调用参数与返回、模型原始输出、最终对外输出。

存储上分冷热两层，热数据放三个月支持在线排查，冷数据归档到对象存储满足留存要求。

## 可观测与评测

线上指标只能告诉你有没有崩，不能告诉你答得对不对。所以评测集必须离线建。

我们的做法是维护一个几百条的黄金集，每次提示词或知识库变更都跑一遍：

```bash
#!/usr/bin/env bash
# 灰度前的回归评测，任一指标跌破阈值则阻断发布
AGENT_CODE=$1
VERSION=$2

agent-eval run \
  --agent "${AGENT_CODE}" \
  --version "${VERSION}" \
  --dataset golden/retail-consult-v7.jsonl \
  --metrics grounding,answer_relevance,refusal_accuracy,tool_precision \
  --report "reports/${AGENT_CODE}-${VERSION}.json"

agent-eval gate \
  --report "reports/${AGENT_CODE}-${VERSION}.json" \
  --min grounding=0.95 \
  --min tool_precision=0.90 \
  --min refusal_accuracy=0.85 \
  || { echo "[BLOCK] 评测未达标，禁止发布"; exit 1; }
```

其中 `refusal_accuracy`（该拒答时是否拒答）是最容易被忽略但对客最关键的指标。我们专门构造了一批超范围、诱导越权、模糊指代的用例，就是为了确认它会老实说不知道。

线上侧则盯四个指标：首字延迟、工具调用失败率、护栏拦截率、转人工率。转人工率要分开看——因为答不上来而转人工是正常的，因为答错被用户质疑而转人工才是问题。这两类必须在埋点时就区分开，事后从日志里是分不出来的。

> 黄金集会腐坏。产品下架、费率调整、话术更新之后，昨天的正确答案就是今天的错误答案。我们把评测集的维护挂在产品上线流程里，产品变更必须同步更新对应用例，否则评测分数会变成一个让人安心的假象。

## 分阶段落地建议

如果重新做一遍，我会这么排：

1. 先做纯知识问答，只读不写，不给任何工具。把检索质量和护栏打磨到能上线的水平。
2. 再开放只读工具，比如产品查询、网点查询。此时重点是身份透传和工具调用准确率。
3. 然后开放带确认的轻操作，比如预约、申请提交。必须有二次确认页面，不允许模型直接提交。
4. 最后才考虑多步自主规划，而且只在低风险场景开。

不要反过来。先做复杂编排再补护栏，等于把风险留到最后暴露。

对客 Agent 平台建到现在，我最大的体会是：真正的工程量都花在了模型之外——检索的数据治理、身份的端到端透传、护栏的规则维护、评测集的持续更新。模型本身反倒是最容易替换的一环。把这些基础设施建好，换模型只是改一行配置；建不好，再好的模型也只是把错误答得更流畅。
