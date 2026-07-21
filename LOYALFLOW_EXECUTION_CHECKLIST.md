# LoyalFlow Master Execution Checklist

Last audited: 2026-07-20 (Phase Z readiness audit and consolidated non-production UAT runbook prepared; execution remains pending)

## Current State

- **Current phase:** Phase Z — Consolidated non-production UAT and production-readiness audit.
- **Current task:** Execute the isolated browser UAT runbook, independently recheck the release database, and close the documented production configuration and recovery gates. No production deployment is authorized.
- **Modified source files:** analytics routes/helpers and reports, customer registration/segmentation helpers and views, transactional loyalty helpers, public self-signup, card-icon route, public/staff reward-progress consumers, lint/build/test configuration, and the test suite.
- **Retired tests:** The former business and customer tests referenced packages and schema fields that do not exist in LoyalFlow. They were replaced with a runnable Node test command and current shared-loyalty tests; broader Phase 1 coverage remains to be added.

## Verification Evidence

| Check | Status | Evidence |
| --- | --- | --- |
| TypeScript | [VERIFIED COMPLETE] | `npm run typecheck` passed again during the Phase Z audit on 2026-07-20. |
| ESLint | [VERIFIED COMPLETE] | `npm run lint` passed with no warnings again during the Phase Z audit on 2026-07-20. |
| Prisma schema | [VERIFIED COMPLETE] | `npx prisma validate` passed again during the Phase Z audit on 2026-07-20. |
| Prisma client | [VERIFIED COMPLETE] | `npx prisma generate` passed. |
| Prisma migration status | [DATABASE VERIFIED: 21 MIGRATIONS] [NO PHASE W/X/Y MIGRATION REQUIRED] [AGENT DATABASE VERIFICATION BLOCKED BY DNS] | The operator verified `loyalflow_test` is up to date through the offer migration. Phases W–Y add only disabled source-level foundations. |
| Local database verification | [DATABASE VERIFIED THROUGH PHASE T] [PHASE U/V/W/X/Y DATABASE VERIFICATION NOT REQUIRED: NO SCHEMA CHANGE] | Phases W–Y create no provider object, credential, JWT, event row, webhook delivery, billing record, or database schema. Actual provider/outbox/billing work needs separately approved integration and verification. |
| Production build | [SOURCE VERIFIED] | `npm run build` generated Prisma Client and produced the Next.js production build again during the Phase Z audit on 2026-07-20 using `--webpack`. |
| Automated tests | [SOURCE VERIFIED] | `npm run test` passes 123 unit tests, including wallet mapping, disabled-provider behavior, tenant-scoped event idempotency, and free-plan entitlement boundaries; rerun during the Phase Z audit. |
| Vercel deployment | [LINKED, BUILD UNVERIFIED] | `.vercel/repo.json` links this checkout to the `loyalflow` project and organization. `.vercel/project.json` is absent and no remote production build/log has been verified. No deployment was created. |
| Consolidated UAT | [RUNBOOK PREPARED] [UAT PENDING] | `docs/CONSOLIDATED_UAT_RUNBOOK.md` merges the remaining role, direct-route, tenant, loyalty, public-card, branch, and free-only foundation checks. Browser execution against isolated fixtures is still required. |
| Production readiness | [AUDIT PREPARED] [NOT RELEASE READY] | `docs/PRODUCTION_READINESS_AUDIT.md` records environment, security, database, Vercel, observability, and recovery gates without exposing credentials. |

## Phase Checklist

### Phase 0 — Codebase Stabilization [PARTIAL]

- [VERIFIED COMPLETE] Use the shared Prisma singleton in application routes; the only `new PrismaClient` is the intended singleton in `lib/prisma.ts`.
- [VERIFIED COMPLETE] Remove Pages Router patterns from the historical analytics route and scope it through `auth()` and the current business.
- [VERIFIED COMPLETE] Ignore stale `.claude/worktrees/**` in ESLint without excluding application source.
- [VERIFIED COMPLETE] Repair analytics aggregate and generated-client type handling.
- [VERIFIED COMPLETE] Repair the public card-icon authentication mismatch, remove its insecure fallback secret, and use the public token consistently with the card manifest.
- [VERIFIED COMPLETE] Consolidate card and self-signup link generation on the HTTPS-aware base-URL helper; the former duplicate helper could emit `http` for non-local forwarded hosts.
- [VERIFIED COMPLETE] Establish the Node test command and current shared-loyalty progress tests.
- [BLOCKED] Confirm database migration status against Neon.
- [BLOCKED] Run a production build in a non-sandboxed build environment and verify the linked Vercel deployment.

