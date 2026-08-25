---
title: Kafka 可靠性与精确一次
description: producer acks 与重试、幂等 producer 与事务、消费端重复与幂等处理，以及分区顺序性保证。
date: 2026-08-25
tags: [Kafka, 可靠性, 精确一次]
weight: 20
---

Kafka 的可靠性需要在 producer、broker、consumer 三端协同配置。下面从「不丢、不重、有序」三个目标展开。

## Producer 端的可靠性

通过 `acks` 控制写入持久化级别：

- `acks=0`：发完即认为成功，可能丢消息，吞吐最高。
- `acks=1`：leader 写入即成功，leader 宕机可能丢。
- `acks=all`：ISR 全部同步才成功，最安全，配合 `min.insync.replicas` 防单点。

开启重试（`retries`）可应对瞬时失败，但会带来**重复**：网络抖动导致 producer 未收到 ack 而重试，同一条消息被写两次。

## 幂等 Producer 与事务

Kafka 提供 **幂等 producer**（`enable.idempotence=true`），broker 用 `producerId + 序列号` 去重，保证单分区内不重不漏。需要跨分区、跨系统的原子写入时，使用**事务**（`transactional.id`）将多次 produce 与 offset 提交纳入一个事务：

```java
producer.initTransactions();
producer.beginTransaction();
producer.send(record1);
producer.send(record2);
producer.commitTransaction(); // 要么都成功，要么都不可见
```

## 消费端去重与幂等

即使 producer 幂等，consumer 在 rebalance 或位移提交时机不当时仍可能重复消费。消费端应保证**业务幂等**：

- 用唯一键（订单号等）做去重表/唯一索引。
- 将「处理 + 提交位移」放在同一事务（如消费写 DB 同时记录 offset）。

## 分区顺序性

Kafka 只保证**单分区内有序**。需要全局顺序只能单分区（牺牲并行）；需要业务顺序则按 key（如用户 id）分区，使同一 key 落到同一分区，从而在该 key 维度保持顺序。精确一次（EOS）正是幂等 + 事务 + 消费幂等三者叠加的结果。
