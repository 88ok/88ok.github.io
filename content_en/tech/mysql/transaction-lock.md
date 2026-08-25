---
title: Transactions and Locking
description: ACID and isolation levels, MVCC with undo/redo logs, row locks, gap locks and Next-Key Locks, plus deadlock causes and troubleshooting.
date: 2026-08-25
tags: [MySQL, Transaction, Lock]
weight: 20
---

Under concurrency, transactions and locks together guarantee data consistency. InnoDB balances performance and isolation through the coordination of MVCC and locking.

## ACID and Isolation Levels

A transaction's ACID is guaranteed by different mechanisms: atomicity by undo log, durability by redo log, isolation by MVCC and locks, and consistency is the ultimate goal.

The SQL standard defines four isolation levels; InnoDB defaults to `REPEATABLE READ`:

- READ UNCOMMITTED: possible dirty reads
- READ COMMITTED: avoids dirty reads, possible non-repeatable reads
- REPEATABLE READ: avoids non-repeatable reads (InnoDB additionally avoids phantom reads)
- SERIALIZABLE: fully serial, lowest performance

## MVCC and Logs

MVCC (Multi-Version Concurrency Control) lets reads avoid locks and reads/writes not block each other. Each row implicitly carries `trx_id` and `roll_pointer`, builds historical versions via undo log, and uses a ReadView to decide whether a version is visible to the current transaction.

- **undo log**: records the pre-modification image, used for rollback and building old versions.
- **redo log**: records physical page modifications, ensuring committed transactions survive crashes (WAL).

## Row Locks, Gap Locks and Next-Key Locks

InnoDB uses row locks by default, but "the lock is on the index record" rather than the row itself. Under `REPEATABLE READ`, to solve phantom reads it introduces:

- **Record Lock**: locks a specific index record.
- **Gap Lock**: locks the gap between index records, preventing inserts.
- **Next-Key Lock**: record lock + gap lock, locking a left-open right-closed interval.

```sql
-- Places a Next-Key Lock on the (10, 20] interval, blocking other txns from inserting id=15
SELECT * FROM t WHERE id BETWEEN 10 AND 20 FOR UPDATE;
```

## Deadlock Causes and Troubleshooting

Deadlocks are usually caused by two transactions acquiring locks in the opposite order. Troubleshooting:

1. Inspect `LATEST DETECTED DEADLOCK` in `SHOW ENGINE INNODB STATUS`.
2. Unify the lock acquisition order across the business and shorten the time locks are held.
3. Reduce transaction granularity and avoid large transactions; if needed, lower the isolation level to READ COMMITTED to reduce gap locks.
