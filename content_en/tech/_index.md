---
title: Tech
description: Notes on the internals and practice of backend and distributed systems frameworks and components.
type: docs
icon: fa-solid fa-microchip
sidebar_expanded: true
sidebar_root_for: self
sidebar_root_link_self: true
navbar_autohide: false
cascade:
  theme_color: '#245f94'
  theme_color_dark: '#5da2dd'
  type: docs
  navbar_autohide: false
  footer_style: slim
  comments: false
  feedback: false
  search_boost: 1.2
---

This section collects notes on the internals and real-world practice of common backend and distributed systems frameworks and components, covering RPC, databases, coordination services, caches and message queues. Each note aims to be close to real engineering scenarios, balancing principle derivation with practical takeaways.

## Components

- [Dubbo](/en/tech/dubbo) — A microservice RPC framework: registry, cluster fault tolerance and the Filter chain.
- [MySQL](/en/tech/mysql) — A relational database: indexing internals, transactions and locking.
- [ZooKeeper](/en/tech/zookeeper) — A distributed coordination service: the ZAB protocol, leader election, configuration and locks.
- [Redis](/en/tech/redis) — A high-performance in-memory data structure store: internals and cache design.
- [Kafka](/en/tech/kafka) — A distributed messaging engine: the storage model and reliability guarantees.
