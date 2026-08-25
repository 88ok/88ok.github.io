---
title: ZooKeeper 数据模型与 ZAB 协议
description: znode 类型与版本、session 与 Watcher、ZAB 的崩溃恢复选主与消息广播，以及 zxid 顺序性。
date: 2026-08-25
tags: [ZooKeeper, ZAB, 分布式协调]
weight: 10
---

ZooKeeper 的可靠性来源于其简洁的数据模型与强一致的 ZAB 协议。理解二者是正确使用 ZK 的前提。

## 数据模型 znode

ZK 维护一棵类似文件系统的层级树，每个节点称为 **znode**，可同时承载数据与子节点。其类型决定了生命周期与并发语义：

- **持久节点 / 临时节点**：临时节点随 session 断开自动删除，是分布式锁、选主的基础。
- **普通节点 / 顺序节点**：顺序节点创建时自动追加单调递增序号。
- 每个 znode 带有 `version`、`cversion`、`aversion`，修改时版本自增，提供乐观锁语义。

## Session 与 Watcher

客户端与服务器建立 **session**，通过心跳保活，session 超时则服务器清理其临时节点。客户端可对节点注册 **Watcher**，节点发生变化（数据写、子节点变）时收到一次性通知，需重新注册才能继续监听。

## ZAB 协议

ZAB（ZooKeeper Atomic Broadcast）是为 ZK 设计的崩溃恢复原子广播协议，保证所有事务以相同顺序被所有副本应用。

### 崩溃恢复与选主

集群启动时或 Leader 宕机进入恢复阶段：选举产生新 Leader，并让各 Follower 补齐到与 Leader 相同的状态。选主依赖 `zxid`（事务 id）与 `myid`，zxid 越大代表数据越新，优先当选。

### 消息广播

正常阶段采用类似 2PC 的广播：Leader 为每个写请求分配递增 `zxid` 并发起提议，Follower 写本地日志后 ACK，Leader 收到多数派 ACK 即提交并通知应用。

```text
Client -> Leader: write request
Leader: assign zxid, broadcast PROPOSAL
Follower: append log, reply ACK
Leader: commit once quorum ACKed, notify followers
```

zxid 为 64 位：`高 32 位 epoch + 低 32 位 counter`，保证跨 Leader 任期仍然全局有序，从而避免旧 Leader 的提案被新 Leader 误提交。
