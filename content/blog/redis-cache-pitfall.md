---
title: "缓存设计的那些坑"
description: "从一致性策略到穿透、击穿、雪崩与热 key、大 key 问题，记录缓存设计中反复踩到的坑与对应做法。"
date: 2026-07-08
tags: ["Redis", "缓存", "高并发", "架构"]
weight: 48
---

缓存是最容易加的优化，也是最容易埋雷的优化。加的时候只要几行代码，出问题时往往是深夜的数据不一致或者数据库被打穿。

## 一致性：先更库还是先删缓存

这个问题的正确答案是**先更新数据库，再删除缓存**（Cache Aside）。但要理解它为什么仍然不完美。

先删缓存再更库的问题很直接：删完缓存到更库完成之间，另一个请求读到旧数据并把它写回缓存，之后缓存里就一直是脏数据。

先更库再删缓存也有极小概率出问题：读请求恰好在缓存失效后读到旧库值，且回写发生在删除动作之后。概率很低，但在高并发下不等于零。

```java
@Transactional
public void updateLimit(String accountNo, Money newLimit) {
    limitRepository.update(accountNo, newLimit);   // 1. 先落库
    // 2. 事务提交后再删缓存，避免删除后事务回滚导致缓存空档
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
            @Override public void afterCommit() {
                cache.delete(limitKey(accountNo));
            }
        });
}
```

`afterCommit` 这一步很关键。在事务内删缓存，如果事务随后回滚，缓存已经被清掉，下一次读会把旧值再加载回来——看起来是对的，但实际上你丢失了一次删除的语义保证。

> 更重要的判断是：这个数据到底能不能容忍短暂不一致。限额、开关、风控规则这类直接影响资金准入的配置，我们干脆不缓存或者只做几秒的本地缓存，宁可多查一次库。

## 三大经典故障

- **穿透**：查一个根本不存在的 key，每次都落库。恶意刷不存在的账号就是这么打穿数据库的。做法是缓存空值并设短过期（比如 60 秒），或者前置布隆过滤器。
- **击穿**：热点 key 过期瞬间大量请求同时落库。做法是加互斥锁，只让一个线程去加载，其余等待或返回旧值。
- **雪崩**：大批 key 同时过期，或者 Redis 整体不可用。前者靠给过期时间加随机抖动解决；后者必须有降级预案——限流加返回兜底数据，不能让流量全量透传到数据库。

```java
// 过期时间加抖动，避免批量同时失效
private Duration ttlWithJitter(Duration base) {
    long jitter = ThreadLocalRandom.current()
            .nextLong(base.toSeconds() / 10 + 1);   // 上下浮动约 10%
    return base.plusSeconds(jitter);
}
```

## 热 key 与大 key

这两个是运维阶段最常见的问题，开发时基本不会注意到。

**热 key** 指单个 key 的访问量集中到某一个 Redis 分片上，导致该节点 CPU 打满而其他节点空闲。典型场景是全行共用的一个产品配置 key。解法是加本地缓存做二级，或者把 key 拆成多个副本随机读。

**大 key** 指单个 value 过大（比如把几万条记录塞进一个 Hash）。它的危害是删除或过期时会阻塞主线程，而且网络传输会打满带宽。

```bash
# 扫描大 key，务必在从库上跑，不要打生产主库
redis-cli --bigkeys -i 0.1 -h "$REDIS_SLAVE"

# 抓取热 key（需开启相关配置）
redis-cli --hotkeys -h "$REDIS_SLAVE"

# 大 key 删除用 unlink 而非 del，交后台线程异步回收
redis-cli -h "$REDIS_HOST" unlink "product:config:all"
```

我踩过的最实际的一个坑：有人用 `keys *` 在生产上排查问题，Redis 阻塞了几秒，上游超时重试放大流量，最后拖垮了整条链路。生产环境要在客户端层面直接禁掉 `keys`、`flushall` 这类命令。

缓存的正确心态是：它是一个可以随时丢失的副本，而不是数据源。任何一处逻辑如果依赖缓存必然存在才能正确，那就已经埋下故障了。
