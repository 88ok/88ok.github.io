---
title: Dubbo
description: Alibaba's open-source microservice RPC framework, focused on service registration/discovery, cluster fault tolerance and an extensible architecture.
type: docs
icon: fa-solid fa-cube
cascade:
  type: docs
---

Dubbo is a high-performance Java RPC framework open-sourced by Alibaba. Its layered architecture decouples service definition, registration/discovery, cluster fault tolerance and network transport. Its SPI-based mechanism provides strong extensibility and it is widely used in Chinese microservice governance stacks. This subsection focuses on Dubbo's core architecture and the practice of service registration and discovery.

## Articles

- [Dubbo Architecture and Core Concepts](/en/tech/dubbo/architecture) — Layered design, the Invoker abstraction, SPI extensions and the full path of a synchronous call.
- [Service Registration and Discovery in Practice](/en/tech/dubbo/registry-discovery) — Using ZooKeeper/Nacos as the registry, configuration, health checks and zero-downtime releases.
