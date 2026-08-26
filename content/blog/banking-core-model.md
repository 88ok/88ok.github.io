---
title: "银行核心系统建模随笔"
description: "关于账户、分录、产品参数与会计日的建模笔记，记录核心系统里那些看着简单实则不能妥协的模型设计。"
date: 2026-08-02
tags: ["银行核心", "领域建模", "架构", "账务"]
weight: 42
---

核心系统的模型看起来很朴素：账户、余额、交易、分录。真正做进去才发现，每一个概念背后都有一堆不能妥协的约束，而这些约束在需求文档里往往一个字都没写。这篇是零散的建模笔记，按我认为重要性排的顺序。

## 核心系统到底在建模什么

先把定位说清楚。核心系统建模的对象不是"业务流程"，而是**会计事实**。

客户在手机上点一下转账，这是渠道行为；反洗钱要不要拦、限额够不够，这是风控与协议判断；而核心真正负责的只有一件事：**在正确的会计日，把一组借贷平衡的分录准确地记下来，并保证余额永远等于分录累计的结果**。

想清楚这一点，很多设计争论会自动消失。比如"转账的营销活动规则要不要放核心"——不放，那不是会计事实。核心的表越少越好，能力越单一越好。

> 判断一个需求该不该进核心，只问一句：它会改变账务事实吗？不会，就放外围。核心系统膨胀的过程，就是这条边界一次次让步的过程。

## 账户模型：一棵不能长歪的树

### 账户号不是主键

这是我见过最多的建模错误。账号是**业务标识**，有格式规则、会变更、会重开、可能因迁移换号段。用它做物理主键，等到某天要做账号升位或者跨行并库，整个系统的外键关系会一起爆炸。

正确做法是内部 ID 与业务账号分离：

```java
public class Account {
    private final AccountId id;        // 内部标识，永不变更，不对外暴露
    private AccountNo accountNo;       // 业务账号，可变更，对外展示
    private final CustomerId owner;
    private final ProductCode product;
    private final Currency currency;
    private AccountStatus status;
    private final LocalDate openDate;

    /** 账号变更保留历史，因为凭证和流水引用的是历史账号 */
    public void changeAccountNo(AccountNo newNo, String reason) {
        if (status != AccountStatus.ACTIVE) {
            throw new DomainException("非正常状态账户不允许换号");
        }
        registerEvent(new AccountNoChanged(id, accountNo, newNo, reason));
        this.accountNo = newNo;
    }
}
```

`AccountNoChanged` 事件必须落库。半年后有人拿旧账号来查流水，你要能翻译过去。

### 一个账户往往对应多个"户"

业务上说"这个客户的活期账户"，模型上可能是：一个协议账户下挂多个币种子账户，每个子账户下再有多个内部核算户（可用户、冻结户、待清算户）。层级不能压平，压平了就没法表达"同一账户不同币种独立计息"这类规则。

### 余额不是一个字段

新人最容易踩的坑：以为余额就是 `balance` 一个数。实际上一个账户同时存在多种余额，语义完全不同：

| 余额类型 | 含义 | 典型用途 | 是否可为负 |
| --- | --- | --- | --- |
| 账面余额 | 已记账分录的累计结果 | 对账、总账核对 | 是（透支、内部户） |
| 可用余额 | 账面减冻结减最低留存 | 支付扣款校验 | 否 |
| 冻结金额 | 司法冻结加交易预授权 | 解冻、司法查询 | 否 |
| 在途金额 | 已受理未清算 | 跨行转账、批量代发 | 否 |
| 计息余额 | 按计息规则口径的余额 | 日终计息 | 是 |

这五种余额的更新时点、更新方式、允许的符号都不一样。**绝不能用一个字段加几个标志位糊过去**。我见过一个系统把冻结做成"从可用余额里扣掉再记一笔内部账"，结果司法冻结解冻时顺序错了，客户余额凭空多出一笔。

计息余额尤其特殊：它需要的不是当前值，而是**每一天的日终值序列**，所以必须留日终余额快照表，不能靠实时余额倒推。

## 交易模型：分录才是第一公民

### 交易是外壳，分录是内核

一笔"转账"在核心里的正确表达是：一张凭证，包含至少两条方向相反、金额相等的分录。交易只是给这张凭证一个业务含义的外壳。

这个建模顺序反过来会很痛苦。如果以"交易"为核心概念，每新增一种业务就要加一套字段和处理逻辑；以"分录"为核心，新业务只是新的分录组合模板。

```java
public class Voucher {
    private final VoucherId id;
    private final AccountingDate accountingDate;   // 会计日，不是系统日期
    private final TransactionCode txCode;
    private final List<Entry> entries = new ArrayList<>();

    public void post() {
        Money debit = sumBy(Direction.DEBIT);
        Money credit = sumBy(Direction.CREDIT);
        if (!debit.equals(credit)) {
            throw new DomainException("借贷不平衡: " + debit + " vs " + credit);
        }
        if (entries.size() < 2) {
            throw new DomainException("凭证至少包含两条分录");
        }
        registerEvent(new VoucherPosted(id, accountingDate, entries));
    }
}
```

### 冲正不是删除，是反向记账

