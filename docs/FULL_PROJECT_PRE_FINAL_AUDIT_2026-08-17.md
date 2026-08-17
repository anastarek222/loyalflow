# LoyalFlow Consolidated Pre-Final Audit — 2026-08-17

Status: `PRE_FINAL_BETA_CLEANUP_REQUIRED`

Baseline: `staging@966abba4014e167526a319f19652fd4c4426c937`

Boundary: Beta / isolated Staging only. No Production, schema, environment, provider credential, or participant-data changes were made.

## Verdict

The broad Beta is **not closed** under the Product Owner definition that all technical decisions, defects and technical development must be finished before Final Product work.

This document reconciles the original LoyalFlow audit with two additional audits supplied by the Product Owner. Every new material claim was checked against current source/runtime evidence before inclusion. Stale, overstated, unmeasured and proposal-only claims are separated below.

The core platform remains strong: auth/tenant boundaries, loyalty integrity, subscription authority, migrations, durable integration recovery, critical Scan/Earn/Redeem paths and CI discipline. The remaining work is bounded pre-final cleanup, not a rewrite.

## Confirmed P1 — must fix before broad Beta closure

### P1-01 — Fake phone/address values in saveable Settings fields

When `business.contactPhone` or `business.address` is null, Settings supplies real-looking Egyptian fallback values (`01033196610` and a Faisal/Mariouteya address) to `CardBusinessDetailsForm` as editable default values. Saving can persist data that never belonged to the business.

**Fix:** null must render empty; examples belong only in placeholders/help text. Add a regression test proving empty persisted data never submits examples. Sweep other forms for real-looking fallback data.

### P1-02 — Custom Card has dual write authorities

Program still imports Custom Card upload/publish actions from `settings/actions.ts`, while dedicated command-bound actions already exist under `program/custom-card-*-action.ts`.

**Fix:** rewire Program to the dedicated command actions, prove the caller graph, delete old upload/publish implementations after zero-caller proof, and add an authority/import-boundary test.

### P1-03 — Custom Card geometry rejection lacks controlled UX on the active old path

Storage correctly validates geometry before Blob write, but the old upload action can let a geometry exception escape instead of mapping it to the normal localized validation result.

**Fix:** migrate to the command action and map canonical geometry errors to stable localized codes. Test wrong ratio/side mismatch = no 500, no Blob write, correct message.

### P1-04 — Standard Card Setup breaks Arabic parity

`StandardCardSetup` has substantial hard-coded English copy and Owner Onboarding invokes it without consistently propagating active language.

**Fix:** canonical AR/EN copy for every visible string/category/status; require language at every caller; add Arabic browser coverage for the card step.

### P1-05 — Activity and Branches remain materially Arabic-only

Current Activity and Branches surfaces still contain substantial user-facing Arabic literals/status/error copy rather than the newer bilingual presentation pattern.

**Fix:** migrate them to canonical `AppLanguage`/locale copy and locale-aware dates/numbers; add AR+EN browser checks. Use Scan/Recovery/Offers as the existing standard rather than redesigning.

### P1-06 — Business Setup Wizard validation can drift from authoritative schema

Final submit uses the canonical creation schema, but step validation and field-to-step mapping are independently maintained and incomplete.

**Fix:** one canonical field-to-step contract aligned with shared schemas/domain validation. Cover every field and cross-field error; do not maintain two rule sets.

### P1-07 — Owner Onboarding allows invalid forward jumps and raw-language server errors

Section navigation can jump ahead before prior steps are valid. Server validation protects persistence, but Review/Launch UX can fail generically. Save errors can expose raw English inside Arabic UI.

**Fix:** validate preceding steps before forward navigation (or explicitly make the flow non-linear), return stable server error codes, localize in UI, and focus the exact invalid field.

### P1-08 — Prisma codegen is coupled to `DATABASE_URL`

Current Vercel Preview evidence fails during `postinstall -> prisma generate` with `PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL`, before application build.

