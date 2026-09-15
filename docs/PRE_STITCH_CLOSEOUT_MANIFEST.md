# Tanee / LoyalFlow — Pre-Stitch Closeout Manifest

Status: ACTIVE

This manifest is the working authority for the final Product / Logic / Functional UX / Integration closeout before Stitch. It must not be interpreted as Production authorization.

## Baseline

- Production `main`: `d0f5bd3b24ddbfb688da04af47370c5556643648`
- Integration `staging`: `78be89ca3e050f86e302203ef01453d6ee65c5d9`
- Current non-WhatsApp closeout head: `d6727b3d73d3a23e259904b49364ad7021bf92fd`
- Last focused validated checkpoint: `d6727b3d73d3a23e259904b49364ad7021bf92fd`
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

- [x] One authoritative non-WhatsApp Reward State for Card / Profile / Scan / Redemption / Customers / Reports / Offers. WhatsApp remains in its separate lane.
- [x] Non-expiring earned reward is redeemable without requiring a non-existent unlock lifecycle record.
- [x] Fallback reward is unavailable while an active catalogue is authoritative.
- [x] Multi-reward affordability/readiness has one contract.
- [x] Earned expiring entitlement snapshot policy is implemented and regression-tested.
- [x] Reward cost/name/status changes have explicit treatment for already-earned entitlement.

Focused evidence: `getRewardTruth` in `lib/rewards/availability.ts` is the shared authority used by the non-WhatsApp surfaces above. Commit `c2cab56ee3ef778897f1843d66863627da6bcd44` passed 17/17 focused tests, including the cross-surface multi-reward fixture. Entitlement snapshot and mutation-policy regressions were already closed on this lane before that reconciliation.

### Customer state / audience truth

- [x] Replace single mutually-exclusive segment authority with explicit lifecycle/value/engagement/reward traits where needed.
- [x] Reward Ready is identical in Customers, Reports, Exports and Offers. Messaging remains tracked in the separate WhatsApp lane.
- [x] High Spender uses qualifying monetary behavior, not generic lifetime loyalty credit.
- [x] Frequent Visitor uses qualifying operation frequency, not generic lifetime loyalty credit.
- [x] VIP/value and At-Risk/activity can coexist.
- [x] Refund/void/promotion effects on audience metrics are explicitly defined and tested.

Focused evidence: `tests/customer-audience-context.test.ts`, `tests/customer-segments.test.ts`, `tests/offer-eligibility.test.ts`, and the ten-customer reconciliation fixture in `tests/customer-audience-cross-surface.test.ts`. Exact branch commit `a2dd5809d7cc7808dfc18ac7a37d88d4b0c42bc4` passed 34/34 focused assertions; its full exact-head gate is tracked below.

### Offers / customer notifications

- [x] Offer audience engine can actually produce every offered audience choice.
- [x] Reward and Offer create/update/activate/deactivate operations persist explicit, locale-neutral Business Activity audit records atomically with their catalog writes.
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

- [x] Country-aware canonical phone identity is defined for local, `+20` and `0020` equivalents.
- [x] Existing-data collisions are exposed through the review-only duplicate workflow before any migration or merge decision.
- [x] Duplicate membership prevention uses canonical identity at command boundaries.
- [ ] WhatsApp opt-out resolves the same canonical identity.
- [x] Duplicate-join recovery remains privacy-safe and never discloses a bearer card URL from phone alone.

Focused evidence: commit `49df8a34861d22316cf5cc20144eecf88eb1af39` passed 33/33 phone, registration, duplicate and command-boundary tests. No Schema or Migration change was made; any future persisted canonical column or automated collision merge remains an Authorization Gate.

### Owner Trial / onboarding

- [x] Public Trial field limits equal final persistence limits.
- [x] Password acceptance continues safely into onboarding without an unnecessary second login.
- [x] Trial-start policy is locked; authority is first successful Launch for a fourteen-day promise.
- [x] Country derives consistent currency/timezone defaults.
- [x] Server draft, Wizard state and Card Preview use the same defaults.
- [x] Logo upload no longer conflicts with a 500-character URL field contract.
- [x] Post-Launch first action exposes Join QR/link and first-customer path.

### Sales Amount

- [x] Sales Amount operation records actual transaction amount.
- [x] Historical Sales Amount currency cannot be silently relabeled through normal Business Profile settings.
- [x] Currency choices use one source list across creation/onboarding/settings.
- [x] Decimal policy is explicitly locked: whole-unit V1.

