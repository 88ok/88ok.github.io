---
title: MySQL
description: A relational database, focused on the internals of indexing, transactions and locking that underpin performance and correctness.
type: docs
icon: fa-solid fa-database
cascade:
  type: docs
---

MySQL is one of the most widely used relational databases. Its InnoDB storage engine is known for its B+Tree indexes, MVCC and row-level locking. This subsection decomposes the internals behind performance tuning and correctness from two angles: index structure, and transactions and locks.

## Articles

- [MySQL Indexing Internals and Best Practices](/en/tech/mysql/indexing) — B+Tree, back-to-index lookups and covering indexes, the leftmost prefix rule and avoiding index invalidation.
- [Transactions and Locking](/en/tech/mysql/transaction-lock) — ACID, isolation levels, MVCC, row locks, gap locks and deadlock troubleshooting.
