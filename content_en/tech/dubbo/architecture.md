---
title: Dubbo Architecture and Core Concepts
description: From Invoker and SPI to Registry, Cluster, Protocol and the Filter chain, an overview of Dubbo's layered design.
date: 2026-08-25
tags: [Dubbo, Microservices, RPC]
weight: 10
---

Dubbo's core strength lies in its clear separation of responsibilities and its highly pluggable extension mechanism. Understanding the layering and the Invoker abstraction is the foundation for reading Dubbo's source code and troubleshooting production issues.

## Layered Architecture

From top to bottom Dubbo is divided into logical layers, each depending only on the interface (not the implementation) of the layer below:

- **service / config layer**: the user-facing API and configuration layer, where `@DubboService`, `@DubboReference`, `ReferenceConfig` and `ServiceConfig` live.
- **proxy layer**: generates dynamic proxies for service interfaces so remote calls are transparent to business code.
- **registry layer**: encapsulates service registration and subscription, sensing provider/consumer up and down events.
- **cluster layer**: wraps multiple Invokers into a "cluster Invoker", responsible for load balancing, fault tolerance and routing.
- **protocol layer**: encapsulates the RPC call; the core of Invoker export and reference.
- **filter chain**: interceptors across the call path, usable for logging, auth, rate limiting and other cross-cutting concerns.

## Invoker and SPI

`Invoker` is Dubbo's universal domain model, representing "an executable and describable call", abstracting local, remote and cluster invocations. `URL` acts as the configuration bus running through every layer; almost every extension point passes parameters via URL.

Dubbo's extension mechanism improves on the JDK SPI: the `@SPI` annotation declares the extension interface, `@Adaptive` generates an adaptive implementation, and files named after the fully-qualified interface name under `META-INF/dubbo/` register the implementations:

```java
@SPI("dubbo")
public interface Protocol {
    @Adaptive
    <T> Exporter<T> export(Invoker<T> invoker) throws RpcException;
    @Adaptive
    <T> Invoker<T> refer(Class<T> type, URL url) throws RpcException;
}
```

## The Path of a Synchronous Call

When a consumer issues a synchronous call, the request roughly goes through the following steps:

1. Business code calls the method on the dynamically generated proxy.
2. It passes through the consumer-side Filter chain (e.g. `ConsumerContextFilter`).
3. The `ClusterInvoker` selects an available provider Invoker according to the load-balancing strategy.
4. The `Protocol` serializes the request and sends it over the network.
5. On the provider side, after the Filter chain, the call is handed to the real implementation.
6. The result returns along the same path; the consumer deserializes and obtains the return value.

This "layering + interface + URL bus" design lets Dubbo stay high-performance while flexibly swapping the registry, serialization protocol and cluster strategy.
