# LoyalFlow Full Project Pre-Final Audit — 2026-08-17

Status: `PRE_FINAL_AUDIT_BASELINE`

Repository baseline: `staging` at `966abba4014e167526a319f19652fd4c4426c937`

Environment boundary: Beta / isolated Staging only. Production was not changed, promoted, or used as evidence.

## Executive verdict

**The broad Beta is NOT closed under the Product Owner's requested definition of “all technical decisions, defects, and technical development finished.”**

The underlying technical Beta is mature: TC6 recovery is runtime-proven, the core loyalty flows have strong automated and browser evidence, tenant/role boundaries are established, database migrations are healthy, and the Custom Card geometry guard is merged. However, this audit found multiple real pre-final defects and migration residues that are not merely final visual choices.

The correct next phase is therefore **Pre-Final Beta Cleanup**, not Final Design/Commercial/Production yet.

### Blocking meaning

The following must be reconciled before declaring the broad Beta technically closed:

1. Fix confirmed P1/P2 functional, localization, tooling, and source-of-truth defects in this report.
2. Deploy a fresh isolated Staging release containing `966abba...` or a descendant and run the missing runtime interaction checks.
3. Complete the governed TC8 Real Closed Beta with 5–10 real businesses, privacy-safe issue disposition, and explicit human Go/No-Go.
4. Reconcile stale trackers so future work has one canonical source of truth.

## Audit method and evidence boundary

The audit used the exact current GitHub `staging` tree, targeted deep reads of high-risk source files, current Prisma schema, live read-only Neon Staging metadata, current Vercel deployment state/logs, existing unit/contract tests, and Playwright UAT coverage.

A local repository clone could not be obtained inside this execution environment because outbound DNS to GitHub was unavailable. Therefore this report does **not** pretend that a local AST/linter tool manually inspected every physical line. Instead, the full repository tree was inventoried and the highest-risk/authority paths were deeply traced through the GitHub connector. The latest source is also not currently deployed to the Staging alias, so an exhaustive visual/button runtime pass against the newest source is not yet truthful evidence.

This limitation is itself part of the exit plan: current-source Staging deployment plus a page/action interaction matrix is required before final Beta closure.

## Current verified platform state

- Current GitHub `staging`: `966abba4014e167526a319f19652fd4c4426c937`.
- TC6 integrated code and isolated-Staging runtime recovery proof: PASS.
- Synthetic TC6 proof fixtures were cleaned.
- Temporary TC6 proof route was removed after proof.
- PR #202 Custom Card dimension guard: merged; full GitHub validation PASS.
- PR #203 Final Beta reconciliation record: merged; full GitHub validation PASS.
- Current Vercel Staging alias still runs older source `791fd005f3ab69eae3eba62f2a5bc73f61107a6f`.
- Latest PR #202 branch Preview attempted a build but failed before application build because `DATABASE_URL` is required while Prisma config is loaded during `postinstall -> prisma generate`.
- Live Neon Staging migration audit: 48 migrations total, 48 finished/not rolled back, 0 incomplete, 0 rolled back.
- TC8 Real Closed Beta remains open in issue #204.

---

# Severity model

- **P0** — security/data-loss/tenant-isolation/blocking correctness issue; stop further release progression.
- **P1** — real functional/localization/runtime/tooling defect that must be fixed before broad Beta closure.
- **P2** — professional-quality, maintainability, IA, accessibility, performance, or migration debt that should be cleaned before Final/GA unless explicitly accepted.
- **P3** — final polish or optional optimization; may be handled in the Final Product phase.

No new P0 was confirmed by this audit so far. Several P1/P2 items were confirmed.

---

# Confirmed P1 findings — fix before broad Beta closure

## P1-01 — Custom Card dimension rejection can surface as an unhandled server error

**Area:** Custom Card / Server Actions / UX

The storage layer correctly calls `validateCustomCardArtworkPair()` before any Blob `put()`. That is the right authoritative safety boundary.

However, `uploadCustomCardArtworkAction()` only pre-checks `validateCustomCardArtwork()` (file object/type/size). A geometry mismatch therefore reaches `uploadCustomCardArtwork()`, which throws `CUSTOM_CARD_GEOMETRY_ERROR`. The action does not currently catch/map that geometry exception to the existing `?cardDesign=invalid-upload` experience.

