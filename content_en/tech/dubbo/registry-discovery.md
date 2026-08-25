---
title: Service Registration and Discovery in Practice
description: Using ZooKeeper/Nacos as the registry, provider/consumer configuration, health checks, graceful up/down and zero-downtime releases.
date: 2026-08-25
tags: [Dubbo, Registry, Service Discovery]
weight: 20
---

Service registration and discovery are the foundation of microservice architecture. Dubbo abstracts the registry as the `Registry` interface, so you can switch smoothly between ZooKeeper, Nacos, Consul and others without changing business code.

## Connecting a Registry

Using Nacos as an example, you only need to declare the registry address and protocol in configuration. On startup Dubbo automatically exports (export) and subscribes (subscribe) services:

```yaml
dubbo:
  application:
    name: order-service
  registry:
    address: nacos://127.0.0.1:8848
  protocol:
    name: dubbo
    port: 20880
```

After a provider starts, it writes its metadata (interface, IP, port, weight, etc.) into the registry. When a consumer starts, it subscribes to the interface node, fetches the available provider list and caches it locally; subsequent calls go directly to the local cache, reducing registry pressure.

## Health Checks and Lifecycle

- **Registry-side health**: based on ephemeral nodes (ZooKeeper) or heartbeats (Nacos) to detect process liveness. When a process dies the node is removed, and the consumer receives an `unregister` notification and drops the instance.
- **Application-side graceful shutdown**: on `SIGTERM`, first deregister, reject new requests, wait for in-flight requests to drain, then exit, avoiding routing traffic to an already-down instance.

## Zero-Downtime Releases

A common problem during rolling releases is "traffic still hits an instance right after it went down". The recommended combo:

1. Before going down, set the instance weight to 0 in the registry so it stops receiving new traffic.
2. Wait for a warm-up period and in-flight requests to drain (e.g. 10s).
3. Then perform the actual process shutdown.

Combined with consumer-side retry and `Cluster` fault tolerance (e.g. `Failover`), this can achieve near call-side-transparent version rollouts. Note: registry notifications have network latency, so the consumer's local cache and retry mechanism are critical fallbacks.
