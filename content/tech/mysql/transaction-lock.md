---
title: MySQL 事务与锁机制
description: ACID 与隔离级别、MVCC 与 undo/redo log、行锁与间隙锁、Next-Key Lock，以及死锁成因与排查思路。
date: 2026-08-25
tags: [MySQL, 事务, 锁]
weight: 20
---

并发场景下，事务与锁共同保证了数据的一致性。InnoDB 通过 MVCC 与锁的协同，在性能与隔离性之间取得平衡。

## ACID 与隔离级别

事务的 ACID 由不同机制保障：原子性靠 undo log，持久性靠 redo log，隔离性靠 MVCC 与锁，一致性是最终目标。

SQL 标准定义四种隔离级别，InnoDB 默认 `REPEATABLE READ`：

- READ UNCOMMITTED：可能脏读
- READ COMMITTED：避免脏读，可能不可重复读
- REPEATABLE READ：避免不可重复读（InnoDB 额外避免幻读）
- SERIALIZABLE：完全串行，性能最低

## MVCC 与日志

MVCC（多版本并发控制）让读不加锁、读写不阻塞。每行记录隐含 `trx_id` 与 `roll_pointer`，通过 undo log 构建历史版本，配合 ReadView 判断某版本对当前事务是否可见。

- **undo log**：记录数据修改前的镜像，用于回滚与构建旧版本。
- **redo log**：记录物理页修改，保证崩溃后已提交事务不丢失（WAL 机制）。

## 行锁、间隙锁与 Next-Key Lock

InnoDB 默认使用行锁，但「锁的是索引记录」而非行本身。在 `REPEATABLE READ` 下，为解决幻读引入：

- **行锁（Record Lock）**：锁住具体索引记录。
- **间隙锁（Gap Lock）**：锁住索引记录之间的间隙，阻止插入。
- **Next-Key Lock**：行锁 + 间隙锁，锁定左开右闭的区间。

```sql
-- 在 (10, 20] 区间加 Next-Key Lock，阻止其他事务插入 id=15
SELECT * FROM t WHERE id BETWEEN 10 AND 20 FOR UPDATE;
```

## 死锁成因与排查

死锁通常由两个事务以相反顺序获取锁引起。排查手段：

1. 查看 `SHOW ENGINE INNODB STATUS` 中的 `LATEST DETECTED DEADLOCK`。
2. 统一业务加锁顺序，缩短事务持有锁的时间。
3. 降低事务粒度，避免大事务；必要时降低隔离级别到 READ COMMITTED 减少间隙锁。