**Impact:** invalid-dimension artwork is safely prevented from storage, but the user may receive a generic server failure instead of a controlled field/action error.

**Required fix:** catch the canonical geometry error at the action boundary, map it to a localized controlled result/redirect, and add an action-level test proving invalid geometry never becomes a 500.

## P1-02 — Standard Card Setup breaks Arabic parity

**Area:** AR/EN / UI / Onboarding / Card configuration

`StandardCardSetup` accepts a language prop but most visible strings are hard-coded English. Examples include “Card design”, “Standard”, “Custom Card”, “Brand colour”, “Theme”, “Approved business category”, “Custom artwork”, and safe-zone guidance.

Owner Onboarding invokes `StandardCardSetup` without a language prop, so the default is `EN` even inside an Arabic onboarding journey.

**Impact:** a major core setup step becomes mixed-language and violates the promised AR/EN product parity.

**Required fix:** move all visible Card Setup text/category labels/status text to canonical AR/EN copy, pass the active language from every caller, and add browser coverage for the Arabic Card step.

## P1-03 — Business Setup Wizard does not map/validate all authoritative fields step-by-step

**Area:** Super Admin Business creation wizard / UX / Validation

Final submission correctly uses the canonical `businessCreationSchema`, which protects persisted correctness. But per-step validation and `stepForField()` are partial and duplicated from the canonical model.

Some authoritative errors can therefore fall back to the wrong step or a generic message. Examples include several business/contact/address fields, owner fields, and billing/card fields.

**Impact:** server correctness is preserved, but the wizard can make the user complete several steps and then receive a generic final error or be returned to the wrong step.

**Required fix:** derive client step validation/mapping from a single field-to-step contract aligned with the canonical schema; add tests for every schema field and cross-field error.

## P1-04 — Owner Onboarding permits navigation to Review before prior-step validity is established

**Area:** Owner onboarding wizard / UX

Desktop and mobile section navigation call `transitionToStep(index)` directly. The authoritative launch action revalidates everything, so invalid data cannot create a Business; however, the UI can enter later steps/Review with earlier invalid data and then collapse to a generic incomplete redirect.

**Impact:** confusing wizard state and avoidable failure at launch.

**Required fix:** either prevent forward jumping past the first invalid step or validate all preceding steps before navigation; map launch errors back to the exact invalid step/field.

## P1-05 — Owner Onboarding server errors can appear in English inside Arabic UI

**Area:** AR/EN / Onboarding errors

`saveOwnerOnboardingAction()` returns English strings such as `Check the saved fields.` and the client displays `result.error` directly.

**Impact:** Arabic UX leaks English on validation/server errors.

**Required fix:** return stable error codes from server actions and localize at presentation boundary.

## P1-06 — Prisma code generation is unnecessarily coupled to `DATABASE_URL`

**Area:** CI / Vercel / Tooling

`package.json` runs `prisma generate` during postinstall. `prisma.config.ts` resolves `DATABASE_URL` through a config-time helper that throws if the variable is absent. As a result, branch Preview builds that do not have the Staging database variable fail during dependency installation before the application build even begins.

**Impact:** unrelated documentation/UI/code branches can fail Preview due to database configuration even though Prisma Client generation itself does not need a live database connection. This obscures real regressions and prevented fresh runtime verification of the latest source.

**Required fix:** decouple Prisma Client generation/config loading from mandatory runtime database connectivity while preserving fail-closed behavior for commands that actually require a database. Do not solve this by blindly copying Staging/Production secrets to every Preview branch.

---

# Confirmed P2 findings — pre-final cleanup / professional standards

## P2-01 — `actions-legacy.ts` remains a runtime-imported duplicate authority

**Area:** Customer mutations / architecture / over-code

`app/businesses/[slug]/customers/[customerId]/actions-legacy.ts` is a large legacy implementation containing old customer/profile/status/balance/referral/tag/note/earn/redeem logic. The modern `actions.ts` still imports the legacy module, despite canonical command/action files now existing for the current flows.

