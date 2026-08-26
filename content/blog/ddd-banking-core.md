---
title: "DDD 在银行核心系统的落地实践"
description: "从限界上下文切分到聚合设计，记录 DDD 在银行核心系统改造中真正有用的部分与真正无效的部分。"
date: 2026-01-12
tags: ["DDD", "银行核心", "架构", "领域建模"]
weight: 99
---

银行核心系统是一类很特殊的软件：它的业务规则几十年没怎么变，但承载它的代码每隔七八年就要重写一次。我参与过一次核心的部分重构，也旁观过一次彻底失败的重写。DDD 在这两次里都被提过，但只有一次真的起了作用。这篇把我认为有效的部分和纯属自我感动的部分分开写。

## 为什么银行核心需要 DDD

老核心的问题从来不是技术栈老。COBOL 写的联机交易照样能扛住每秒几千笔。真正的问题是：业务知识只存在于少数几个人的脑子里，代码里找不到对应的表达。

一段典型的老代码长这样：把交易码、账户类型、产品编号、机构号混在一个几百行的过程里，用几十个 `IF` 分支区分场景。你想知道"活期账户计息到底怎么算"，只能从头读到尾，然后祈祷没漏掉某个补丁分支。

> 代码可以重写，业务知识不能。重构核心系统的第一目标不是换语言，而是把散落在分支里的规则重新变成可以被讨论的概念。

这正是 DDD 唯一真正值得投入的地方：它提供了一套让业务专家和工程师用同一套词汇讨论问题的方法。别的都是附加品。

## 战略设计：先切限界上下文

如果只能做 DDD 的一件事，就做上下文切分。这一步做错，后面所有战术模式都是白费。

### 以业务能力而非表结构切分

最常见的错误是按数据库表切：账户表归账户服务，交易表归交易服务。结果是每笔转账都要跨三个服务改数据，分布式事务满天飞。

我们最后落在这几个上下文上：

- **客户与关系**：客户主体、关系人、证件、KYC 状态
- **账户与协议**：账号、账户属性、签约关系、限额协议
- **交易处理**：交易受理、要素校验、路由、冲正
- **账务核算**：分录、余额、总账、日终结转
- **产品参数**：利率、费率、期限、计息规则

关键判据是：**一次业务动作的强一致性要求是否落在同一个上下文内**。转账的"扣款成功且分录平衡"必须强一致，所以账务核算不能再往下拆；而"转账成功后更新客户活跃度"完全可以最终一致，那就是两个上下文。

### 上下文映射的三种常见关系

| 关系类型 | 银行场景举例 | 集成方式 | 注意点 |
| --- | --- | --- | --- |
| 共享内核 | 账户上下文与账务上下文共用币种、金额模型 | 公共 jar，严格版本管理 | 只放值对象，禁止放业务逻辑 |
| 客户方-供应方 | 交易处理调用账务记账 | 同步 RPC，供应方定契约 | 契约变更必须双版本并行 |
| 防腐层 | 新模块访问老核心账户查询 | 适配器 + 模型转换 | 老模型绝不允许穿透进来 |

### 一个反例

我们曾经把"限额"单独切成一个上下文。听起来很干净，实际上限额校验必须和交易受理在同一个事务里完成，跨服务调用一下就把联机响应时间从 40ms 拖到 90ms，还引入了新的失败分支。半年后合并回交易处理上下文。

> 上下文边界的正确性，用一致性要求和调用频次验证，不用概念优雅度验证。

## 战术落地：聚合、实体与值对象

战术模式在核心系统里的价值远低于战略设计，但用对了确实能减少一批低级 bug。

### 聚合的粒度取决于一致性边界

账务这块我们的聚合是"分录凭证"（Voucher），不是"账户"。一张凭证包含多条分录，借贷必须平衡，这是不可分割的一致性单元。账户余额是凭证记账的结果，通过事件更新。

```java
public class Voucher {
    private final VoucherId id;
    private final AccountingDate accountingDate;
    private final List<Entry> entries = new ArrayList<>();

    public void addEntry(AccountNo account, Direction direction, Money amount) {
        if (amount.isNotPositive()) {
            throw new DomainException("分录金额必须为正数");
        }
        entries.add(new Entry(account, direction, amount));
    }

    /** 记账前的唯一硬约束：借贷平衡 */
    public void post() {
        Money debit = sumOf(Direction.DEBIT);
        Money credit = sumOf(Direction.CREDIT);
        if (!debit.equals(credit)) {
            throw new DomainException(
                "借贷不平衡: debit=" + debit + ", credit=" + credit);
        }
        registerEvent(new VoucherPosted(id, accountingDate, entries));
    }
}
```

这段代码的价值不在于用了聚合模式，而在于**借贷平衡这条规则现在只有一个地方能校验，也只有一个地方可能出错**。老系统里这个校验散在七处，其中两处的实现还不一致。

### 值对象解决金额与币种的顽疾

金额用 `BigDecimal` 传递是银行系统的经典事故源：精度丢失、币种混算、四舍五入规则不统一。值对象把这些一次性收口。

