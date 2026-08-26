---
title: "消息队列选型：Kafka vs Pulsar vs RabbitMQ"
description: "从模型、吞吐、顺序性和运维复杂度对比三款主流消息中间件，给出银行场景下的选型思路。"
date: 2026-02-28
tags: [消息队列, Kafka, Pulsar, RabbitMQ]
weight: 20
---

消息队列是分布式系统的神经系统，但 Kafka、Pulsar、RabbitMQ 三者的设计哲学差异极大。选错不是「换个客户端」的事，而是架构重做。下面从几个工程最关心的维度拆开看。

## 模型差异是根本

- **RabbitMQ**：经典消息代理，面向「消息」和「队列」，支持丰富路由（直连、主题、头部、扇出）。适合任务分发、低延迟小消息。
- **Kafka**：日志型、分区有序、拉取消费，面向「流」和「事件溯源」。适合高吞吐、可重放。
- **Pulsar**：计算存储分离，分层架构，原生多租户和跨地域复制。适合既要 Kafka 的流、又要 RabbitMQ 的队列语义的统一平台。

```bash
# Kafka 顺序消费依赖分区
bin/kafka-console-consumer.sh \
  --topic orders --bootstrap-server b1:9092 \
  --partition 0 --offset earliest
```

## 关键维度对比

| 维度 | Kafka | Pulsar | RabbitMQ |
| --- | --- | --- | --- |
| 吞吐 | 极高 | 极高 | 中等 |
| 消息模型 | 流/日志 | 流+队列 | 队列 |
| 顺序性 | 分区内有序 | 分区/Key 有序 | 队列有序 |
| 运维复杂度 | 中 | 高（含 BookKeeper） | 低 |
| 消费模型 | 拉取、可重放 | 拉取、可重放 | 推送 |

## 选型思路

1. **事件流、日志、可重放** → Kafka 稳。审计、CDC、行为埋点这类场景它的重放能力几乎是刚需。
2. **统一消息平台、多租户、跨地域** → Pulsar 更合适，但团队要扛得住运维。
3. **任务队列、复杂路由、低延迟** → RabbitMQ 更直接。

```java
// 用消息头做复杂路由（RabbitMQ 风格）
channel.basicPublish("orders.topic",
    "order.created.vip",  // routingKey
    props, body);
```

> 别用 RabbitMQ 扛日均百亿事件流，也别用 Kafka 做需要复杂路由的任务分发——用对的工具，比用最强的工具重要。

银行场景里，核心事件总线多用 Kafka 保证可重放与审计；内部任务编排可用 RabbitMQ。Pulsar 适合已经长成「平台」的团队。选型时还要把「团队能不能运维」算进成本，而不是只看基准测试数字。
