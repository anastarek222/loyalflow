# Tanee / LoyalFlow — Pre-Stitch Closeout Manifest

Status: ACTIVE

This manifest is the working authority for the final Product / Logic / Functional UX / Integration closeout before Stitch. It must not be interpreted as Production authorization.

## Baseline

- Production `main`: `802f1b3762c9c327264a79dd832bc078fc07f667`
- Integration `staging`: `f3ac53588d8a912117cf3ee393bbdbdc405a66bc`
- Last fully validated reconciliation checkpoint: `f07df28807451908809fa92ec5495f6eb8ba0484`
- Parallel delta reconciled into this lane: `5ec317cf48797275fa10241c7c8e0938d2f72186` (`components/customer-messages-form.tsx` return-target preservation only)
- This branch is the next baseline candidate. It is not a Pre-Stitch Freeze until exact-head validation and all blockers below are closed.

## Execution rules

1. Prove the current gap before changing runtime behavior.
2. Fix shared sources of truth before page-local symptoms.
3. Do not duplicate already-fixed behavior from stacked Draft PRs.
4. Preserve tenant isolation, permission enforcement, financial locking/idempotency, and existing safe subscription boundaries.
5. No merge to `staging` or `main`, and no Production/provider mutation, without explicit Owner authorization.
6. Each functional batch requires focused regression plus exact-head evidence.

## P1 functional blockers

### Reward / redemption truth
- [ ] One authoritative Reward State for Card / Profile / Scan / Redemption / Customers / Reports / Offers / WhatsApp.
- [ ] Non-expiring earned reward is redeemable without requiring a non-existent unlock lifecycle record.
- [ ] Fallback reward is unavailable while an active catalogue is authoritative.
- [ ] Multi-reward affordability/readiness has one contract.
- [ ] Earned expiring entitlement snapshot policy is implemented and regression-tested.
- [ ] Reward cost/name/status changes have explicit treatment for already-earned entitlement.

### Customer state / audience truth
- [ ] Replace single mutually-exclusive segment authority with explicit lifecycle/value/engagement/reward traits where needed.
- [ ] Reward Ready is identical in Customers, Reports, Exports, Offers and messaging.
- [ ] High Spender uses qualifying monetary behavior, not generic lifetime loyalty credit.
- [ ] Frequent Visitor uses qualifying operation frequency, not generic lifetime loyalty credit.
- [ ] VIP/value and At-Risk/activity can coexist.
- [ ] Refund/void/promotion effects on audience metrics are explicitly defined and tested.

### Offers / customer notifications
- [ ] Offer audience engine can actually produce every offered audience choice.
- [ ] New published Reward creates one brand-scoped customer notification event for opted-in eligible customers.
- [ ] New published Offer notifies only its exact eligible opted-in audience.
- [ ] Publish notification fan-out is idempotent and consent is rechecked before delivery.
- [ ] Owner has visible queued/skipped/delivery summary evidence.

### WhatsApp truth
- [ ] Automatic reward context uses the same Reward State as Card/manual messaging.
- [ ] Manual and Meta template parsing use one token parser/validator.
- [ ] Owner-editable first-run message defaults follow the approved Product requirement without creating duplicate manual/automatic copy sources.
- [ ] New Reward / New Offer outbound events integrate with the existing Business-scoped outbox, credentials, consent and delivery-status model.

### Customer identity
- [ ] Country-aware canonical phone identity is defined.
- [ ] Existing-data collision audit is completed before migration.
- [ ] Duplicate membership prevention uses canonical identity.
- [ ] WhatsApp opt-out resolves the same canonical identity.
- [ ] Duplicate-join recovery remains privacy-safe and never discloses a bearer card URL from phone alone.

### Owner Trial / onboarding
- [ ] Public Trial field limits equal final persistence limits.
- [ ] Password acceptance continues safely into onboarding without an unnecessary second login.
- [ ] Trial-start policy is locked; recommended authority is first successful Launch for a seven-usable-day promise.
- [ ] Country derives consistent currency/timezone defaults.
- [ ] Server draft, Wizard state and Card Preview use the same defaults.
- [ ] Logo upload no longer conflicts with a 500-character URL field contract.
- [ ] Post-Launch first action exposes Join QR/link and first-customer path.

### Sales Amount
- [ ] Sales Amount operation records actual transaction amount.
- [ ] Historical Sales Amount currency cannot be silently relabeled through normal Business Profile settings.
- [ ] Currency choices use one source list across creation/onboarding/settings.
- [ ] Decimal policy is explicitly locked: whole-unit V1 or proper minor-unit model.

### Custom Card
- [ ] Structurally valid but undecodable image payloads are rejected.
- [ ] Missing Blob object has a clean explicit response contract.
- [ ] Provider/auth/storage failure is distinguished from not-found.
- [ ] Corrupt/unreadable stored artwork has a defined response contract.
- [ ] Oversized request behavior is friendly even when framework limits trigger before the action.
- [ ] Version listing is paginated beyond the first 100 objects.

### Source / release governance
- [ ] One authoritative Pre-Stitch source head exists after every active parallel delta is reconciled.
- [ ] No important runtime fix remains only in an unvalidated side branch.
- [ ] Browser scenarios cannot silently early-return and pass without exercising required assertions.
- [ ] Closeout docs and runbooks describe the same current source and lifecycle behavior.

## Required final certification

- [ ] Owner journey PASS — desktop and mobile.
- [ ] Manager journey PASS — desktop and mobile.
- [ ] Staff journey PASS — desktop and mobile.
- [ ] Viewer journey PASS — desktop and mobile.
- [ ] Customer journey PASS — desktop and mobile.
- [ ] Super Admin journey PASS.
- [ ] Subscription/entitlement matrix PASS.
- [ ] Cross-surface Reward/Offer/Audience scenario suite PASS.
- [ ] Disposable migrations and upgrade path PASS.
- [ ] Exact-head full CI GREEN.
- [ ] Enabled V1 external integrations certified (Meta/WhatsApp, Email, Blob, runtime workers as applicable).
- [ ] No known P0 or functional P1 remains open.

## Freeze statement

Only after every required blocker and certification item above is closed may the project be labeled:

`TANEE PRE-STITCH PRODUCT CLOSEOUT — COMPLETE`

After that point Stitch may change presentation, responsive layout, identity, typography and visual hierarchy, but must not silently redefine routes, permissions, loyalty economics, customer identity, reward truth, audience truth, server behavior or the data model.
