---
title: Redis Cache Design
description: Causes and mitigations of cache penetration, breakdown and avalanche, Cache-Aside and consistency, big keys, hot keys, and expiration/eviction policies.
date: 2026-08-25
tags: [Redis, Cache, High Availability]
weight: 20
---

Introducing a cache dramatically reduces database pressure, but poor design introduces the classic problems of penetration, breakdown and avalanche. We break down the causes and countermeasures below.

## The Three Classic Problems

- **Cache penetration**: querying data that does not exist, so neither cache nor DB returns it and every request hits the DB. Mitigate with caching empty values (short TTL) or a Bloom filter to block illegal keys.
- **Cache breakdown**: the moment a hot key expires, many concurrent requests all fall back to the DB at once. Mitigate with a mutex (only one thread rebuilds), logical expiration (async refresh), or never-expire hot keys.
- **Cache avalanche**: a large number of keys expire simultaneously, or Redis becomes entirely unavailable, overwhelming the DB. Mitigate with random jitter on expiration times, multi-level caching, and Redis high availability (Sentinel/Cluster).

## Cache-Aside and Consistency

The most common pattern is **Cache-Aside (旁路缓存)**:

```text
Read:  read cache -> hit returns; miss reads DB -> write cache
Write: update DB first -> then delete cache (not update cache)
```

"Update DB then delete cache" reduces the chance of reading stale values under concurrency. Extreme inconsistency can be compensated via delayed double-deletion or subscribing to binlog (e.g. Canal). Note: do not blindly "update the cache", as concurrent writes may produce dirty data.

## Big Keys and Hot Keys

- **Big key**: e.g. a hash/list with millions of elements; deletion or serialization blocks the main thread. Mitigate by splitting, deleting in batches (`unlink`), and periodic cleanup.
- **Hot key**: a single key accessed extremely frequently becomes a single-node bottleneck. Mitigate with local cache replicas, scattering the key across multiple replicas, or Redis cluster sharding.

## Expiration and Eviction Policies

Redis provides active + lazy expiration deletion, and when memory is insufficient it evicts per `maxmemory-policy`:

- `allkeys-lru` / `volatile-lru`: least recently used
- `allkeys-lfu` / `volatile-lfu`: least frequently used
- `volatile-ttl`: evict those expiring soonest
- `noeviction`: do not evict, writes error (default)

Cache scenarios usually choose `allkeys-lru` or `allkeys-lfu`, and set a reasonable TTL for critical data, combined with jitter to avoid avalanches.