**Fix:** decouple Prisma Client generation/config loading from mandatory live DB connectivity while keeping DB-dependent commands fail-closed. Do not copy Staging/Production DB secrets blindly to Preview branches.

### P1-09 — Optional Google Sheets configuration is treated as retryable failure

`.env.example` defines Sheets as optional, but `GoogleSheetsConfigurationError` falls through to retryable `UNEXPECTED_ERROR`. Automatically enqueued jobs can therefore retry an intentionally disabled/unconfigured integration.

**Fix:** explicit `DISABLED/NOT_CONFIGURED/CONFIGURED` integration state. Do not enqueue when disabled, or finish deterministically as skipped/non-retryable. Retry only transient provider/network failures.

## Release blocker — source/runtime parity

Current GitHub Staging is `966abba...`; newest READY Staging deployment found is older `791fd005...`. Newer Preview builds are blocked by P1-08. Therefore the newest source is not yet runtime-certified and “every button works” cannot truthfully be claimed.

**Exit:** after P1 cleanup, deploy the exact cleaned SHA to isolated Staging and run the interaction matrix below.

## Confirmed P2 — pre-final/professional cleanup

1. **Customer `actions-legacy.ts` duplicate authority.** Build caller map, migrate remaining callers, shrink/delete legacy implementation, add import-boundary guard.
2. **Stale delivery trackers.** Establish one canonical current-state tracker; mark older snapshots historical.
3. **Settings country/currency/timezone inconsistency.** Reuse the same cross-field `validateCountryProfile` policy as Onboarding/Super Admin setup.
4. **Legacy notification read field.** Per-user read-state tables are authoritative; plan old `Notification.isRead` removal only under schema gate.
5. **Legacy billing state.** `subscriptionLifecycleState` is authoritative; document and schedule exit from compatibility `paymentStatus` before GA/payment activation.
6. **Overlapping indexes.** Confirm query/FK dependencies and `EXPLAIN` first; remove only proven redundancy under migration gate.
7. **Mixed-responsibility hotspots.** Reports, Customer Detail, Customers, Business Overview, Team, Business Setup, Owner Onboarding and Card Setup should be split by ownership/read-model boundaries, not line count.
8. **Reports DB orchestration.** Instrument realistic data first; optimize only measured slow queries.
9. **Reports duplicate Staff destination.** Keep one local-navigation/CTA representation unless research supports both.
10. **Reversal Exceptions IA.** Fix shell title/local nav, decide Reports vs Operations ownership, and add continuation/pagination beyond the first 50.
11. **Topbar ARIA menu semantics.** Implement full keyboard/focus menu behavior or use simpler disclosure semantics.
12. **CountrySelector accessibility/i18n.** Complete ArrowUp/Down active-option semantics/`aria-activedescendant` or use a proven accessible primitive; localize the English search placeholder.
13. **Residual i18n debt.** Team/Reports are not Arabic-only, but still have residual mixed literals/formatters. Settings and Playbooks also leak mixed copy. Server returns codes; UI owns locale copy.
14. **Wide Business reads.** Use typed minimal projections where justified; do not split the DB model just because it is wide.
15. **Semantic-token inconsistency.** Migrate older direct palette/status classes to the established token system during page cleanup; no redesign required.
16. **Manual Sheets sync model.** Explicitly decide whether the user-triggered Settings sync stays synchronous or moves to durable-job status.
17. **CSP/dev-origin hardening.** Remove local `allowedDevOrigins` residue and evaluate narrower CSP/nonce-hash policy before GA; not a current P0.
18. **Production reset ergonomics.** Move destructive Production reset behind a break-glass procedure with restricted permission, confirmation and audit evidence before launch.

## Email delivery — required UAT gate, not a proven current outage

Password Reset and Email Verification code deliberately throws `NOT_CONFIGURED` when Resend/sender values are absent, and `.env.example` describes email delivery as optional. Recent retained Staging runtime logs checked during reconciliation did not prove a current `NOT_CONFIGURED` outage.

