---
title: Redis Data Structures and Underlying Implementation
description: SDS, ziplist, linkedlist, skiplist and dict, plus the underlying encodings and conversion thresholds of string/list/hash/set/zset.
date: 2026-08-25
tags: [Redis, Data Structure, Internals]
weight: 10
---

Redis exposes five common types to users, but underneath there are multiple encodings (encoding). Automatically switching encodings based on data size is the key to balancing memory and performance.

## Core Underlying Structures

- **SDS (Simple Dynamic String)**: records length and pre-allocates space compared to C strings, avoiding buffer overflow and supporting binary safety.
- **ziplist / listpack**: compact contiguous-memory lists that save space and suit small data volumes.
- **linkedlist**: a doubly-linked list that replaces ziplist when there are many elements.
- **dict (dictionary)**: a hash table using chaining for collisions, with progressive rehash to avoid blocking.
- **skiplist (skip list)**: a multi-level ordered linked list, combined with dict to implement zset for efficient range queries.

## Encodings and Conversions per Type

| Type | Small-data encoding | Large-data encoding | Conversion threshold (illustrative) |
| --- | --- | --- | --- |
| string | int / embstr | raw | length > 44 bytes becomes raw |
| hash | ziplist/listpack | hashtable | element count or single value exceeds threshold |
| list | quicklist (ziplist segments) | quicklist | — |
| set | intset | hashtable | contains non-integers or too many elements |
| zset | ziplist | skiplist+dict | element count or value length exceeds threshold |

Taking `zset` as an example, small data uses a compact ziplist (member and score adjacent); when the element count or a single member length exceeds the threshold it converts to `skiplist + dict`, ensuring ordered traversal and member lookup are O(1)/O(log n).

```text
zset small: [member1, score1, member2, score2, ...]   (ziplist)
zset large: dict(member->score) + skiplist(score->member)
```

Understanding these thresholds explains "why a small hash saves more memory than separate keys", and reminds us to avoid piling too many elements into a single key, otherwise encoding upgrades or operation latency will spike.
