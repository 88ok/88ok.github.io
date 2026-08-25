---
title: Kafka Reliability and Exactly-Once
description: producer acks and retries, idempotent producer and transactions, consumer-side duplicates and idempotency, and partition ordering guarantees.
date: 2026-08-25
tags: [Kafka, Reliability, Exactly-Once]
weight: 20
---

Kafka's reliability requires coordinated configuration across the producer, broker and consumer. We cover it through three goals: no loss, no duplication, ordered.

## Producer-Side Reliability

Control write durability level via `acks`:

- `acks=0`: considered successful as soon as sent; may lose messages; highest throughput.
- `acks=1`: success once the leader writes; may lose if the leader crashes.
- `acks=all`: success only after all ISR replicas sync; safest, combined with `min.insync.replicas` to avoid single points.

Enabling retries (`retries`) handles transient failures but introduces **duplicates**: network jitter causes the producer to retry without receiving the ack, writing the same message twice.

## Idempotent Producer and Transactions

Kafka provides an **idempotent producer** (`enable.idempotence=true`); the broker de-duplicates using `producerId + sequence number`, guaranteeing no duplicates or loss within a single partition. For atomic writes across partitions or systems, use **transactions** (`transactional.id`) to wrap multiple produces and offset commits into one transaction:

```java
producer.initTransactions();
producer.beginTransaction();
producer.send(record1);
producer.send(record2);
producer.commitTransaction(); // either all succeed or none are visible
```

## Consumer-Side Deduplication and Idempotency

Even with an idempotent producer, the consumer may still consume duplicates on rebalance or poor offset-commit timing. The consumer side should guarantee **business idempotency**:

- Use a unique key (order id, etc.) for a deduplication table / unique index.
- Put "processing + offset commit" in the same transaction (e.g. consume and write to DB while recording the offset).

## Partition Ordering

Kafka only guarantees ordering **within a single partition**. Global ordering requires a single partition (sacrificing parallelism); business ordering requires partitioning by key (e.g. user id) so the same key lands on the same partition, preserving order along that key dimension. Exactly-once (EOS) is precisely the combination of idempotency + transactions + consumer idempotency.
