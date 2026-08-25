---
title: ZooKeeper
description: A distributed coordination service, focused on the ZAB protocol, the data model, and ZK-based leader election, configuration centers and distributed locks.
type: docs
icon: fa-solid fa-sitemap
cascade:
  type: docs
---

ZooKeeper is a classic distributed coordination service. With its ordered, highly-available ZAB protocol and tree-shaped data model, it underpins leader election, configuration management and distributed locks. This subsection explains its internal protocol and common coordination patterns.

## Articles

- [Data Model and the ZAB Protocol](/en/tech/zookeeper/model-zab) — znodes, sessions, Watchers, and ZAB leader election and message broadcast.
- [Distributed Coordination in Practice](/en/tech/zookeeper/coordination) — Leader election, config centers, distributed locks on ZK, the herd effect and other pitfalls.