### Phase 1 — Core Loyalty End-to-End Verification [PARTIAL]

- [IMPLEMENTED BUT UNVERIFIED] Customer creation, QR/public token, loyalty earning, reward redemption, and balance adjustment server actions exist.
- [IMPLEMENTED BUT UNVERIFIED] The schema supports `VISITS`, `POINTS`, and `SALES_AMOUNT` loyalty modes, transactions, redemptions, and business activity.
- [VERIFIED COMPLETE] Shared progress, loyalty-mode, redemption, manual-adjustment, and tenant-role unit tests exercise the live shared services.
- [VERIFIED COMPLETE] Shared loyalty writes now include the tenant in their atomic customer predicate and verify the post-update customer tenant before creating transaction or activity records.
- [NOT STARTED] Database-backed tests for tenant isolation, transactional rollback, duplicate handling, and deactivation.
- [NOT STARTED] End-to-end owner, staff, and customer UAT against a verified database.

### Phase 2 — Reward Ready, Manual Adjustment, Activity Feed [IMPLEMENTED BUT UNVERIFIED]

- [IMPLEMENTED BUT UNVERIFIED] Redemption and manual-adjustment actions create transaction and activity records in database transactions.
- [IMPLEMENTED BUT UNVERIFIED] Business activity and notification UI routes/components exist.
- [IMPLEMENTED BUT UNVERIFIED] The staff redemption action now requires an explicit confirmation dialog before submission.
- [NOT STARTED] Database-backed verification of Reward Ready transitions, repeated redemption cycles, and activity-feed data.

### Phase 3 — Segmentation and Staff Permissions [PARTIAL]

- [IMPLEMENTED BUT UNVERIFIED] Current roles are `SUPER_ADMIN`, `OWNER`, and `STAFF`; central tenant-access helpers now protect customer actions and QR resolution.
- [VERIFIED COMPLETE] Shared access, management, owner, super-admin, and export predicates now protect customer/detail/scan, settings, activity, reports, exports, and team-management routes; their three-role behavior has unit coverage.
- [VERIFIED COMPLETE] Deterministic computed segments are shown on the customer list, filterable with database-backed relation filters, and counted on the business dashboard.
- [VERIFIED COMPLETE] The additive Manager/Viewer role migration and isolated staff-permission verifier passed on `loyalflow_test`; browser UAT remains pending.

### Phase 4 / Expanded Phase A — Analytics and Retention [VERIFIED COMPLETE, DATABASE UAT PENDING]

- [VERIFIED COMPLETE] Reports now include date-scoped returning-customer count, average loyalty activity, and redemption-rate KPIs alongside the existing operational report data.
- [VERIFIED COMPLETE] Historical analytics now returns real tenant-scoped daily customer, earned-loyalty, and redemption trends for an optional date range; trend aggregation has automated coverage.
- [VERIFIED COMPLETE] The owner reports page adds a segment filter to tenant-scoped customer, transaction, redemption, balance, and top-customer queries; all analytics/report/export date parsing uses one strict UTC validation utility.
- [VERIFIED COMPLETE] Owner reports now expose total customers, deterministic inactive-customer count, all-time average time to first reward, and sales-program average purchase amount through real tenant-scoped aggregates/grouping; first-reward calculations have focused unit coverage.
- [VERIFIED COMPLETE] Reports expose Today, last-7-days, last-30-days, and custom UTC date controls, plus explicit current-program and customer-segment filters. The current schema has one loyalty programme per business, so the programme filter preserves an explicit, forward-compatible selection without pretending there are unavailable programmes.
- [VERIFIED COMPLETE] Real tenant-scoped ranking queries now show most active customers, highest value earned, and most rewards redeemed for the selected range; the report also exposes an at-risk-customer KPI.
- [NOT STARTED] Database-backed report fixtures/UAT and business-approved visual chart requirements.