联机交易失败要撤销，正确做法永远是记一笔方向相反的分录，原分录保持不动。物理删除或者 update 掉原记录，会让当日的分录累计和余额对不上，日终对账直接崩。

冲正凭证要保留对原凭证的引用，并且**冲正的会计日是原凭证的会计日，不是当前日**。跨会计日的冲正要走"红字冲销加重记"的流程，这是会计规则，不是技术选择。

### 状态机要显式，不要靠字段拼

交易状态建议直接建模成状态机，允许的迁移写在一个地方：

```java
public enum TxStatus {
    RECEIVED, PROCESSING, POSTED, FAILED, REVERSED;

    private static final Map<TxStatus, Set<TxStatus>> ALLOWED = Map.of(
            RECEIVED,   EnumSet.of(PROCESSING, FAILED),
            PROCESSING, EnumSet.of(POSTED, FAILED),
            POSTED,     EnumSet.of(REVERSED),
            FAILED,     EnumSet.noneOf(TxStatus.class),
            REVERSED,   EnumSet.noneOf(TxStatus.class));

    public void checkTransitionTo(TxStatus target) {
        if (!ALLOWED.get(this).contains(target)) {
            throw new DomainException("非法状态迁移: " + this + " -> " + target);
        }
    }
}
```

看着简单，但它挡住的是"已冲正的交易又被重复冲正"这类真实生产事故。

## 产品模型：参数化的边界

产品是核心里最容易失控的部分。业务的诉求永远是"能不能配一下就上新产品"，于是参数越来越多，最后变成一个谁也不敢改的配置怪物。

我的经验是明确区分两类东西：

- **可参数化的**：利率、费率、期限、起存金额、计息方式、结息周期、扣款优先级。这些是同一套算法的不同取值。
- **不可参数化的**：新的计算逻辑、新的账务处理路径、新的监管报送口径。这些必须写代码。

```yaml
product:
  code: DEP-CUR-001
  name: 个人活期存款
  category: DEPOSIT_CURRENT
  currency: CNY
  interest:
    method: DAILY_ACCRUAL       # 逐日计提
    basis: ACT/360
    rate_ref: BASE_CUR_CNY      # 引用利率表，不写死数值
    settle_cycle: QUARTERLY
    settle_day: 21
    rounding: HALF_UP@2
  limits:
    min_open_amount: 1.00
    allow_overdraft: false
  accounting:
    entry_template: TPL_DEP_CUR  # 分录模板，代码实现
```

利率一定要用**引用**而不是数值。利率调整时改的是利率表加生效日期，产品配置不动，历史计息才能按当时的利率重算。这一条是被审计问过之后才补上的。

> 参数化的收益是上新快，代价是排查难。每加一个参数，就多一条"为什么这笔算出来是这个数"的排查路径。加参数前先问：这真的会有第二种取值吗？

## 时间维度：会计日与系统时间

这是核心系统里最反直觉、也最容易出事的部分。

**会计日和自然日不是一回事**。日终批量跑到凌晨两点，这期间进来的联机交易属于哪一天？跨时区分行的日切时点不一致怎么办？节假日的会计日怎么顺延？

几条硬规则：

1. 所有账务相关的日期字段，存的必须是**会计日**，由系统日切状态决定，不能用 `LocalDate.now()` 取。
2. 系统时间只用于记录"这条数据什么时候被写入"，即技术审计字段，不参与任何业务判断。
3. 日切期间的联机交易要么排队等日切完成，要么明确记入新会计日，两种策略都可以，但必须全系统一致。
4. 计息、结息、到期这些计算全部基于会计日和日历表，日历表要包含每个机构的节假日安排。

```java
// 反例：直接取系统日期作为记账日期
Voucher v = new Voucher(txCode, LocalDate.now());

// 正确：从日切上下文获取当前会计日
AccountingDate acctDate = accountingCalendar.currentAccountingDate(branchId);
Voucher v = new Voucher(txCode, acctDate);
```

我经历过一次生产问题，就是某个新写的模块用了 `now()`，日终跑过零点后，几百笔交易记到了第二天，日终对账差额定位了整整一晚。

## 建模的几条经验

按我踩坑的顺序：

1. **先建模会计事实，再考虑业务流程**。流程会变，会计事实的结构几十年不变。
2. **任何金额都用值对象携带币种**，不要用裸的 `BigDecimal` 到处传。
3. **状态变更留事件，不要只留最终态**。核心系统被问得最多的问题是"这笔为什么变成这样"，只有最终态就答不上来。
4. **区分联机与批量两套设计范式**。联机重单笔正确性和响应时间，批量重吞吐和可重跑，不要强行统一。
5. **一切依赖时间的逻辑都从会计日历取值**。
6. **模型的对外契约要比内部实现稳定得多**。内部可以重构，账号、凭证号、分录结构这些对外语义一旦定了就很难改。

核心系统建模没什么炫技的空间，能做的就是把那些看起来很笨的约束老老实实表达出来——借贷必须平衡、余额必须可追溯、日期必须来自会计日历。这些约束每一条都有几十年的会计实践在背后支撑，你觉得它啰嗦的时候，通常是还没遇到它要防的那个事故。
