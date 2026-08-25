---
title: ZooKeeper
description: 分布式协调服务，聚焦 ZAB 协议、数据模型与基于 ZK 的选主、配置中心与分布式锁实战。
type: docs
icon: fa-solid fa-sitemap
cascade:
  type: docs
---

ZooKeeper 是经典的分布式协调服务，以有序、高可用的 ZAB 协议与树形数据模型，支撑选主、配置管理与分布式锁等关键能力。本小节讲解其内部协议与常见协调模式。

## 文章

- [数据模型与 ZAB 协议](/tech/zookeeper/model-zab) — znode、session、Watcher，以及 ZAB 的选主与消息广播。
- [分布式协调实战](/tech/zookeeper/coordination) — 基于 ZK 实现选主、配置中心、分布式锁及羊群效应等坑。
