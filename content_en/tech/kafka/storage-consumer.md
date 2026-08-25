---
title: Kafka Storage and Consumption Model
description: topic/partition physical structure, offset and consumption position, consumer groups and rebalance, the pull model.
date: 2026-08-25
tags: [Kafka, Message Queue, Consumption Model]
weight: 10
---

Kafka's high performance relies on "partitioned log + sequential writes + batched pulls". Understanding the storage and consumption model is essential to configure parallelism correctly and avoid duplicate consumption.

## Topics and Partitions

- A **topic** is a logical subject; a **partition** is the physical unit of parallelism, and messages are only appended to the end of a partition.
- Each partition is an ordered, immutable log composed of multiple segment files, maintaining an offset (unique and monotonically increasing within the partition).
- The partition count determines the upper bound of consumption parallelism: at any moment a partition is consumed by exactly one consumer within a group.

## Offset and Consumption Position

The position a consumer commits after processing messages is the **offset**, which Kafka stores in the internal topic `__consumer_offsets`:

```text
Producer -> [partition-0: 0,1,2,3 ...]
                ^
                | committed offset (group A)
Consumer group A continues pulling from offset=4
```

The commit method affects reliability:

- **Auto commit**: commits at intervals; may lose (committed then crashed before processing) or duplicate (crashed mid-processing, not committed).
- **Manual commit**: commit only after successful processing; combined with idempotency achieves at-least-once / exactly-once.

## Consumer Groups and Rebalance

Consumers within the same group share all partitions of a topic, with partitions evenly assigned among members. When a member joins or leaves, a **rebalance** triggers and reassigns partitions. Frequent rebalances pause consumption, so tune `session.timeout` and `heartbeat.interval` and avoid long consumption times.

## The Pull Model

Kafka uses a **pull model**: consumers actively pull in batches, enabling backpressure based on their own rate, which is more controllable than broker push. Long polling (`fetch.min.bytes` / `fetch.max.wait`) balances throughput and latency.