The Customer Detail page already uses canonical note actions, making the legacy dependency particularly suspicious.

**Impact:** duplicate authorities increase regression risk; a future import can accidentally revive old direct-provider or pre-command behavior.

**Required cleanup:** prove the import graph, move any still-needed compatibility export to a small canonical wrapper, delete obsolete implementations, and add an authority test that rejects new legacy mutation callers.

## P2-02 — Stale Beta trackers disagree with current implementation

**Area:** Delivery governance

`MASTER_DELIVERY_TRACKER.md` and `BETA_DEFERRED_REGISTER.md` predate significant TC5/TC6 work and can still describe already-completed work as deferred. `FINAL_BETA_RECONCILIATION_2026-08-17.md` is newer.

**Impact:** future implementation can be driven by stale plans and duplicate already-completed work.

**Required cleanup:** designate one canonical current-state document; mark older snapshots historical or update them from the final cleanup reconciliation.

## P2-03 — Settings accepts individually valid but country-inconsistent profile combinations

**Area:** Domain validation / Settings UX

Onboarding has `validateCountryProfile()` that checks supported country/currency/timezone combinations. Business Settings validates individual currency/timezone syntax but does not apply the same country-profile cross-field validation.

**Impact:** a Business can be created with one coherent country/timezone policy and later edited into a combination the onboarding flow would reject.

**Required cleanup:** share the same cross-field domain validation in Settings and improve the Settings UI to use guided country/currency/timezone controls instead of free text where practical.

## P2-04 — Notifications retain a known non-authoritative `Notification.isRead` column

**Area:** Database / migration residue

Current read semantics are user/business scoped via `NotificationReadState` and `NotificationItemRead`. The old `Notification.isRead` remains in schema and is explicitly treated as legacy/non-authoritative by the current logic.

**Impact:** two apparent read-state representations confuse future code and schema consumers.

**Required cleanup:** keep current authority explicit; plan removal/backfill only under a schema gate.

## P2-05 — Billing retains two visible state systems during compatibility migration

**Area:** Subscription/billing architecture

Legacy/manual `paymentStatus` coexists with persisted `subscriptionLifecycleState`. Current entitlement logic correctly uses lifecycle state and the old state is treated as a compatibility projection, so this is not an immediate correctness bug.

**Impact:** a developer or admin surface can still read the wrong state if the compatibility boundary is not obvious.

**Required cleanup:** document the authority explicitly in code/UI and create a dated exit plan for legacy payment-state projection before GA/payment-provider activation.

## P2-06 — Redundant database indexes

**Area:** PostgreSQL / Prisma schema

Live Staging metadata shows at least:

- `PlanConfiguration_plan_key` (UNIQUE on `plan`) plus `PlanConfiguration_plan_idx` on the same column.
- `CustomerTag_businessId_name_key` (UNIQUE on `(businessId,name)`) plus a non-unique index on the same pair.

A similar review is required for `PromotionApplication` transaction uniqueness because global unique plus composite unique may overlap depending on the intended FK/tenant invariant.

**Impact:** unnecessary write amplification/storage and schema noise.

**Required cleanup:** confirm query/FK requirements with `EXPLAIN`/constraint dependencies, then remove only proven-redundant indexes under an approved migration gate.

## P2-07 — Several core pages/components are oversized authority hotspots

**Area:** Maintainability / Server Components / React

Representative hotspots include Reports, Customer Detail, Customers, Business Overview, Users, Business Setup Wizard, Owner Onboarding Wizard, Standard Loyalty Card, and Standard Card Setup.

Large size itself is not a defect. The concern is mixed responsibility: authentication, query orchestration, policy resolution, formatting, analytics computation, and extensive JSX can live in one file.

**Recommended direction:** extract domain read models/view models and coherent page sections, but do not split files mechanically. Preserve Server Components and avoid adding client state just to reduce file size.

## P2-08 — Reports page has heavy database orchestration and needs measured scaling evidence

**Area:** Performance / Analytics

Reports executes many aggregate/groupBy/findMany/count operations, mostly in parallel, followed by additional lookup/trend queries.

**Strength:** filters are tenant/scoped and analytics math is server-derived.

