---
title: Redis
description: 高性能内存数据结构存储，聚焦底层数据结构实现与缓存设计中的典型问题与应对。
type: docs
icon: fa-solid fa-bolt
cascade:
  type: docs
---

Redis 以丰富的数据结构与极高的吞吐著称，既可作为缓存，也可承担计数器、排行榜、消息队列等角色。本小节从底层编码与缓存设计两个维度拆解其工程要点。

## 文章

- [数据结构与底层实现](/tech/redis/data-structures) — SDS、ziplist、skiplist、dict，以及各类型的编码与转换阈值。
- [缓存设计](/tech/redis/cache-design) — 穿透/击穿/雪崩、Cache-Aside、大 key 热 key 与淘汰策略。