### Phase 5 — White Label and Card Experience [PARTIAL]

- [IMPLEMENTED BUT UNVERIFIED] Schema and settings support logo, colors, cover image, card language, contact data, reward labels, and messaging templates.
- [VERIFIED COMPLETE] The existing `cardDefaultLanguage` setting is now exposed in the owner form, Zod-validated, persisted through the audited settings action, and respected by public self-signup metadata and RTL/LTR layout.
- [NOT STARTED] Verify responsive/accessible RTL and LTR cards and implement safe template variants.

### Phase 6 — Customer Self-Service Foundation [PARTIAL]

- [VERIFIED COMPLETE] A business settings QR and public `/join/[slug]` page let a customer register only against an active business, with normalized phone validation, tenant-scoped duplicate prevention, an auditable `CUSTOMER_CREATED` event, and redirect to that customer's own public card.
- [VERIFIED COMPLETE] The public action applies a process-local 5-attempt / 15-minute limiter per business and client address; production should add an edge/platform backed limiter before treating this as full bot protection.
- [NOT STARTED] Database-backed self-signup tests for duplicate races, customer/card reachability, and Google Sheets failure behavior.
- [VERIFIED COMPLETE] The non-destructive customer-wallet design, compatibility constraints, safe rollout, and required authorization tests are documented in `docs/architecture/customer-wallet-foundation.md`; no identity-model change has been made.
- [SCHEMA DECISION] The existing customer model intentionally stores no email. Adding optional customer email needs an additive field, validation, duplicate/privacy policy, migration, and database-backed UAT; it is deferred to the customer-account/communication schema phase rather than collecting an unpersisted form value.

### Phase 7 — Campaigns and Referrals [PARTIAL]

- [IMPLEMENTED BUT UNVERIFIED] WhatsApp message template fields and utilities exist.
- [VERIFIED COMPLETE] A provider-independent, staff-reviewed campaign suggestion engine now supports Welcome, balance-updated, reward-ready, and one-action-away handoffs without sending messages automatically or adding a paid provider.
- [VERIFIED COMPLETE] The required additive campaign-event/delivery and referral schema, idempotency, tenant, and anti-abuse design is documented in `docs/architecture/campaigns-referrals-foundation.md`.

### Phase 8 — Multi-Branch Foundation [SOURCE VERIFIED, DATABASE VERIFIED, UAT PENDING]

- [VERIFIED COMPLETE] Additive `Branch` and `BranchStaffAssignment` schema, optional operational `branchId` references, tenant/role branch-access helpers, and optional atomic loyalty write context preserve all single-location behaviour and historical records.
- [DATABASE VERIFIED] The operator applied `20260720240000_add_multi_branch_foundation` to `loyalflow_test`; migration status and `npm run verify:local-multi-branch` passed.
- [UAT PENDING] Browser checks cover branch assignment, inactive branch write blocking, branch-scoped history/reporting, and unassigned historical activity.

### Phase 9 — Security, Fraud Protection, and Production Readiness [PARTIAL]

- [IMPLEMENTED BUT UNVERIFIED] JWT auth, activity logs, security headers, health route, and a process-local public self-signup limiter exist.
- [VERIFIED COMPLETE] Loyalty earning and reward redemption now combine short process-local limiters with tenant/customer/actor/value-scoped recent-transaction lookups to prevent accidental rapid duplicate submissions; they leave the original transaction/audit writes intact.
- [VERIFIED COMPLETE] Customer transaction history visibly flags manual adjustments whose absolute value reaches one full reward threshold, while retaining the actor, reason, amount, timestamp, balance-after, and audit record.
- [VERIFIED COMPLETE] QR scanning uses a shared strict public-card-token parser, covered for raw tokens, exact card URLs, malformed tokens, and non-card routes.
- [VERIFIED COMPLETE] A static App Router audit found no Pages Router APIs, no deprecated `next-connect` imports, and no Prisma instantiation outside the shared singleton.
- [VERIFIED COMPLETE] The actual required environment variables, deployment gate, and current database-connectivity blocker are documented in `docs/ENVIRONMENT.md` and the commit-safe `.env.example` template.
- [VERIFIED COMPLETE] A role-scoped UAT procedure with tenant-isolation, duplicate-operation, public-card, migration, and deployment evidence gates is documented in `docs/UAT_CHECKLIST.md`.
- [NOT STARTED] Full tenant-isolation/security review, fraud safeguards, linked Vercel verification, and final UAT.