**Risk:** as transaction/customer volume grows, the request can become DB-heavy.

**Required cleanup:** instrument query/request latency on realistic Beta data, identify the slowest queries, and only then consolidate/cache/precompute where evidence justifies it.

## P2-09 — Reports exposes Staff Performance twice in the same local context

**Area:** UX / information density

`ReportNavigation` already contains Staff Performance; the Reports action row then exposes another Staff Performance link.

**Impact:** redundant visual choice and unnecessary density.

**Recommendation:** keep one primary local-navigation representation unless user research shows a separate CTA materially improves discovery.

## P2-10 — Reversal Exceptions has inconsistent shell/navigation context

**Area:** IA / Reports / Operations

The nested route `/reports/reversal-exceptions` is a real operational follow-up queue linked from the unresolved-reversal metric. However:

- shell page-context mapping does not explicitly identify the nested route and can label it as Overview;
- it does not share the normal Reports local navigation;
- it shows the oldest 50 open records with no pagination/continuation interaction.

**Recommendation:** give it a correct shell title/context, decide whether it is a Reports sub-view or Operations queue, make local navigation consistent, and add pagination/continuation before larger cohorts.

## P2-11 — Topbar uses ARIA `menu` semantics without a complete menu keyboard model

**Area:** Accessibility

Topbar account/notification controls use `role="menu"`/`menuitem` and support click/outside/Escape, but do not implement the full focus/arrow-key behavior expected from a true application menu pattern.

**Recommendation:** either implement the complete menu-button keyboard/focus behavior or use simpler disclosure/navigation semantics that match the actual interaction.

## P2-12 — CSP is a good baseline but still broadly permissive for GA

**Area:** Security hardening

Good current controls include HSTS in production, frame denial, `nosniff`, referrer policy, COOP, Permissions-Policy, CSP base/object/form/frame restrictions, and disabling `X-Powered-By`.

Hardening debt:

- `script-src 'unsafe-inline'` remains outside development;
- broad `https:` / `wss:` connect and image allowances;
- committed `allowedDevOrigins` contains a developer-local IP (`192.168.100.107`).

**Recommendation:** clean local config artifacts and evaluate a nonce/hash-based CSP/explicit provider allowlist before GA, balancing Next.js dynamic-rendering implications.

## P2-13 — Some pages fetch a wider Business row than they need

**Area:** Data minimization / performance

Examples such as Customers and Business Overview use `findUnique`/`include` patterns that can hydrate the very wide Business model when a narrow select would be sufficient.

**Recommendation:** use explicit projection/read-model functions for page needs, especially where Business carries billing, card, provider, and social fields unrelated to the view.

## P2-14 — Settings page itself fetches the entire very-wide Business record

**Area:** Data minimization / maintainability

Settings genuinely needs many Business fields, but it still loads the complete row. A typed settings projection would make ownership explicit and prevent future schema fields from silently being pulled into every Settings request.

## P2-15 — Settings contains small AR copy leakage and UX inconsistency

Examples:

- `Instagram URL` is hard-coded English.
- timezone is a free-text field even though onboarding provides country-aware guided choices.

These are not severe, but they should be fixed as part of the same AR/profile-validation cleanup.

## P2-16 — Playbook localization is mixed at the data-model level

Playbook names mix English/Arabic in one string and summaries/suggestions are predominantly Arabic, while the page attempts language-sensitive surrounding copy but renders playbook catalog text directly.

**Impact:** English users can see Arabic-heavy playbook descriptions and Arabic users receive mixed names/suggestions.

**Recommendation:** make playbook catalog presentation fields locale-keyed instead of bilingual/mixed literals.

## P2-17 — Manual Google Sheets sync is still a direct provider operation by design

Automatic post-mutation syncs have been moved to the durable outbox/queue path. The explicit user-triggered manual Settings sync still calls the provider synchronously.

This was an intentional product/architecture decision, not an unnoticed regression. Before GA, decide whether manual sync is allowed to remain synchronous or should also become durable with immediate job status feedback. The decision must be explicit so there is one documented reliability model.

## P2-18 — Production data reset command should be break-glass, not normal operator ergonomics

