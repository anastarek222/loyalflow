# LoyalFlow Technical Completion Overlay

Status: approved execution priority, not a replacement roadmap.

Decision date: 2026-08-12.

## 1. Authority and purpose

The product-delivery Master Plan (`P0-P12`), the modernization execution plan
(`P0-P25`), and the evidence gates (`G01-G21`) remain authoritative. This
overlay changes only the order in which unfinished work is prioritized:

1. complete launch-scope product behavior, backend ownership, data safety,
   localization architecture, subscriptions, cards, enrollment, and operational
   evidence;
2. keep every interim UI usable, responsive, bilingual, and accessible;
3. defer final brand styling and final public content until the technical launch
   scope is stable.

An overlay item may never be used to bypass a Master Plan dependency, gate,
approval, test, staging requirement, or rollback requirement.

## 2. Binding execution rules

1. Execute one bounded slice at a time. Each runtime slice has one primary
   product phase, one primary modernization phase, and one PR.
2. Record scope, non-goals, affected boundaries, risks, tests, rollout, and
   rollback or forward-fix before implementation.
3. Do not mix unrelated schema, authentication, financial semantics, and visual
   redesign in one slice.
4. Use incremental strangler migration. Preserve the compatible legacy path
   until parity, zero callers, observation, and rollback compatibility are
   recorded.
5. Migrate read paths before safe writes. Migrate Earn, Redeem, Adjustment,
   RewardUnlock, and reversal commands last.
6. Keep tenant isolation, role permissions, plan entitlements, validation,
   idempotency, audit metadata, redirects, revalidation, and public-card privacy
   server enforced.
7. Database changes are additive and forward-only. Never edit applied migration
   history and never use `prisma db push`. A database-affecting slice requires
   G02/G03, reviewed SQL, disposable test evidence, staging rehearsal, and an
   approved rollback or forward-fix.
8. Production data, production migrations, provider configuration, deployment,
   commit, push, and PR publication are separate explicit actions. Local source
   work does not authorize them.
9. Required local evidence for an affected runtime slice includes focused tests,
   the full test suite, TypeScript, ESLint, `git diff --check`, and a production
   build. Prisma format/validate/generate and migration checks are additionally
   required when database contracts are affected.
10. Code tests do not prove browser UAT, staging, recovery, provider delivery,
    Closed Beta, or production readiness. Those claims require their named gate
    evidence.

## 3. Work now versus defer

### Complete now

- domain, contracts, configuration, and API boundaries;
- separation of web presentation from Prisma/database ownership;
- separate Arabic and English catalogs with key parity;
- account, business, card, customer enrollment, settings, subscription, plan,
  and payment lifecycle behavior required for Launch V1;
- server permissions, plan entitlements, validation, audit, privacy, and tenant
  isolation;
- Custom Card upload/storage/version/publish behavior and one canonical card
  projection/renderer;
- public signup, verification, trial, checkout, billing transitions, and legal
  data-lifecycle behavior required by P11;
- migration safety, recovery evidence, monitoring, performance, E2E, staging,
  rollback, and Closed Beta gates.

### Defer to the final presentation/content pass

- final LoyalFlow colors, fonts, icon treatment, decorative shapes, and motion
  direction;
- final artwork and visual composition of Standard and Custom cards;
- final marketing copy, About Us facts, public prices, contact details, images,
  and videos;
- final visual ordering and polish of the homepage, public card, Customers,
  Dashboard, and marketing pages.

Deferred presentation work must remain configuration-driven. Technical slices
must not hard-code final company facts, prices, media, or visual decisions.
Accessibility, responsive behavior, AR/EN support, and truthful states are not
visual polish and cannot be deferred.

## 4. Overlay-to-Master-Plan mapping

