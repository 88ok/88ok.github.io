---
title: 服务注册与发现实战
description: 以 ZooKeeper/Nacos 为注册中心，Provider/Consumer 配置、健康检查、优雅上下线与不停机发布。
date: 2026-08-25
tags: [Dubbo, 注册中心, 服务发现]
weight: 20
---

服务注册与发现是微服务架构的基石。Dubbo 将注册中心抽象为 `Registry` 接口，因此可以在 ZooKeeper、Nacos、Consul 等实现之间平滑切换，业务代码无需改动。

## 注册中心接入

以 Nacos 为例，只需在配置中声明注册中心地址与协议即可。Dubbo 在启动时自动完成服务导出（export）与订阅（subscribe）：

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

Provider 启动后会在注册中心写入自身元数据（接口、IP、端口、权重等）；Consumer 启动后订阅接口节点，拿到可用 Provider 列表并缓存到本地，后续调用直接走本地缓存，降低注册中心压力。

## 健康检查与上下线

- **注册中心侧健康**：基于临时节点（ZooKeeper）或心跳（Nacos）感知进程存活，进程宕机时节点被摘除，Consumer 收到 `unregister` 通知后剔除实例。
- **应用侧优雅下线**：收到 `SIGTERM` 时先取消注册、拒绝新请求、等待在途请求处理完毕再退出，避免调用方打到已下线的实例。

## 不停机发布

滚动发布时常见问题是「刚下线就又有流量」。推荐组合拳：

1. 下线前通过注册中心将实例权重置 0，使其不再接收新流量。
2. 等待预热期与在途请求排空（如 10s）。
3. 再执行实际进程关闭。

配合 Consumer 端的失败重试与 `Cluster` 容错（如 `Failover`），可基本实现调用方无感知的版本迭代。需要注意：注册中心通知存在网络延迟，Consumer 本地缓存与重试机制是兜底关键。
