---
title: MySQL Indexing Internals and Best Practices
description: B+Tree structure, back-to-index lookups and covering indexes, the leftmost prefix rule, index selectivity and common anti-patterns that invalidate indexes.
date: 2026-08-25
tags: [MySQL, Index, Performance]
weight: 10
---

Indexes are the decisive factor for MySQL query performance. Understanding InnoDB's B+Tree index structure is the only way to write SQL that truly hits indexes.

## B+Tree and the Clustered Index

InnoDB organizes indexes with a B+Tree whose non-leaf nodes only store index keys for navigation, while all data lives in leaf nodes that are linked in a doubly-linked list, which is ideal for range scans.

InnoDB's primary key index is the **clustered index**, whose leaf nodes store the whole row. A secondary index's leaf nodes store "index key + primary key value". Therefore querying a non-index column through a secondary index requires a second lookup into the clustered index using the primary key.

## Back-to-Index and Covering Indexes

When all queried columns are within a secondary index, no second lookup is needed; this is a **covering index** and performs better:

```sql
-- idx_user_age is a composite index on (name, age)
-- only index columns are selected, hitting the covering index
SELECT name, age FROM user WHERE name = 'tom';
```

If `SELECT *` also needs `phone` and other extra columns, a back-to-index lookup is triggered. High-frequency queries should be designed as covering indexes where possible.

## The Leftmost Prefix Rule

A composite index `(a, b, c)` is usable only when the query matches continuously starting from the leftmost column:

- `WHERE a = ?` is usable
- `WHERE a = ? AND b = ?` is usable
- `WHERE b = ?` cannot use this composite index (breaks the leftmost prefix)

## Avoiding Index Invalidation

Common patterns that invalidate indexes:

- Applying functions or implicit type casts to index columns: `WHERE DATE(create_time) = ...`
- Leading fuzzy matches: `LIKE '%abc'`
- Using `OR` to combine a non-indexed column
- When the optimizer decides a full table scan is faster and drops the index

More indexes are not always better: each index slows writes and consumes space. Build indexes on high-**selectivity** columns and verify with `EXPLAIN`.