| Overlay slice | Original product phases | Modernization phases | Required gates | Boundary |
|---|---|---|---|---|
| TC0 Baseline and execution contract | P0 | P0-P3 | G01-G04 as applicable | Documentation and verified local baseline only; no runtime or database change. |
| TC1 Domain/contracts/config foundation | P5.1-P5.4 | P4-P6 | G04-G07 | Activate pure packages, typed problems/DTOs, import rules, and compatibility adapters; no feature redesign. |
| TC2 AR/EN extraction | P6.4-P6.7 | P5 and P22 | G06, G19 | Split catalogs, remove inline bilingual authorities progressively, retain SSR/RTL behavior. |
| TC3 Card and enrollment lifecycle | P8.5-P8.6, P9.6, P9.8, P11.3 | P7-P8, P16-P17 | G08, G09, G15, G16, G19 | One card projection/renderer/workspace; Join QR limits and entitlements; safe recovery; Custom Card asset lifecycle. |
| TC4 Account, Settings, plans, and subscriptions | P3, P9.5, P11.1-P11.6 | P8 and P20 | G09, G16, G19 | Preserve completed auth; complete account/settings ownership and provider-neutral billing state before payment activation. |
| TC5 API and backend ownership extraction | P5.5-P5.7 | P6-P10 | G07-G12, G16 | Reads first, then safe writes, then critical ledger writes; remove web Prisma only after parity. |
| TC6 Database, integrations, and operations | P4, P10.3-P10.5, P11.4 | P2 and P21-P23 | G02, G03, G17, G18 | Expand/contract, measured recovery, durable integration boundaries, monitoring, and performance. |
| TC7 Public launch engine | P7 and P11.1-P11.6 | P13, P20, P22 | G07-G09, G16, G19 | Functional signup/sales/legal/billing routes with replaceable content and media. |
| TC8 Staging, Closed Beta, and launch evidence | P10 and P11.7 | P23-P25 | G17-G21 | Full role/device matrix, rollback, 5-10 business beta, Go/No-Go, and release evidence. |
| Final visual/content pass | P6, P7, P9 presentation acceptance | P11-P22 affected surfaces | G13, G14, G19 | Apply approved brand, copy, prices, media, card artwork, and final visual polish without changing established semantics. |

P1 financial rules and P2 ledger integrity stay frozen unless the product owner
explicitly approves a policy change. Future loyalty modes, POS, wallet provider
activation, advanced referral rewards, AI recommendations, queues, webhooks, and
physical service split remain P12 demand-driven work unless separately promoted
into Launch V1 through the normal decision and gate process.

## 5. PR contract

Every implementation PR description must include:

- original Product phase/task;
- original Modernization phase;
- applicable gates and risk IDs;
- problem and technical outcome;
- included paths and explicit non-goals;
- database, auth, tenant, permission, entitlement, i18n, and public-card impact;
- focused and full automated evidence;
- browser/staging/manual evidence required or explicitly still open;
- rollout, compatibility path, rollback/forward-fix, and cleanup trigger;
- tracker update without overstating unmerged or unexecuted evidence.

One PR may contain presentation changes only when they are necessary for the
same slice's correctness, accessibility, or truthful state feedback. It may not
bundle a new visual direction.

## 6. Immediate sequence

1. Close TC0 by linking this overlay from the Master Delivery Tracker and
   recording the current local verification without claiming a merge.
2. Start TC1 with one small P5 / Modernization P4 domain-contract slice. It must
   have no schema change and no intended visual change.
3. Complete the first bounded TC2 catalog extraction using the compatibility
   adapter; do not mass-rewrite all copy in one PR.
4. Enter TC3 through the public membership/card contract: enforce customer-plan
   limits and referral entitlement on Join, preserve tenant/public privacy, and
   then consolidate card ownership in later separate slices.
5. Do not begin payment-provider activation, production recovery execution, or
   physical web/API deployment separation until the corresponding owner
   decisions and non-waivable gates are satisfied.

Local execution evidence on 2026-08-12: TC1.1, TC2.1, and TC3.1 completed in the
working tree as the first bounded TC1, TC2, and TC3 slices. TC1.1 activates
`@loyalflow/contracts/customers/public-membership`, types the existing
registration parser, and replaces duplicated Join query values with the same
stable problem-code values. TC2.1 activates `@loyalflow/i18n/common`, moves the
nine shared messages into separate English and Arabic sources with compile-time
and runtime key parity, and retains `lib/i18n/catalog.ts` as the compatibility
adapter with unchanged values and callers. TC3.1 enforces effective customer
plan limits inside the public Join write transaction, uses serializable
isolation to fail closed under concurrent enrollment, gates referral feedback,
writes, and public-card links by the canonical plan entitlement, and accepts
only an active same-tenant referral code. It adds only the bounded AR/EN
plan-limit state required for truthful feedback. Focused tests, 879/879 full
tests, TypeScript, workspace-boundary validation, `git diff --check`, ESLint
with 0 errors and 2 pre-existing warnings, and the Next.js 16.2.11 production
build pass. There is no schema, migration, visual-direction, direction-behavior,
commit, PR, Preview, Staging, merge, or deployment claim. The next bounded
overlay slice is TC3.2.