The repository exposes a production-data reset script with safeguards. Even when guarded, destructive Production reset should eventually be placed behind an explicit break-glass operational procedure/workflow with strong confirmation/audit controls rather than remaining an ordinary package command.

---

# P3 / Final-phase candidates, not Beta blockers by themselves

- Final Standard Card visual composition, presets, colours, typography and art direction.
- Final dashboard visual hierarchy/density after real cohort feedback.
- Final chart styling and presentation system.
- Marketing media/copy polish.
- Final plan names/pricing/feature packaging.
- Payment provider activation and commercial checkout.
- Final legal/consent wording.
- Production domain/secrets/monitoring/launch authorization.

These must not be confused with the P1/P2 technical cleanup above.

---

# Page / journey audit matrix

This matrix records the audit stance for the major user-facing surfaces identified in the current App Router tree. `Runtime-proven` means existing Playwright evidence covers a meaningful interaction on that surface; it does not mean every control on the page has been clicked on the latest source.

| Surface | Current assessment | Main pre-final action |
|---|---|---|
| Login/Auth | Strong foundation; browser-tested critical login paths | retain auth/security regression suite |
| Dashboard / Business Overview | Functional and browser-covered; file/query hotspot | narrow Business projection; split read model/render sections where useful |
| Scan | Strong source and browser evidence | retain; test on latest Staging |
| Scan Customer Earn | Strong exact-once browser evidence | retain |
| Scan Customer Redeem | Strong browser evidence | retain |
| Customers list | Functional; broad Business fetch; large page | narrow data projection; add interaction matrix for filters/bulk actions |
| Customer detail | Functional but very large; legacy action residue nearby | eliminate duplicate legacy authority; extract coherent sections/read model |
| Activity | Core route present and used | latest-Staging interaction check |
| Reports overview | Feature-rich but oversized/DB-heavy | performance instrumentation, remove duplicate Staff CTA |
| Reports / Staff | Local navigation exists | latest-Staging interaction/filter/export check |
| Reports / Reversal Exceptions | Functional operational queue | fix shell/nav context; pagination/continuation decision |
| Rewards | Critical route browser-opened | full create/edit/toggle interaction check still required |
| Offers | Critical route browser-opened | full create/edit/toggle interaction check still required |
| Campaigns | Route/browser-open evidence | full builder/validation interaction check still required |
| Recovery (customer win-back) | IA logically belongs to Growth; manual messaging model clear | cohort usability + export/manual-action check |
| Branches | Core admin capability exists | create/edit/activate/staff-assignment interaction matrix |
| Team / Users | capability boundaries tested; large page | full admin-form interaction matrix |
| Settings | organized Profile/Operations/Integrations surface | cross-field country validation, localization cleanup, manual-sync decision |
| Program | economic-rule safety foundation exists | runtime form/confirmation/AR interaction matrix |
| Playbooks | bounded Quick Start feature; safe confirmation model | localize catalog; confirm discoverability/IA placement |
| Owner Onboarding | good mobile/focus foundation | prevent invalid forward jumps; localized error codes; AR Card Setup fix |
| Super Admin Business Setup | final schema is authoritative | complete step mapping/client validation; browser journey coverage |
| Standard Card | canonical renderer is strong | final visual decisions later |
| Custom Card | strong private/versioned lifecycle + new geometry guard | controlled geometry-error UX + fresh runtime proof |
| Public Card | previous synthetic/browser contract exists | latest-Staging public delivery/flip/AR-EN pass |
| Public Join | governed enrollment foundation exists | real-business cohort usability evidence |
| Notifications | user-specific authority is implemented | remove legacy schema later; keyboard semantics check |
| Operations/Admin | read/operational foundations exist | route-by-route final interaction/accessibility matrix |

---

# Component architecture assessment

## Strong components / patterns found

