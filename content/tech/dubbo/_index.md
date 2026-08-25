---
title: Dubbo
description: 阿里巴巴开源的微服务 RPC 框架，关注服务注册发现、集群容错与可扩展架构。
type: docs
icon: fa-solid fa-cube
cascade:
  type: docs
---

Dubbo 是阿里巴巴开源的高性能 Java RPC 框架，采用分层架构将服务定义、注册发现、集群容错与网络传输解耦。它通过 SPI 机制提供极强的可扩展性，被广泛应用于国内微服务治理体系。本小节聚焦 Dubbo 的核心架构设计以及服务注册与发现的落地实践。

## 文章

- [Dubbo 总体架构与核心概念](/tech/dubbo/architecture) — 分层设计、Invoker 抽象、SPI 扩展与一次同步调用的完整链路。
- [服务注册与发现实战](/tech/dubbo/registry-discovery) — 以 ZooKeeper/Nacos 为注册中心，配置、健康检查与不停机发布。
