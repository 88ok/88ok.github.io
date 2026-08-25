---
title: Kafka
description: A distributed messaging engine, focused on the storage/consumption model and the engineering guarantees of reliability and exactly-once semantics.
type: docs
icon: fa-solid fa-envelope
cascade:
  type: docs
---

Kafka is a high-throughput, durable distributed messaging system that backs log pipelines, event sourcing and async decoupling. This subsection explains its partitioned storage, consumption-offset model, and the key configurations behind reliability.

## Articles

- [Storage and Consumption Model](/en/tech/kafka/storage-consumer) — topic/partition physical structure, offset, consumer groups and rebalance, the pull model.
- [Reliability and Exactly-Once](/en/tech/kafka/reliability) — acks and retries, idempotent producer, transactions, consumer idempotency and partition ordering.
