---
title: "企业级 Java AI 框架选型：Spring AI vs LangChain4j"
description: "从真实需求出发对比 Spring AI 与 LangChain4j 的抽象取向、扩展成本与踩坑点，给出混用方案与选型建议。"
date: 2026-03-11
tags: ["Java", "Spring AI", "LangChain4j", "AI"]
weight: 85
---

去年团队要在 Java 技术栈上落地一批 AI 应用，绕不开这两个框架的选型。当时网上的对比文章基本都是把两边 README 抄一遍，看完还是不知道该选哪个。这篇写我们实际用下来的差异，包括最后为什么两个都在用。

## 选型的前提：先定义需求

框架选型没有绝对答案，只有对不对得上需求。我们的实际需求是这五条：

1. **必须能接私有化部署的模型**。行内模型走内网网关，协议兼容 OpenAI 但不完全一致，鉴权是自研的。
2. **必须能接入现有 Spring Boot 体系**。配置中心、链路追踪、指标上报、统一异常处理都已经是现成的。
3. **需要工具调用（function calling）**，且工具要以真实用户身份调用下游服务。
4. **需要 RAG，但向量库是行内统一提供的**，不是 Pinecone 这类云服务。
5. **要能做提示词版本管理和灰度**。

注意第 4、5 条：这两条决定了框架自带的"开箱即用"能力对我们价值有限，我们更看重扩展点是否好写。

> 选型时最该问的不是"哪个功能多"，而是"我要改的那部分，改起来疼不疼"。

## Spring AI 的取舍

### 优势

抽象设计非常 Spring。`ChatClient` 的流式 API 写起来舒服，和 Spring Boot 的自动配置、`RestClient`、Micrometer 打通得彻底。

```java
@Service
public class ProductAdvisor {

    private final ChatClient chatClient;

    public ProductAdvisor(ChatClient.Builder builder, VectorStore vectorStore) {
        this.chatClient = builder
                .defaultSystem("你是银行零售产品顾问，只依据检索到的资料回答。")
                .defaultAdvisors(
                        new QuestionAnswerAdvisor(vectorStore),
                        new MessageChatMemoryAdvisor(new InMemoryChatMemory()))
                .build();
    }

    public String consult(String question, String sessionId) {
        return chatClient.prompt()
                .user(question)
                .advisors(a -> a.param(
                        ChatMemory.CONVERSATION_ID, sessionId))
                .call()
                .content();
    }
}
```

`Advisor` 这个扩展点设计得不错，本质是拦截器链。我们的护栏、审计留痕、数字接地校验全部实现成 Advisor，一次编写全局生效：

```java
public class AuditAdvisor implements CallAroundAdvisor {

    private final AuditRepository auditRepo;

    @Override
    public AdvisedResponse aroundCall(
            AdvisedRequest request, CallAroundAdvisorChain chain) {
        String sessionId = (String) request.adviseContext().get("sessionId");
        auditRepo.saveInput(sessionId, request.userText());

        AdvisedResponse response = chain.nextAroundCall(request);

        auditRepo.saveOutput(sessionId,
                response.response().getResult().getOutput().getText());
        return response;
    }

    @Override
    public int getOrder() { return 100; }
}
```

配置层面也是纯 Spring 风格，接私有网关只要覆盖 base-url 和补一个自定义请求拦截器：

```yaml
spring:
  ai:
    openai:
      base-url: https://ai-gateway.internal.bank/v1
      api-key: ${AI_GATEWAY_KEY}
      chat:
        options:
          model: qwen-max-internal
          temperature: 0.2
      embedding:
        options:
          model: bge-large-zh
```

### 代价

第一是版本演进快，破坏性变更多。我们从 M 版本一路跟到正式版，`Advisor` 接口签名改过，`FunctionCallback` 相关 API 重构过一轮，每次升级都要改代码。上生产要做好锁版本的准备。

第二是抽象偏薄。它假设你的模型服务行为标准，一旦下游网关返回非标准结构（比如错误码包在 200 响应里），就得自己写 `ResponseErrorHandler` 去兜。

第三是多步 Agent 编排能力弱。它更像"把模型调用做成 Spring 风格的客户端"，复杂的多轮规划需要自己实现循环控制。

## LangChain4j 的取舍

### 优势

抽象层次更高，`AiServices` 的声明式风格对简单场景效率极高。定义一个接口就能用：

```java
public interface ComplaintClassifier {

    @SystemMessage("""
            你是银行投诉分类助手。根据投诉内容判断所属业务条线与紧急程度。
            只输出 JSON，不要解释。
            """)
    @UserMessage("投诉内容：{{content}}")
    ComplaintResult classify(@V("content") String content);
}

// 装配
ComplaintClassifier classifier = AiServices.builder(ComplaintClassifier.class)
        .chatLanguageModel(model)
        .tools(new TicketQueryTool())
        .chatMemoryProvider(id -> MessageWindowChatMemory.withMaxMessages(10))
        .build();
```

结构化输出（自动把 JSON 反序列化成 POJO）比 Spring AI 成熟一些，工具调用的循环控制也是框架内置的，不用自己写。

第二个优势是集成的组件多且杂。各种向量库、文档解析器、切分策略都有现成实现。做原型验证时能省不少时间。

### 代价