### Custom Card

- [x] Structurally valid but undecodable image payloads are rejected.
- [x] Missing Blob object has a clean explicit response contract.
- [x] Provider/auth/storage failure is distinguished from not-found.
- [x] Corrupt/unreadable stored artwork has a defined response contract.
- [x] Oversized request behavior is friendly even when framework limits trigger before the action.
- [x] Version listing is paginated beyond the first 100 objects.

Focused evidence for the closed Logo / Custom Card contracts above: Preview commit `900d90698ee2667bcfe814007958929ce2e63e82` executed 28 focused tests with 28 PASS / 0 FAIL before a successful production build and READY Preview deployment. The temporary Preview verifier was removed immediately after evidence capture. Full external Blob lifecycle certification and the structurally-valid-but-undecodable payload case remain open and are not represented by this focused evidence.

### Card color semantics

- [x] `primaryColor` is the primary accent/action/QR/progress authority.
- [x] `secondaryColor` is the supporting surface and gradient-companion authority.
- [x] Standard and Custom Card consumers follow the same semantic contract.

Focused evidence: `docs/product/CARD_COLOR_SEMANTICS.md`, `lib/cards/card-color-semantics.ts`, and commit `3ec869cb0b89314ca66dbfaff412cec9721bcaf4`; 19/19 targeted tests passed.

### Reward / Offer Business Activity

- [x] Reward create/update/activate/deactivate events have explicit operations and item identity.
- [x] Offer create/update/activate/deactivate events have explicit operations and item identity.
- [x] Audit presentation is derived in Arabic or English from structured metadata.
- [x] Catalog Business Activity is not represented as a customer outbound notification.
- [x] No unsupported Reward/Offer publish event is fabricated; the current catalog lifecycle is create/update/active status.

Focused evidence: commit `d6727b3d73d3a23e259904b49364ad7021bf92fd`; 26/26 activity and command-boundary tests passed, TypeScript passed, and lint completed with zero errors (three pre-existing warnings).

### Roles / permissions final matrix

- [x] Owner, Manager, Staff, Viewer, and Super Admin capabilities are documented from the canonical source authority.
- [x] Dashboard, Customers, Customer Profile, Scan, Earn, Redeem, Adjust, Rewards, Offers, Reports, Export, Team, Settings, Card, Custom Card, and Plans/subscription surfaces are mapped.
- [x] Navigation visibility and direct route/action/API enforcement remain separate requirements.
- [x] Non-Super-Admin capability grants remain tenant-scoped; Super Admin restrictions remain additive where explicitly required.

Focused evidence: `docs/product/ROLE_PERMISSION_MATRIX.md` plus the Phase C role, tenant, navigation, and server-boundary regression suite. Functional implementation is `CLOSED`; browser and Staging evidence remain required for `VERIFIED`.

### Subscription / Trial / entitlement matrix

- [x] Pending, Trialing, Active, Past Due, Suspended, Canceled, and Expired operation policies are documented from runtime authority.
- [x] Plan feature and default capacity boundaries are documented from the canonical entitlement catalog.
- [x] Role, tenant, lifecycle, plan, capacity, and provider gates remain additive.
- [x] Trial authority is 14 days from the first successful Launch.
- [x] Stale seven-day Trial wording was removed from non-Marketing integration/product audit contracts.

Focused evidence: `docs/product/SUBSCRIPTION_ENTITLEMENT_MATRIX.md` and `tests/phase-d-subscription-entitlement-matrix.test.ts`. Functional implementation is `CLOSED`; browser and Staging evidence remain required for `VERIFIED`.

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

Current external gate: Vercel Preview for `d6727b3d73d3a23e259904b49364ad7021bf92fd` is pending. Earlier attempts on this lane reported the free-plan deployment-rate limit; therefore this manifest does not claim Staging Verified or exact-head CI GREEN.

## Freeze statement

Only after every required blocker and certification item above is closed may the project be labeled:

`TANEE PRE-STITCH PRODUCT CLOSEOUT — COMPLETE`

After that point Stitch may change presentation, responsive layout, identity, typography and visual hierarchy, but must not silently redefine routes, permissions, loyalty economics, customer identity, reward truth, audience truth, server behavior or the data model.
