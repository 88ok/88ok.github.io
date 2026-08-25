---
title: Redis 数据结构与底层实现
description: SDS、ziplist、linkedlist、skiplist、dict，以及 string/list/hash/set/zset 的底层编码与转换阈值。
date: 2026-08-25
tags: [Redis, 数据结构, 底层实现]
weight: 10
---

Redis 对外暴露五种常用类型，但底层有多种编码（encoding）。根据数据规模自动在不同编码间转换，是它兼顾内存与性能的关键。

## 核心底层结构

- **SDS（简单动态字符串）**：相比 C 字符串记录长度、预分配空间，避免缓冲区溢出并支持二进制安全。
- **ziplist / listpack**：连续内存的紧凑列表，节省空间，适合小数据量。
- **linkedlist**：双向链表，元素多时替代 ziplist。
- **dict（字典）**：哈希表，使用链地址法解决冲突，渐进式 rehash 避免阻塞。
- **skiplist（跳表）**：多层有序链表，结合 dict 实现 zset，范围查询高效。

## 各类型的编码与转换

| 类型 | 小数据编码 | 大数据编码 | 转换阈值（示意） |
| --- | --- | --- | --- |
| string | int / embstr | raw | 长度 > 44 字节转 raw |
| hash | ziplist/listpack | hashtable | 元素数或单个值超阈值 |
| list | quicklist（ziplist 片段） | quicklist | — |
| set | intset | hashtable | 含非整数或元素过多 |
| zset | ziplist | skiplist+dict | 元素数或值长度超阈值 |

以 `zset` 为例，小数据使用 ziplist 紧凑存储（member 与 score 相邻），当元素数量或单个 member 长度超过阈值时转为 `skiplist + dict`，保证有序遍历与按 member 查找都为 O(1)/O(log n)。

```text
zset 小: [member1, score1, member2, score2, ...]   (ziplist)
zset 大: dict(member->score) + skiplist(score->member)
```

理解这些阈值有助于解释「为什么小哈希比单独 key 省内存」，也提醒我们避免让单个 key 堆积过多元素，否则编码升级或操作耗时都会陡增。