Local execution evidence on 2026-08-12: TC3.2 is now complete in the transferred
working tree as a no-schema card ownership consolidation slice. It adds the
transport-neutral `@loyalflow/contracts/cards/public-card` projection and one
pure adapter used by the public card page and additive public API contract;
`unitName` now owns current card semantics while stored `pointsName` values are
preserved read-only. Add Business exposes one Loyalty step and one Card Design
editor, and the zero-runtime-caller legacy card renderer was removed. Focused
tests, 882/882 full tests, TypeScript, workspace-boundary validation, ESLint
with 0 errors and 2 pre-existing warnings, and the Next.js 16.2.11 production
build pass. There is no schema, migration, database write, commit, PR, Preview,
Staging, merge, or deployment claim.

Merged execution evidence on 2026-08-12: PR #69 merged TC1.1, TC2.1, TC3.1,
and TC3.2 into `staging` with merge commit
`3f739dba9960ad6574385a8bfd5086276fc468e5`. Required PR checks passed and the
automatic Vercel `staging` Preview reached Ready for the same commit.
Authenticated Owner UAT for this PR was not completed because fixture creation
could not prove the database identity and protection-bypass requirements of the
fail-closed T007 guards. No fixture was created, and that UAT remains required
before Production.

TC3 Custom Card upload, storage, versioning, publishing, retention, and deletion
is `DEFERRED_PRODUCT_DECISION`. No Object Storage provider is selected or
connected, and no credential, schema, migration, or asset mutation is
authorized. Standard Card remains the only operational authoring path. Existing
Custom Card data and artwork references must be preserved without modification
or deletion. The deferred capability may resume only after the Object Storage
provider and retention/versioning/deletion policy are approved; deferral is not
completion or failure evidence.

TC4 audit evidence on 2026-08-12 is recorded in
[`TC4_TECHNICAL_COMPLETION_AUDIT.md`](./TC4_TECHNICAL_COMPLETION_AUDIT.md).
Completed account/auth foundations, validated business settings, deterministic
plan entitlements, and manual provider-neutral billing fields are present. TC4
pure foundation is implemented from the approved Launch V1 subscription
lifecycle contract without runtime or database integration. Persistence,
verified provider-event consumption, checkout, and provider activation remain
deferred and are not completion evidence for TC4.

TC5 decisions approved on 2026-08-12 select a same-origin Next.js BFF hosted in
the current Vercel application, current NextAuth sessions as the only protected
identity source, server-derived tenant/role/capability context, and path-based
`/api/v1` versioning. The first bounded TC5 slice adds pure transport-neutral
envelopes plus additive internal-foundation version/liveness reads. It does not
publish an external stability commitment, change legacy APIs, introduce an
independent backend, or include writes, schema, migrations, credentials, or
Production work. See
[`TC5_API_FOUNDATION_AUDIT.md`](./TC5_API_FOUNDATION_AUDIT.md).

The second bounded extraction is `GET /api/v1/business/summary`. Its tenant is
derived exclusively from the authenticated session, and its minimized DTO
contains business identity, loyalty-programme rules, and aggregate
customer/branch counts only. It adds no client tenant selector, write, schema,
migration, provider, credential, or Production change. See
[`TC5_READ_EXTRACTION_2_AUDIT.md`](./TC5_READ_EXTRACTION_2_AUDIT.md).

## 7. Technical Launch V1 definition

Technical completion requires all of the following before the final
presentation/content pass can be treated as the only remaining work:

- no browser/UI module owns Prisma access for migrated Launch V1 scopes;
- one authoritative domain policy and typed contract per critical behavior;
- permission plus plan entitlement parity in UI, API/action, and direct routes;
- separate AR/EN sources with key parity and passing RTL/LTR critical journeys;
- one canonical card projection/renderer, complete Join/recovery behavior, and a
  safe Custom Card asset lifecycle;
- approved and tested account, subscription, plan, billing, and payment state
  transitions;
- passing tenant, security, idempotency, concurrency, privacy, accessibility,
  browser/device, and performance gates;
- staged migration/restore/rollback evidence, active monitoring, successful
  Closed Beta, and explicit Go/No-Go;
- zero unaccepted P0/P1 launch risk and no claim based only on source tests.