Do **not** label email as currently broken without runtime proof. Before Beta exit, either configure and UAT reset/verification delivery, expiry and replay protection, or explicitly scope those journeys out of the Closed Beta.

## Claims rejected or downgraded after verification

- **“Security side tables lack User FKs.”** Rejected as a broad current claim: current `SecurityNotification` has a cascading User relation.
- **“Team is Arabic-only.”** Overstated: it resolves active language and has substantial bilingual copy; only residual leakage remains.
- **“Reports/Staff Reports are Arabic-only.”** Overstated: substantial bilingual logic exists; residual copy/formatter debt remains.
- **“Current standalone Duplicates page is Arabic-only.”** Claimed route was not verified in current structure; do not fix a stale route.
- **“Email is currently NOT_CONFIGURED.”** Possible code state, not proven current runtime outage.
- **“CountrySelector definitely bloats the bundle.”** Plausible but unmeasured; run bundle analysis first.
- **“Large file = bug.”** Rejected. Refactor only mixed ownership/testability/measured performance.
- **Exact dependency pinning is mandatory.** Downgraded to release-freeze policy; the lockfile already provides reproducible resolution.
- **Move Customer Card, force Customer Detail tabs, force Add Customer modal.** Product/IA proposals, not confirmed correctness defects.
- **Queue beta naming alone is a defect.** Provider maturity is a release-risk decision, not a present failure without deprecation/support evidence.

## Exact-SHA interaction matrix required before closure

Run on the exact cleaned READY Staging SHA:

- Business Setup: all steps, validation branches, back/next/jump/create.
- Owner Onboarding: AR/EN, desktop/mobile, save, validation, card step, launch.
- Customers: search/filter/paging/create/edit/status/tags/bulk/export.
- Customer Detail: notes/tags/referral/balance/Earn/Redeem/reversal by role.
- Rewards / Offers / Campaigns: all material create/edit/status/validation actions.
- Recovery: audience switch/export/manual actions.
- Branches: create/edit/status/staff assignment in AR/EN.
- Team: invite/create/edit/access/status/password/security controls.
- Reports: filters/dates/branch/staff/export/reversal queue.
- Settings: profile/operations/card details/integrations/manual sync/export permission/danger guards.
- Program: rules/economic confirmation/messages/Standard Card/Custom Card.
- Custom Card: valid upload, bad dimensions, side mismatch, preview, publish, public front/back/flip.
- Notifications: open/read/mark-all/persistence/keyboard behavior.
- Public Join/Public Card: AR/EN/mobile.
- Password reset/email verification if in scope/configured.
- Logout everywhere/session termination.
- No unexpected console/page errors.

Any failure becomes a Beta issue, not a Final-design preference.

## Execution order

### Slice A — P1 correctness/tooling
Fake Settings data -> Custom Card authority/error handling -> Card Setup AR/EN -> Activity/Branches AR/EN -> Business Setup validation -> Owner Onboarding -> Prisma/Vercel coupling -> Sheets disabled/retry semantics.

### Slice B — authority/source of truth
Legacy customer actions -> canonical tracker -> notification/payment compatibility exits -> manual Sheets decision.

### Slice C — UX/a11y/data/performance
Settings cross-field validation -> residual i18n -> Reports/Reversal IA -> Topbar/CountrySelector a11y -> semantic tokens -> narrow reads -> measured Reports optimization -> proven index cleanup -> pre-GA hardening.

### Slice D — exact-SHA runtime certification
Run the full interaction matrix and fix/retest every material failure.

### Slice E — TC8 Real Closed Beta
5–10 real businesses -> privacy-safe issue disposition -> no unresolved NO-GO condition -> explicit human Product Owner GO/NO-GO.

## Exit classification

Only then may LoyalFlow be classified:

`BROAD_BETA_CLOSED_FINAL_PRODUCT_PHASE_READY`

Until then:

`PRE_FINAL_BETA_CLEANUP_REQUIRED`