```java
public final class Money {
    private final BigDecimal amount;
    private final Currency currency;

    public Money add(Money other) {
        requireSameCurrency(other);
        return new Money(amount.add(other.amount), currency);
    }

    private void requireSameCurrency(Money other) {
        if (!currency.equals(other.currency)) {
            throw new DomainException("币种不一致，禁止直接运算");
        }
    }

    /** 计息场景统一按产品配置的舍入规则收敛 */
    public Money scaleBy(RoundingRule rule) {
        return new Money(rule.apply(amount), currency);
    }
}
```

上线后跨币种误算类缺陷直接归零。这是投入产出比最高的一个战术模式。

### 领域服务只放跨聚合逻辑

判断标准很简单：逻辑只依赖一个聚合的状态，就放聚合里；需要协调多个聚合或需要外部数据，才放领域服务。不要因为"贫血模型不好"就把查询逻辑硬塞进实体。

## 与遗留系统共存

新老并行是核心改造的常态，不是过渡态。我们的新模块和老核心并行跑了两年多。

### 防腐层是必需品

老核心返回的客户信息是一个 200 多字段的定长报文，字段名是 `CUSTFLG1` 到 `CUSTFLG9` 这种。绝不能让它进入领域层。

```java
@Component
public class LegacyAccountAdapter implements AccountQueryPort {

    private final LegacyCoreClient client;

    @Override
    public AccountSnapshot query(AccountNo accountNo) {
        LegacyAcctResp resp = client.queryAcct(accountNo.value());
        // 老系统 STATFLG: 0 正常 1 冻结 2 睡眠 9 销户
        AccountStatus status = switch (resp.getStatFlg()) {
            case "0" -> AccountStatus.ACTIVE;
            case "1" -> AccountStatus.FROZEN;
            case "2" -> AccountStatus.DORMANT;
            case "9" -> AccountStatus.CLOSED;
            default -> throw new IntegrationException(
                "未知账户状态: " + resp.getStatFlg());
        };
        return new AccountSnapshot(accountNo, status,
                Money.of(resp.getBalance(), resp.getCcy()));
    }
}
```

那个 `default` 分支很重要。老系统里确实存在文档上没写的状态码，宁可显式失败也不要静默当成正常账户处理。

### 双写与对账

迁移期间新老双写不可避免，但双写一定会不一致。配套的日终对账脚本必须和双写逻辑同时上线，不能等出了问题再补：

```bash
#!/usr/bin/env bash
# 日终核对新老账务余额，差异写入待处理表
ACCT_DATE=${1:-$(date -d "yesterday" +%Y%m%d)}

mysql -h "$NEW_CORE_HOST" -N -e "
  SELECT account_no, balance FROM acct_balance
   WHERE accounting_date = '${ACCT_DATE}' ORDER BY account_no" > /tmp/new.txt

legacy_export --date "${ACCT_DATE}" --field acct,bal > /tmp/old.txt

if ! diff -q /tmp/new.txt /tmp/old.txt > /dev/null; then
  diff /tmp/new.txt /tmp/old.txt | recon-loader --date "${ACCT_DATE}"
  echo "[WARN] ${ACCT_DATE} 存在余额差异，已入待处理表"
  exit 1
fi
echo "[OK] ${ACCT_DATE} 新老账务一致"
```

## 落地中踩过的坑

按踩坑的痛感排序：

1. **把 DDD 当成分层规范推广**。发文件要求所有模块建 `domain / application / infrastructure` 四个包，结果大家只是把原来的 Service 改名叫 DomainService，内部还是过程式代码。分层不产生任何价值，统一语言才产生价值。
2. **事件驱动用力过猛**。一度把账户状态变更、限额变更、客户信息变更全部改成事件异步处理。联机场景下用户改完限额立刻发起转账，读到的是旧限额。后来退回同步调用，只保留真正允许最终一致的场景。
3. **聚合切太小**。最初一条分录是一个聚合，导致借贷平衡校验必须放到领域服务里，一致性保证靠代码自觉。
4. **忽略批量场景**。DDD 的聚合模式面向单笔操作，日终跑几千万笔计息时逐个加载聚合直接跑不完。批处理老老实实用集合式 SQL，不要强行套聚合。

> 第 4 条值得单独强调：联机和批量是两种编程模型。核心系统必须允许它们用不同的设计范式，硬要统一只会两边都难受。

## 一些结论

DDD 在银行核心的价值分布极不均匀。限界上下文划分和统一语言是真金白银，值对象是低成本高回报，聚合在强一致场景下有用，而各种战术模式的堆砌、事件溯源、CQRS 在核心账务里基本都是负担。

如果要给一个只有半年窗口期的核心改造项目排优先级：先花两个月和业务专家把统一语言和上下文边界定下来，再花一个月把金额、日期、账号这些值对象收口，剩下的时间用来做防腐层和对账。别碰事件溯源。

核心系统的目标从来不是架构先进，而是三十年后接手的人还能看懂规则在哪。DDD 只有在服务这个目标时才值得用。
