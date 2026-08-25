---
title: Dubbo 总体架构与核心概念
description: 从 Invoker、SPI 到 Registry、Cluster、Protocol 与 Filter 链，梳理 Dubbo 的分层设计。
date: 2026-08-25
tags: [Dubbo, 微服务, RPC]
weight: 10
---

Dubbo 的核心竞争力在于清晰的职责分层与高度可插拔的扩展机制。理解分层与 Invoker 抽象，是读懂 Dubbo 源码与排查线上问题的基础。

## 分层架构

Dubbo 自顶向下可分为若干逻辑层，每一层只依赖其下层的接口而非实现：

- **service / config 层**：面向用户的 API 与配置层，`@DubboService`、`@DubboReference` 以及 `ReferenceConfig`、`ServiceConfig` 在此落地。
- **proxy 层**：生成服务接口的动态代理，让远程调用对业务代码透明。
- **registry 层**：封装服务注册与订阅，感知 provider/consumer 的上线下线。
- **cluster 层**：将多个 Invoker 封装为「集群 Invoker」，负责负载均衡、容错与路由。
- **protocol 层**：封装 RPC 调用，是 Invoker 暴露与引用的核心。
- **filter 链**：贯穿调用的拦截器，可用于日志、鉴权、限流等横切逻辑。

## Invoker 与 SPI

`Invoker` 是 Dubbo 的通用领域模型，代表「一个可执行且可描述的调用」，抽象了本地、远程、集群等不同类型的调用。`URL` 则作为贯穿各层的配置总线，几乎所有扩展点都通过 URL 传递参数。

Dubbo 的扩展机制基于改进版的 JDK SPI，通过 `@SPI` 注解声明扩展接口，`@Adaptive` 生成自适应实现，`META-INF/dubbo/` 下以接口全限定名命名的文件登记实现类：

```java
@SPI("dubbo")
public interface Protocol {
    @Adaptive
    <T> Exporter<T> export(Invoker<T> invoker) throws RpcException;
    @Adaptive
    <T> Invoker<T> refer(Class<T> type, URL url) throws RpcException;
}
```

## 一次同步调用的链路

当 consumer 发起一次同步调用时，请求大致经历以下步骤：

1. 业务代码调用动态代理生成的接口方法。
2. 经过 consumer 侧 Filter 链（如 ConsumerContextFilter）。
3. ClusterInvoker 依据负载均衡策略选择一个可用的 provider Invoker。
4. Protocol 将请求序列化并通过网络发送。
5. provider 侧经 Filter 链后交给真正的实现类执行。
6. 结果原路返回，consumer 反序列化并拿到返回值。

这种「分层 + 接口 + URL 总线」的设计，使 Dubbo 在保持高性能的同时，仍能灵活替换注册中心、序列化协议与集群策略。
