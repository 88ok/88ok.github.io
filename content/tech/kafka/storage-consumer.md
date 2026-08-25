---
title: Kafka 存储与消费模型
description: topic/partition 物理结构、offset 与消费位移、consumer group 与 rebalance、拉取模型。
date: 2026-08-25
tags: [Kafka, 消息队列, 消费模型]
weight: 10
---

Kafka 的高性能依赖于「分区日志 + 顺序写 + 批量拉取」的设计。理解存储与消费模型，才能合理配置并行度与避免重复消费。

## Topic 与 Partition

- **topic** 是逻辑主题，**partition** 是物理并行单位，消息只追加写入分区末尾。
- 每个分区是一个有序、不可变的日志，由多个 segment 文件组成，并维护 offset（分区内唯一递增）。
- 分区数决定了消费的并行上限：一个分区同一时刻只被 group 内一个消费者消费。

## Offset 与消费位移

消费者处理完消息后提交的位移称为 **offset**，Kafka 将其保存在内部 topic `__consumer_offsets` 中：

```text
Producer -> [partition-0: 0,1,2,3 ...]
                ^
                | committed offset (group A)
Consumer group A 从 offset=4 继续拉取
```

位移提交方式影响可靠性：

- **自动提交**：间隔提交，可能丢失（提交后未处理崩溃）或重复（处理中崩溃未提交）。
- **手动提交**：处理成功后再提交，配合幂等可实现至少一次/精确一次。

## Consumer Group 与 Rebalance

同一 group 内的消费者共同消费 topic 的全部分区，分区在成员间均衡分配。当成员加入/退出时触发 **rebalance**，重新分配分区。频繁 rebalance 会暂停消费，应控制 `session.timeout` 与 `heartbeat.interval` 并避免消费耗时过长。

## 拉取模型

Kafka 采用 **pull 模型**：消费者主动批量拉取，可依据自身速率背压，比 broker 推送更可控。长轮询（`fetch.min.bytes` / `fetch.max.wait`）在吞吐与延迟间取得平衡。
