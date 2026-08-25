---
title: Distributed Coordination in Practice
description: Leader election, configuration centers and distributed locks on ZK, the herd effect and ephemeral-sequential-node pitfalls, and trade-offs versus etcd.
date: 2026-08-25
tags: [ZooKeeper, Distributed Lock, Leader Election]
weight: 20
---

ZooKeeper offers primitive-level coordination; almost every distributed coordination need can be built from the combination of "ephemeral node + sequential node + Watcher".

## Leader Election

Each candidate creates an ephemeral sequential node under `/election`; the one with the smallest sequence becomes Master. Non-smallest nodes watch their predecessor; when the predecessor disappears they re-evaluate whether they are now smallest, achieving automatic failover:

```text
/election
  ├── /n_0000000001  (master)
  ├── /n_0000000002  (watches 001)
  └── /n_0000000003  (watches 002)
```

## Configuration Center

Write configuration into a persistent node; clients read it and register a Watcher. On configuration change the client receives a notification and hot-reloads without restarting the app. Keep config nodes small to avoid oversized single pushes.

## Distributed Locks

Fair exclusive locks are built on "ephemeral sequential node + watch predecessor", which is more robust than a naive `create`-to-grab-lock and avoids the thundering herd.

### The Herd Effect

If all clients watch the same lock node, they are all woken simultaneously on release and contend at once, producing many useless requests. The correct approach is to **watch only the immediately preceding (smaller) node**, forming a chain of wakeups that reduces O(N) notifications to O(1).

### Pitfalls of Ephemeral Nodes

- A client GC pause or network jitter may cause a session timeout, the ephemeral node is wrongly deleted and the lock is released early. Use sensible `sessionTimeout` and heartbeats.
- After the lock holder crashes the lock is auto-released but the work is uncommitted, so operations must be idempotent.

## Trade-offs Versus etcd

etcd is based on Raft, offering stronger consistency, leases and incremental Watch pushes, with a simpler API and is the mainstream choice in cloud-native scenarios (Kubernetes). ZK has a mature ecosystem and rich clients but has performance bottlenecks under very large Watch scales. New projects may prefer etcd, while existing Dubbo/Hadoop stacks still commonly use ZK.
