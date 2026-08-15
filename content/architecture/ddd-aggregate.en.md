---
title: Applying DDD Aggregates in a Banking ECIF
date: 2026-08-12
description: Is a customer "one entity" or "a set of contexts"? Reslicing the ECIF customer model with aggregate roots and bounded contexts.
---

In an ECIF, the concept of "customer" is huge: retail, corporate, and interbank clients each have different attributes, relationships, and lifecycles. Forcing them into one giant `Customer` entity makes the code rot fast.

## Slice by bounded context

Split the customer across bounded contexts:

- **Party (master data)**: unified natural-person / institution identity and base attributes.
- **Profile**: risk appetite, marketing tags — high read/write churn.
- **Relationship**: shareholding, guarantee, and group relationships.

## Where the aggregate root goes

Each context defines its own aggregate root. In Party, `Party` is the root; `Address` and `Contact` are value objects, keeping cross-aggregate calls out of the consistency boundary.

> Lesson: draw aggregate boundaries by *transactional consistency*, not by the size of the business concept. The most common ECIF mistake is stuffing all customer data into one aggregate.

With this design, the master-data service stays stable while the profile service iterates independently.