- QR scanner: robust camera initialization/fallback/switch/restart, cleanup, safe error mapping, manual fallback, busy states and AR/EN status messaging.
- Standard Loyalty Card: one canonical SVG renderer, fixed card canvas, bounded text behavior, RTL support, QR and safe-zone-oriented layout.
- Settings Profile/Operations forms: separate submission boundaries and pending/feedback states.
- Subscription entitlement runtime: explicit persisted-lifecycle authority and fail-closed write checks.
- TC6 integration path: durable outbox, lease ownership, retry ceiling, reconciliation heartbeat and runtime evidence.
- API v1 read foundation: same-origin, session-derived tenant authority, explicit method handling and safe envelopes.

## Hotspots to refactor carefully

Do not split these merely to chase line counts. Split by ownership boundaries:

- `business-setup-wizard.tsx`
- `owner-onboarding-wizard.tsx`
- `standard-card-setup.tsx`
- `standard-loyalty-card.tsx`
- Business Overview page
- Customers page
- Customer Detail page
- Reports page
- Users/Team page

Preferred refactor shape:

1. canonical domain validation/commands remain server-owned;
2. query/read-model helpers return minimal typed projections;
3. page component orchestrates permission + read model;
4. large UI sections become server components where possible;
5. client components remain only for interaction state.

---

# Database / persistence assessment

## Healthy evidence

- 48/48 Prisma migrations applied on isolated Staging.
- 0 incomplete migrations.
- 0 rolled-back migrations.
- strong use of business-scoped relations/composite uniqueness in core tenant models.
- durable IntegrationJob schema and operational proof exist.

## Cleanup / design debt

- wide `Business` aggregate mixes profile, loyalty, card, billing/subscription, integration and social concerns.
- legacy notification read flag remains beside authoritative per-user read state.
- legacy payment state remains beside lifecycle authority.
- proven/likely redundant indexes require dependency/query-plan review.
- consider DB-level economic invariants only after confirming correction/reversal semantics; do not add speculative CHECK constraints without a migration/product gate.

The wide Business model should **not** be split simply because it is wide. Split only if ownership, contention, privacy projection, or performance evidence supports it.

---

# AR / EN / RTL assessment

The project has meaningful AR/EN architecture and browser evidence; this is not superficial localization. RTL mobile Scan is browser-tested.

Confirmed gaps:

1. Standard Card Setup has substantial hard-coded English and is invoked without Arabic language in Owner Onboarding.
2. Owner Onboarding server error text can be English in Arabic UX.
3. Playbook catalog presentation is mixed-language at the source data level.
4. Settings has smaller English leakage such as `Instagram URL`.
5. Some server-side validation messages are English implementation text; presentation should consume stable error codes rather than raw messages.

Required principle before final closure: **server returns structured error codes; UI owns locale copy.**

---

# Button / form / interaction evidence assessment

The answer to “are all buttons proven to work?” is currently **no, not with sufficient evidence to make that claim**.

What is strong:

- Playwright covers real clicks for login/logout, simple/advanced navigation, core route access, role/tenant restrictions, Scan search, Earn, reload exact-once, Redeem, branch context, AR mobile Scan, Reports visibility, Super Admin context and owner-onboarding mobile Step 1.
- many source-level tests guard command ownership, field contracts, safe zones, rendering parity and server boundaries.

What is missing:

- the latest source is not deployed to the Staging alias;
- only a small set of browser specs exercise the full product;
- several UI tests are source-contract/static tests rather than live interaction tests;
- no truthful evidence yet clicks every material create/edit/toggle/delete/filter/export/upload/publish control across all major pages on the newest release.

## Required Pre-Final Interaction Matrix

On a fresh isolated Staging deployment, execute at minimum:

- Business Setup: every step, validation branch, back/next/jump/create.
- Owner Onboarding: AR + EN, desktop + mobile, save, invalid forward navigation, launch.
- Customers: search/filter/paging/create/edit/status/tag/bulk actions.
- Customer Detail: notes/referral/tag/balance/Earn/Redeem/reversal where authorized.
- Rewards: create/edit/activate/deactivate.
- Offers: create/edit/activate/deactivate.
- Campaigns: create/edit audience/message/validation paths.
- Recovery: audience switch/export/customer actions.
- Branches: create/edit/status/staff assignment.
- Team: invite/create/edit/access/status/security controls.
- Reports: all filters/date shortcuts/staff navigation/export/reversal queue.
- Settings: profile/operations/card details/integrations/manual sync/export permission/deletion guard.
- Program: rules, economic confirmation, messages, card design.
- Custom Card Super Admin: valid upload, invalid ratio, side mismatch, preview, publish, public front/back and flip.
- Notifications: open/mark/read/mark-all/read-state persistence and keyboard behavior.
- Public Join and Public Card: AR/EN/mobile.
- Session termination/logout-everywhere where applicable.