第一是和 Spring 生态是"能集成"而非"原生集成"。虽然有 `langchain4j-spring-boot-starter`，但很多能力还是要手动装 Bean。链路追踪、指标这些要自己接。

第二是抽象泄漏时更难改。它的封装比 Spring AI 深，`AiServices` 内部帮你做的事情多，一旦行为和预期不符，排查要读框架源码。我们遇到过工具调用超过预期轮次的问题，最后是靠限制 `maxSequentialToolsInvocations` 解决的，但定位过程花了一天。

第三是 API 风格偏 Python 移植感，命名和 Java 团队的习惯不太一致，代码评审时经常要解释。

> 抽象厚薄没有优劣，只有匹配度。原型阶段厚抽象让你三天做出演示；生产阶段薄抽象让你三小时定位故障。问题是这两个阶段的需求是冲突的，而框架只能选一边。

还有一个容易忽略的差异：可观测性的接入成本。Spring AI 走 Micrometer，指标和链路自动进现有监控体系；LangChain4j 需要自己实现监听器把 token 用量、调用耗时、工具调用次数上报出来。这部分工作量不大，但在需要按业务方分摊模型成本时是硬需求，不能等上线后再补。

## 关键维度对比

| 维度 | Spring AI | LangChain4j | 备注 |
| --- | --- | --- | --- |
| Spring Boot 集成 | 原生，自动配置完整 | 有 starter，部分需手动装配 | 已有 Spring 体系时差异明显 |
| 抽象层次 | 偏薄，接近模型客户端 | 偏厚，封装多步逻辑 | 薄的好调试，厚的写得快 |
| 工具调用 | 需自行控制多轮循环 | 框架内置循环 | 复杂 Agent 时 LangChain4j 省事 |
| 结构化输出 | 可用，偶需手工兜底 | 更成熟 | 分类抽取类任务差距明显 |
| 扩展点 | Advisor 链，清晰好写 | 拦截能力较分散 | 做统一护栏时 Spring AI 占优 |
| 组件生态 | 主流选项齐备 | 更广更杂 | 原型阶段 LangChain4j 更快 |
| 私有网关适配 | 覆盖配置即可，容易 | 需自定义 ChatModel 实现 | 两者都能做 |
| API 稳定性 | 演进较快，需锁版本 | 相对平稳 | 都建议锁小版本 |
| 团队上手成本 | Spring 开发者几乎为零 | 需要额外学习概念 | 团队因素权重不低 |

## 我们的实际选择与混用方式

结论是**主链路用 Spring AI，离线与批处理任务用 LangChain4j**。

对客链路选 Spring AI，原因是这条链路上"可控"的权重远高于"写得快"：护栏、审计、限流、降级全都要接现有基础设施，Advisor 机制正好能把这些横切关注点统一收口，出问题也容易顺着调用栈查下去。

离线场景选 LangChain4j，比如投诉工单分类、合同要素抽取、日志归因分析。这些任务的共同点是不对客、可重跑、结构化输出要求高，`AiServices` 的声明式写法确实效率高。

两者共存需要注意的是依赖冲突。两边都可能引入不同版本的 JSON、HTTP 客户端，我们的处理是在父 POM 统一管理并排除重复传递依赖：

```bash
# 上线前必查依赖树，确认没有版本分裂
mvn dependency:tree -Dincludes='com.fasterxml.jackson*' | grep -E 'jackson-(core|databind)'
mvn dependency:tree -Dincludes='io.netty*,com.squareup.okhttp3*' | sort -u

# 检查是否存在同一 artifact 的多版本共存
mvn dependency:tree -Dverbose | grep -i 'omitted for conflict' | sort -u
```

另外一个务必要做的隔离：把模型调用封装到自己的一层门面接口里，业务代码只依赖这层门面。这样将来换框架的成本是有限的，不至于让框架的 API 渗透到几百个业务类里。

门面不需要设计得多复杂，一个 `AiChatPort` 接口加上请求响应两个 DTO 就够了。关键是纪律：业务代码里不允许出现 `ChatClient`、`AiServices` 这些框架类型的 import。我们在构建阶段加了一条静态检查规则，业务模块引用框架包直接构建失败，这比靠代码评审提醒有效得多。

> 这个行业的模型和框架大概每半年就会有一次值得重新评估的变化。所以真正该问的问题不是"现在哪个最好"，而是"半年后换掉它要改多少行代码"。答案控制在几十行以内，选型就不再是一个高风险决策。

## 落地建议

给几条实操结论：

- **已有 Spring Boot 体系、需要严格管控的对客链路，选 Spring AI**。扩展点清晰是长期维护的关键。
- **做原型、离线批处理、结构化抽取，选 LangChain4j**。写得快，重跑成本低。
- **两个都要锁版本**。写进 dependencyManagement，不要用范围版本。升级作为独立事项排期，配回归测试。
- **自建一层门面隔离框架**。这一条比选哪个框架更重要。
- **别指望框架解决 RAG 质量问题**。框架给的是管道，检索效果取决于你的文档切分、别名映射和元数据治理。
- **提示词不要硬编码在注解或代码里**。放配置中心或数据库，支持版本和灰度，否则每次改文案都要发版。

回头看，这次选型上真正影响长期效率的决策只有两个：一是把模型调用隔离到门面层，二是把护栏和审计做成统一拦截而不是散落在各处调用点。框架选哪个，反而是可以在半年后修正的决定。
