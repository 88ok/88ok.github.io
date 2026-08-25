---
title: MySQL
description: 关系型数据库，聚焦索引原理、事务与锁机制等高性能与高可用的底层基础。
type: docs
icon: fa-solid fa-database
cascade:
  type: docs
---

MySQL 是最常用的关系型数据库之一，其 InnoDB 存储引擎以 B+Tree 索引、MVCC 与行级锁著称。本小节从索引结构与事务锁两个角度，拆解性能调优与正确性的底层逻辑。

## 文章

- [MySQL 索引原理与最佳实践](/tech/mysql/indexing) — B+Tree、回表与覆盖索引、最左前缀与避免索引失效。
- [事务与锁机制](/tech/mysql/transaction-lock) — ACID、隔离级别、MVCC 与行锁、间隙锁、死锁排查。
