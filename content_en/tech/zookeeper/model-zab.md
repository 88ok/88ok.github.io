---
title: ZooKeeper Data Model and the ZAB Protocol
description: znode types and versions, session and Watcher, ZAB crash-recovery leader election and message broadcast, and zxid ordering.
date: 2026-08-25
tags: [ZooKeeper, ZAB, Coordination]
weight: 10
---

ZooKeeper's reliability comes from its simple data model and the strongly-consistent ZAB protocol. Understanding both is a prerequisite for using ZK correctly.

## The znode Data Model

ZK maintains a hierarchical tree similar to a file system; each node is a **znode** that can hold both data and children. Its type determines lifecycle and concurrency semantics:

- **Persistent / Ephemeral**: ephemeral nodes are auto-deleted when the session disconnects, forming the basis of distributed locks and leader election.
- **Plain / Sequential**: sequential nodes get a monotonically increasing sequence number appended on creation.
- Each znode carries `version`, `cversion`, `aversion`; versions increment on modification, providing optimistic-lock semantics.

## Session and Watcher

A client establishes a **session** with the server, kept alive via heartbeats. On session timeout the server cleans up its ephemeral nodes. A client can register a **Watcher** on a node and receives a one-time notification when the node changes (data write, children change); it must re-register to keep watching.

## The ZAB Protocol

ZAB (ZooKeeper Atomic Broadcast) is a crash-recovery atomic broadcast protocol designed for ZK, guaranteeing all transactions are applied by every replica in the same order.

### Crash Recovery and Leader Election

When the cluster starts or the Leader crashes it enters recovery: a new Leader is elected and Followers catch up to the Leader's state. Election depends on `zxid` (transaction id) and `myid`; the larger zxid (newer data) wins priority.

### Message Broadcast

In normal operation it uses a 2PC-like broadcast: the Leader assigns an increasing `zxid` to each write and proposes it; Followers append to their local log and ACK; once the Leader receives a quorum of ACKs it commits and notifies.

```text
Client -> Leader: write request
Leader: assign zxid, broadcast PROPOSAL
Follower: append log, reply ACK
Leader: commit once quorum ACKed, notify followers
```

zxid is 64 bits: `high 32 bits epoch + low 32 bits counter`, guaranteeing global ordering across Leader tenures and preventing an old Leader's proposals from being wrongly committed by a new Leader.
