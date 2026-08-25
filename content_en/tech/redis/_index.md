---
title: Redis
description: A high-performance in-memory data structure store, focused on underlying data structure implementations and typical problems and solutions in cache design.
type: docs
icon: fa-solid fa-bolt
cascade:
  type: docs
---

Redis is known for its rich data structures and very high throughput; it can serve as a cache and also as a counter, leaderboard or message queue. This subsection decomposes its engineering essentials from two dimensions: underlying encoding and cache design.

## Articles

- [Data Structures and Underlying Implementation](/en/tech/redis/data-structures) — SDS, ziplist, skiplist, dict, and the encodings and conversion thresholds of each type.
- [Cache Design](/en/tech/redis/cache-design) — Penetration, breakdown, avalanche, Cache-Aside, big keys, hot keys and eviction policies.