## Expanded Delivery Roadmap

Status is deliberately split between workspace verification and database/UAT verification. No item below authorizes a destructive migration, production deployment, paid connector, or automatic customer message.

Gate meanings: **[SOURCE VERIFIED]** is local static/unit/build evidence; **[LOCAL DATABASE VERIFICATION PENDING USER EXECUTION]** requires the operator's reachable `loyalflow_test` terminal; **[AGENT DATABASE VERIFICATION BLOCKED BY DNS]** is limited to this sandbox; **[UAT PENDING]** requires a browser run against isolated non-production data.

| Phase | Scope | Status | Evidence / next gate |
| --- | --- | --- | --- |
| A | Analytics and retention | [SOURCE VERIFIED] [LOCAL DATABASE VERIFICATION PENDING USER EXECUTION] [AGENT DATABASE VERIFICATION BLOCKED BY DNS] [UAT PENDING] | Scoped KPIs, period/programme/segment controls, at-risk metric, and rankings pass local checks. |
| B | Multi-reward system | [SOURCE VERIFIED] [LOCAL DATABASE VERIFICATION PENDING USER EXECUTION] [AGENT DATABASE VERIFICATION BLOCKED BY DNS] [UAT PENDING] | Tenant-bound create/edit/activate/deactivate catalogue, selected active-reward redemption, activity/redemption linkage, and legacy fallback are implemented. |
| C | Reward Ready polish | [SOURCE VERIFIED] [LOCAL DATABASE VERIFICATION PENDING USER EXECUTION] [AGENT DATABASE VERIFICATION BLOCKED BY DNS] [UAT PENDING] | The customer view shows progress, eligibility, descriptions, promo codes, confirmation, and repeatable redemption for every active catalogue reward. |
| D | Unified customer timeline | [SOURCE VERIFIED] [LOCAL DATABASE VERIFICATION PENDING USER EXECUTION] [AGENT DATABASE VERIFICATION BLOCKED BY DNS] [UAT PENDING] | Customer detail combines lifecycle events and transactions chronologically without redundant operation rows, preserving actor, timestamp, reason, amount, and balance-after. |
| E | Advanced segmentation | [SOURCE VERIFIED] [LOCAL DATABASE VERIFICATION PENDING USER EXECUTION] [AGENT DATABASE VERIFICATION BLOCKED BY DNS] [UAT PENDING] | Existing five segments are retained; Reward Ready, High Spender (sales only), and Frequent Visitor (visit/points only) are centralized, deterministic, tested, and wired into customer filters, dashboard counts, and reports. Campaign audience expansion remains. |
| F | Retention score | [SOURCE VERIFIED] [LOCAL DATABASE VERIFICATION PENDING USER EXECUTION] [AGENT DATABASE VERIFICATION BLOCKED BY DNS] [UAT PENDING] | A deterministic, staff-visible 0–100 score uses recency, frequency, sales-or-loyalty value, progress, and redemption history with tested boundaries; it is explicitly not AI. |
| G | Retention and customer value dashboard | [SOURCE VERIFIED] [BUILD VERIFIED] [LOCAL DATABASE VERIFICATION PENDING USER EXECUTION] [AGENT DATABASE VERIFICATION BLOCKED BY DNS] [UAT PENDING] | Reports use immutable per-transaction mode provenance; lifecycle segment counts are consistently scoped and recovered customers are distinct customers, not activity-event totals. |
| H | ROI / impact dashboard | [SOURCE VERIFIED] [BUILD VERIFIED] [LOCAL DATABASE VERIFICATION PENDING USER EXECUTION] [AGENT DATABASE VERIFICATION BLOCKED BY DNS] [UAT PENDING] | Reports present recorded operational metrics and sales-only tracked loyalty sales under an explicit non-attribution disclaimer. |

