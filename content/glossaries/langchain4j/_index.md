---
url: /glossary/langchain4j/
title: LangChain4j
summary: Java 生态的 LLM 应用开发框架。提供模型接入、提示模板、记忆、工具调用、RAG 与 AI Service 声明式编排。
term_aliases:
  - LangChain4J
domain: 技术组件
related:
  - spring-ai
---

## 定位

LangChain4j 是 **Java / Kotlin** 的 LLM 应用框架，目标与 Python 的 LangChain 类似，但 API 设计更贴合 Java 的静态类型和 Spring 生态。它不绑定某个云厂商，模型、向量库、嵌入模型都以可插拔的 provider 形式提供。

## 核心抽象

- **ChatModel / StreamingChatModel**：同步与流式对话模型接口，切换 OpenAI、通义、DashScope、Ollama 只换实现。
- **AiServices**：最实用的一层。定义一个 Java 接口加注解，框架自动生成实现，把「调模型 + 解析返回 + 调工具」封装成一次普通方法调用。
- **Tools（Function Calling）**：把 Java 方法暴露给模型调用，用 `@Tool` 标注即可。
- **ChatMemory**：会话记忆，支持按窗口或按 token 数淘汰。
- **RAG 三件套**：Document Loader → Embedding Store → Retriever，配合 `AiServices` 可以几行代码接出检索增强。

## 与 Spring AI 怎么选

| 维度 | LangChain4j | Spring AI |
|---|---|---|
| 出身 | 社区项目，后与 LangChain 建立合作 | Spring 官方 |
| 生态绑定 | 中立，可独立使用 | 深度绑定 Spring Boot 自动配置 |
| RAG 与工具链 | 组件更丰富，迭代更快 | 抽象更规整，与 Spring 生态一致 |
| 企业级特性 | 依赖自行集成 | Observability、配置体系天然对齐 |

银行内部已有统一 LLM 网关时，两者都能通过自定义 `ChatModel` 实现接入。若团队以 Spring Boot 为主且看重长期维护与官方背书，[Spring AI](/glossary/spring-ai/) 更稳；若需要更灵活的编排能力和更快的特性迭代，LangChain4j 更合适。

## 落地注意

- **超时与重试必须显式配置**：默认超时往往不适合内网网关的响应时间分布。
- **结构化输出要做校验**：让模型输出 JSON 后反序列化，务必做 schema 校验与兜底，不要假设模型一定返回合法结构。
- **工具调用的权限边界**：模型能调用的方法是「能力」，也是「攻击面」，涉及资金与数据的工具必须做独立的鉴权与审计。
