# LoyalFlow Data / Security Closeout — 2026-09-17

Status: `DATA_FIX_MERGED_FULL_UAT_OPEN`

Original review base: `staging@9185cbc5907f6f38ea9f60ff476c926f2bc5db43`.

Post-merge Staging baseline: `staging@a8e177fc2de9366ae7382e46abd1bfc2976f66ab`.

This is a current evidence overlay. It does **not** rewrite or replace the historical Beta/UAT records, and it does not turn prior `MANUAL UAT REQUIRED`, `PARTIAL`, `BLOCKED`, or deferred evidence into a pass.

## Scope

This record closes the current Data / Security engineering review for the recorded-sales export defect while keeping source/CI, merge, runtime, and human-UAT claims separate.

PR #577: **Expose recorded sales truth in CSV exports**

- PR state: **MERGED** into `staging` on 2026-09-17.
- Verified PR head: `3fdafdfb51a08435ee4da730f28a7ad9276351f3`.
- Merge commit: `a8e177fc2de9366ae7382e46abd1bfc2976f66ab`.
- The change preserves the existing loyalty movement export and adds explicit recorded-sale amount/currency fields so CSV consumers can distinguish credited loyalty value from actual `saleAmount`.
- Recorded-sale currency uses the canonical `loyaltyCurrency()` behavior. The existing sales-history currency-change guard remains the historical-currency protection; no nonexistent per-transaction currency field is claimed.
- No schema or migration change is part of PR #577.
- No WhatsApp, Meta, Stitch, or provider implementation file is part of PR #577.

## Automated evidence on the exact PR head

GitHub Actions `Staging PR Validation` run **#1071** (`35233952887`) completed successfully on `3fdafdfb51a08435ee4da730f28a7ad9276351f3` before merge.

The successful job includes:

- immutable migration-manifest validation;
- destructive-migration scan;
- Prisma schema validation;
- migrations applied to disposable PostgreSQL;
- focused subscription-entitlement tests;
- full test suite;
- TypeScript type-check;
- workspace-boundary validation;
- ESLint;
- production application build;
- Chromium installation;
- browser smoke execution;
- patch-whitespace validation.

The browser smoke step **ran and passed** on the exact PR head. It is recorded as browser-smoke evidence only; it is not classified as full role/tenant/mobile UAT.

## Exact-SHA runtime UAT

`Slice D Exact-SHA Runtime UAT` run **#773** (`35233952928`) for the verified PR head completed with conclusion **SKIPPED**.

Therefore:

- Exact-SHA Runtime UAT: **NOT VERIFIED**.
- Full Owner/Manager/Staff/Viewer role UAT: **NOT VERIFIED by this closeout**.
- Full cross-tenant direct-route/browser UAT: **NOT VERIFIED by this closeout**.
- Full mobile/device UAT: **NOT VERIFIED by this closeout**.

The current `docs/CONSOLIDATED_UAT_RUNBOOK.md` remains authoritative for those journeys. Its exit rule requires every applicable UAT row to be executed and passed, or explicitly excluded by a documented product decision. Historical rows that remain `MANUAL UAT REQUIRED` are not upgraded by CI or smoke evidence.

## Merge and runtime observation

PR #577 is now part of `staging` through merge commit `a8e177fc2de9366ae7382e46abd1bfc2976f66ab`.

That merge fact is **source-control evidence**, not runtime evidence. This closeout does not claim that the Staging alias, health endpoint, database state, or full browser/UAT matrix has been re-verified against the merge commit.

The Vercel integration had previously reported the PR preview as **Ready** on the verified head. Preview readiness is not equivalent to Staging or Production verification.

No manual Staging or Production deployment was initiated as part of this closeout. Any repository-integrated preview or branch deployment automation must be classified separately from an explicit deployment action and does not by itself satisfy the UAT gate.

## Tenant / authorization evidence boundary

The PR regression keeps explicit source assertions for the report export's existing:

- business/tenant scoping;
- data-export authorization;
- reporting entitlement check;
- report-scope resolution;
- spreadsheet formula-injection protection.

Those assertions plus the successful full suite and browser smoke are accepted as PR-head regression evidence. They do not replace the runbook's cross-tenant browser/direct-route matrix.

## Provider isolation

Provider isolation for this closeout is **PASS at change-scope level**:

- PR #577 does not modify WhatsApp/Meta/Stitch/provider implementation files;
- this closeout PR is documentation-only;
- no provider activation, credential, webhook, sender, or delivery change is authorized by this record.

This statement does not roll back, reclassify, or re-verify provider work already present on the `staging` base.

## Historical evidence preservation

The point-in-time files, including `BETA_CLOSEOUT_OVERLAY_2026-08-18.md`, `FINAL_BETA_RECONCILIATION_2026-08-17.md`, and `CONSOLIDATED_UAT_RUNBOOK.md`, remain unchanged.

In particular, this closeout does not reinterpret historical partial/blocked/manual/deferred UAT as completed. Newer CI evidence is additive and must be read according to its actual execution surface.

## Current closeout classification

| Gate | Status | Evidence boundary |
| --- | --- | --- |
| PR #577 source/regression | **PASS** | verified head `3fdafdfb51a08435ee4da730f28a7ad9276351f3` |
| Staging PR Validation | **PASS** | run #1071 / `35233952887` |
| Browser smoke | **PASS on PR head** | executed inside run #1071 |
| PR #577 merged to `staging` | **YES** | merge commit `a8e177fc2de9366ae7382e46abd1bfc2976f66ab` |
| Exact-SHA Runtime UAT | **NOT VERIFIED** | run #773 was skipped |
| Full role/tenant/mobile UAT | **NOT VERIFIED / OPEN** | governed UAT matrix not fully executed by this closeout |
| Provider isolation | **PASS for change scope** | PR #577 and closeout are provider-neutral |
| Staging runtime verification after merge | **NOT VERIFIED** | merge/source-control evidence only |
| Production deployment | **NOT PERFORMED** | no Production deployment authorized |
| Production verification | **NOT PERFORMED** | Production is outside this evidence |

## Non-authorizations

This record does not authorize or perform:

- Production deployment or Production data changes;
- schema/migration changes;
- provider activation or provider configuration changes;
- synthetic/browser-smoke substitution for the governed full UAT matrix;
- automatic classification of branch/preview readiness as full Staging or Production verification.
