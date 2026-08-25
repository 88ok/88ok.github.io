---
title: Kafka
description: 分布式消息引擎，聚焦存储与消费模型，以及可靠性与精确一次语义的工程保障。
type: docs
icon: fa-solid fa-envelope
cascade:
  type: docs
---

Kafka 是高吞吐、可持久化的分布式消息系统，支撑日志管道、事件溯源与异步解耦。本小节解析其分区存储、消费位移模型，以及可靠性相关的关键配置。

## 文章

- [存储与消费模型](/tech/kafka/storage-consumer) — topic/partition 物理结构、offset、consumer group 与 rebalance、拉取模型。
- [可靠性与精确一次](/tech/kafka/reliability) — acks 与重试、幂等 producer、事务、消费端幂等与分区顺序性。