### Phase G/H Verification Matrix

| Gate | Status | Evidence |
| --- | --- | --- |
| Tenant isolation | [SOURCE VERIFIED] | Every Phase G/H aggregate is constrained by `businessId`; selected segments pass through tenant-scoped customer relations. |
| Empty datasets | [SOURCE VERIFIED] | Aggregate nulls fall back to zero; first-reward and visit-interval helpers return an explicit empty state. |
| Date range | [SOURCE VERIFIED] | Strict inclusive UTC parser is covered by tests and scopes period queries. |
| VISITS / POINTS / SALES_AMOUNT | [SOURCE VERIFIED] | Future earned records persist an immutable source loyalty mode. Visits/intervals are VISITS-only; purchase/spend metrics require SALES_AMOUNT plus a recorded sale amount; points retains non-monetary loyalty metrics. Historical records without provenance are intentionally excluded from spend/visit metrics. |
| No redemptions / lifecycle counts | [SOURCE VERIFIED] | Redemption aggregate defaults safely; recovered customers are grouped by customer ID and inactive/at-risk counts intersect the selected tenant segment. |
| Impact disclaimer | [SOURCE VERIFIED] | The impact section states that figures are recorded activity, not revenue attribution or causation. |
| Database verification | [LOCAL DATABASE VERIFICATION PENDING USER EXECUTION] [AGENT DATABASE VERIFICATION BLOCKED BY DNS] | Run `npm run verify:local-db` from the operator's `loyalflow_test` terminal. It guards identity, checks the reviewed 13-migration history, uses isolated fixtures, and self-cleans. |
| End-to-end UAT | [UAT PENDING] | Requires a browser run against isolated `lf-uat-*` tenant data after the guarded database harness passes. |
| I | Loyalty promotions engine | [SOURCE VERIFIED] [DATABASE VERIFIED] [PROMOTION DATABASE VERIFICATION VERIFIED] [UAT PENDING] | The operator verified the 15-migration schema and the corrected isolated promotion verifier. Browser UAT remains required; production deployment has not been performed. |
| J | VIP tiers | [SOURCE VERIFIED] [DATABASE VERIFIED NOT REQUIRED] [UAT PENDING] | Central deterministic read-only Bronze/Silver/Gold/Platinum qualification is implemented and unit-tested. It changes no balance, reward, permission, or earning behavior; a persisted benefits design remains later work. |
| K | Reward expiration | [SOURCE VERIFIED] [DATABASE VERIFIED] [UAT PENDING] [PRODUCTION DEPLOYMENT NOT PERFORMED] | The operator applied `20260720210000_add_reward_expiration` to `loyalflow_test`; migration status and `npm run verify:local-reward-expiration` passed. Optional per-reward duration, deterministic UTC expiry, one live unlock, staff/card state, expired-redemption blocking, activity evidence, and legacy behavior are verified. |
| L | Lost customer recovery | [SOURCE VERIFIED] [UAT PENDING] | Owners/super-admins get deterministic inactive/at-risk audiences, preview/copy and `wa.me` handoffs, plus the existing permission-scoped CSV safeguard. There is no automatic send, paid SMS, or WhatsApp API. |
| M | Campaign builder lite | [SOURCE VERIFIED] [UAT PENDING] | Owner/super-admin campaign composer provides deterministic tenant-only audience selection, trigger templates, optional staff-authored offer text, per-customer preview/copy and `wa.me` handoff. It deliberately does not persist/send/schedule events; delivery persistence still needs consent/quiet-hours design. |
| N | Referral program | [SOURCE VERIFIED] [DATABASE VERIFIED] [UAT PENDING] [PRODUCTION DEPLOYMENT NOT PERFORMED] | The operator applied `20260720220000_add_referral_program` to `loyalflow_test`; migration status and `npm run verify:local-referrals` passed. Referral incentives/rewards remain intentionally disabled pending commercial policy. |
| O | Advanced staff permissions | [SOURCE VERIFIED] [DATABASE VERIFIED] [UAT PENDING] [PRODUCTION DEPLOYMENT NOT PERFORMED] | The operator applied `20260720230000_add_manager_and_viewer_roles`; migration status and `npm run verify:local-staff-permissions` passed on `loyalflow_test`. |
| P | Multi-branch foundation | [SOURCE VERIFIED] [DATABASE VERIFIED] [UAT PENDING] [PRODUCTION DEPLOYMENT NOT PERFORMED] | The operator applied `20260720240000_add_multi_branch_foundation`; migration status and `npm run verify:local-multi-branch` passed on `loyalflow_test`. No default branch or historical rewrite is performed. |
| Q | Customer notes and tags | [SOURCE VERIFIED] [DATABASE VERIFIED] [UAT PENDING] [PRODUCTION DEPLOYMENT NOT PERFORMED] | The operator applied `20260720250000_add_customer_notes_and_tags`; migration status and `npm run verify:local-customer-notes-tags` passed on `loyalflow_test`. Public cards/API do not select the metadata. |
| R | Duplicate customer management | [SOURCE VERIFIED] [DATABASE VERIFIED NOT REQUIRED] [UAT PENDING] [PRODUCTION DEPLOYMENT NOT PERFORMED] | Owner/Manager-only, tenant-scoped review detects normalized phone, future email, and code signals without any write. A non-executable preview nominates the oldest candidate only; merge/delete/transfer behaviour is deliberately disabled pending approved ledger and public-token policy. |
| S | Bulk customer operations | [SOURCE VERIFIED] [DATABASE VERIFIED] [UAT PENDING] [PRODUCTION DEPLOYMENT NOT PERFORMED] | The operator ran `npm run verify:local-bulk-customer-operations` successfully on `loyalflow_test`. Owner/Manager selection is limited to the visible filtered page. Atomic activate/deactivate and add/remove-tag operations validate every ID before writes, create activity rows, and require confirmation for deactivate/remove. Selected export retains existing owner export policy; selected campaign handoff retains the manual owner-only campaign policy. No job, provider, or migration is added. |
| T | Offers | [SOURCE VERIFIED] [DATABASE VERIFIED] [UAT PENDING] [PRODUCTION DEPLOYMENT NOT PERFORMED] | The operator applied `20260720260000_add_customer_offers`; `loyalflow_test` reports 21 migrations up to date and `npm run verify:local-offers` passed. Additive tenant-scoped Offers are explicitly separate from rewards, promotions, campaigns, balances, and transactions. Birthday and branch targeting remain intentionally deferred because the current public card has neither a persisted birthday nor a safe branch context. |
| U | Business playbooks | [SOURCE VERIFIED] [DATABASE VERIFIED NOT REQUIRED] [UAT PENDING] [PRODUCTION DEPLOYMENT NOT PERFORMED] | Accepted source verification: static Barber, Coffee Shop, Salon, Retail, Gym, and Restaurant previews write only normal Business defaults plus one activity record, atomically and only after explicit confirmation. Existing configured businesses are protected until a second explicit overwrite confirmation. Promotion, offer, VIP, recovery, and campaign content is suggestion-only; no related record, provider, or industry-specific runtime path is created. |
| V | Customer wallet foundation | [SOURCE VERIFIED] [DATABASE VERIFIED NOT REQUIRED: NO SCHEMA CHANGE] [UAT PENDING] [PRODUCTION DEPLOYMENT NOT PERFORMED] | The current `Customer` remains a tenant-local loyalty membership. Architecture documentation and executable guards prohibit automatic phone/token/name linking, public-card enumeration, unverified access, revoked membership access, and identity-conflict linking. No global identity, customer authentication, claim flow, wallet UI, migration, or cross-business data access is introduced pending explicit identity/consent/recovery approval. |
| W | Google Wallet readiness | [SOURCE VERIFIED] [DATABASE VERIFIED NOT REQUIRED: NO SCHEMA CHANGE] [UAT PENDING] [PRODUCTION DEPLOYMENT NOT PERFORMED] | A disabled provider-neutral mapping derives a single tenant-scoped membership pass representation from the existing public-card source of truth. It stores/mutates no balance, creates no provider pass/JWT/API request, and validates branding, HTTPS card URLs, offers, reward state, and all loyalty modes. Actual Google Wallet issuer/Class/Object/JWT/secret-manager integration is deferred pending credentials and production approval. |
| X | Internal events / webhook foundation | [SOURCE VERIFIED] [DATABASE VERIFIED NOT REQUIRED: NO SCHEMA CHANGE] [UAT PENDING] [PRODUCTION DEPLOYMENT NOT PERFORMED] | A pure in-process event envelope has tenant-scoped deterministic idempotency keys and rejects unsafe identifiers/cross-tenant consumers. Existing BusinessActivity remains the audit trail. No event row/outbox, queue, webhook, HTTP request, provider call, background worker, or customer message is created; delivery is explicitly `NOOP_DISABLED` until a separately approved durable outbox/webhook design. |
| Y | Feature entitlements foundation | [SOURCE VERIFIED] [DATABASE VERIFIED NOT REQUIRED: NO SCHEMA CHANGE] [UAT PENDING] [PRODUCTION DEPLOYMENT NOT PERFORMED] | A central `FREE`-only feature entitlement catalogue grants current capabilities without billing, payments, remote plan state, paid dependency, or provider activation. Entitlement can never bypass permission, credential, or production/provider gates. |
| Z | Consolidated non-production UAT / production readiness | [RUNBOOK PREPARED] [SOURCE VERIFIED] [DATABASE RECHECK PENDING] [PARTIAL AUTOMATED UAT: R-01/S-01 PASS] [27 BROWSER/DIRECT-ROUTE ROWS MANUAL UAT REQUIRED] [PRODUCTION DEPLOYMENT NOT PERFORMED] | The agent found no installed E2E framework or usable local browser, and its sandbox cannot reach the operator's `localhost:3000`. `npm run test` (123) and Prisma validation pass, covering the source-boundary Wallet/Event/Entitlement rows only. The retained fixture run `e696d3476d` and all browser/session/API rows remain unverified; see `docs/CONSOLIDATED_UAT_RUNBOOK.md`. |