Any failure from this matrix becomes a Beta issue, not a Final Design preference.

---

# Professional standards verdict

## Strong

- Next.js App Router/server-first architecture is used appropriately in many paths.
- auth/tenant/capability checks are generally server-side.
- mutation safety includes transactions, idempotency, audit and entitlement checks in critical domains.
- critical loyalty exact-once/replay behavior is tested.
- migration integrity is healthy.
- security headers provide a meaningful baseline.
- AR/EN is a real product concern, not an afterthought.
- runtime TC6 recovery proof is stronger than CI-only evidence.

## Below desired pre-GA standard

- duplicate legacy mutation authority;
- mixed-language core setup UI;
- schema/tooling coupling causing irrelevant Preview build failures;
- incomplete wizard client error mapping;
- current-source runtime lag;
- insufficient exhaustive interaction evidence for the “every button works” claim;
- stale delivery sources of truth;
- accessibility menu semantics not fully matched to behavior;
- some IA/local-navigation inconsistencies;
- avoidable data over-fetching and large mixed-responsibility pages.

---

# Recommended execution order before Final Product work

## Cleanup Slice A — P1 correctness/UX/tooling

1. Custom Card geometry exception -> controlled localized action response.
2. StandardCardSetup complete AR/EN localization and language propagation.
3. Business Setup full schema-field-to-step validation contract.
4. Owner Onboarding forward-navigation validation + stable localized error codes.
5. Prisma/Vercel codegen env decoupling.

**Exit:** full tests/typecheck/lint/build + focused browser tests; fresh isolated Staging READY.

## Cleanup Slice B — Authority and source-of-truth cleanup

1. remove/isolate `actions-legacy.ts` duplicate implementations;
2. reconcile Master Tracker + Deferred Register + Final Reconciliation;
3. document subscription authority/legacy state exit;
4. document notification legacy-column exit;
5. resolve explicit manual Google Sheets sync reliability decision.

**Exit:** one canonical delivery truth and one canonical mutation authority per operation.

## Cleanup Slice C — UX/IA/accessibility/data quality

1. Reports duplicate actions + Reversal Exceptions context/navigation;
2. Settings cross-field country/timezone validation;
3. Playbook localization;
4. Topbar menu semantics/keyboard behavior;
5. narrow obvious Business over-fetches;
6. review redundant indexes and prepare gated migration only if proven safe.

## Cleanup Slice D — full interaction verification

Run the Pre-Final Interaction Matrix on the exact fresh Staging SHA.

## Cleanup Slice E — TC8 Real Closed Beta

5–10 real businesses, privacy-safe issue log, issue fixes/retests, explicit human GO/NO-GO.

Only after A–E pass should the project state become:

`BROAD_BETA_CLOSED_FINAL_PRODUCT_PHASE_READY`

---

# What remains intentionally for the Final Product phase

Once broad Beta cleanup and TC8 are complete, Final Product work can safely focus on choices rather than hidden technical repair:

- final card visual direction/presets;
- final page composition and design system polish;
- final brand/copy/media;
- commercial signup/trial/plans/pricing;
- payment provider and checkout;
- legal/privacy/analytics decisions;
- Production infrastructure, secrets, monitoring, backup/rollback and launch authorization.

This separation is the key audit outcome: **do not begin final visual/commercial decisions while the P1/P2 Beta cleanup list is still open.**

---

# Current audit conclusion

LoyalFlow is not a broken Beta. Its core technical foundation is comparatively strong and several critical systems are already proven beyond unit tests. But the audit found enough concrete functional, localization, tooling, migration and interaction-evidence gaps that a 100% broad-Beta closure claim would be inaccurate.

Next state: `PRE_FINAL_BETA_CLEANUP_REQUIRED`.