## Known Risks and Blockers

- This agent's configured Neon hostname still cannot be resolved (`ENOTFOUND`), but the operator's local terminal is the approved database-verification surface. Use the guarded local harness; do not treat the sandbox DNS issue as a product blocker.
- The workspace is linked to the LoyalFlow Vercel project through `.vercel/repo.json`, but has no `.vercel/project.json` or verified remote production build/log.
- Database-backed integration and authorization coverage remains required before Phase 1 can be verified complete.
- Phase K's reviewed additive migration is verified on `loyalflow_test`. Browser UAT remains the required customer/staff visual gate; no production deployment has been performed.
- Phase N's additive referral migration is verified on `loyalflow_test`; its browser UAT remains pending and no referral incentive is enabled.
- Phase R has no migration and performs no database writes. Browser UAT must confirm its read-only role/tenant boundaries and that no merge control or data transfer exists.
- Phase T's reviewed offer migration is database verified on `loyalflow_test`; its browser UAT remains pending. Phases U–Y add no migration and remain subject to consolidated browser UAT before production readiness. A real customer wallet is intentionally blocked on approved identity, consent, verification, recovery, and additive-schema decisions. Google Wallet provider activation is separately blocked on issuer/API/service-account/origin/secret-management approval. Event delivery and billing are deliberately unimplemented pending separate durable-outbox/webhook and commercial-policy approvals.
- No production deployment, destructive database operation, or paid dependency has been introduced by this work.
- Browser execution in this agent environment is policy-blocked for the local application URL. This is an agent-environment limitation, not UAT evidence; execute the consolidated manual runbook in an approved non-production browser session.
- Production backup/restore ownership, RPO/RTO, and restore-drill evidence are not documented. This is a release blocker even after UAT passes.
