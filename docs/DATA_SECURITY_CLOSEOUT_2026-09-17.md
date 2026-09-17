# LoyalFlow Data / Security Closeout — 2026-09-17

Status: `PR_HEAD_VERIFIED_FULL_UAT_OPEN`

Base used for this record: `staging@9185cbc5907f6f38ea9f60ff476c926f2bc5db43`.

This is a current evidence overlay. It does **not** rewrite or replace the historical Beta/UAT records, and it does not turn prior `MANUAL UAT REQUIRED`, `PARTIAL`, `BLOCKED`, or deferred evidence into a pass.

## Scope

This record closes the current Data / Security engineering review at the PR-head evidence level for PR #577 while keeping runtime and human-UAT claims separate.

PR #577: **Expose recorded sales truth in CSV exports**

- PR state at closeout: **OPEN**, not merged.
- Base: `staging@9185cbc5907f6f38ea9f60ff476c926f2bc5db43`.
- Verified PR head: `3fdafdfb51a08435ee4da730f28a7ad9276351f3`.
- The change preserves the existing loyalty movement export and adds explicit recorded-sale amount/currency fields so CSV consumers can distinguish credited loyalty value from actual `saleAmount`.
- Recorded-sale currency uses the canonical `loyaltyCurrency()` behavior. The existing sales-history currency-change guard remains the historical-currency protection; no nonexistent per-transaction currency field is claimed.
- No schema or migration change is part of PR #577.
- No WhatsApp, Meta, Stitch, or provider implementation file is part of PR #577.

## Automated evidence on the exact PR head

GitHub Actions `Staging PR Validation` run **#1071** (`35233952887`) completed successfully on `3fdafdfb51a08435ee4da730f28a7ad9276351f3`.

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

The browser smoke step **ran and passed**. It is recorded as browser-smoke evidence only; it is not classified as full role/tenant/mobile UAT.

## Exact-SHA runtime UAT

`Slice D Exact-SHA Runtime UAT` run **#773** (`35233952928`) for the same PR head completed with conclusion **SKIPPED**.

Therefore:

- Exact-SHA Runtime UAT: **NOT VERIFIED**.
- Full Owner/Manager/Staff/Viewer role UAT: **NOT VERIFIED by this closeout**.
- Full cross-tenant direct-route/browser UAT: **NOT VERIFIED by this closeout**.
- Full mobile/device UAT: **NOT VERIFIED by this closeout**.

The current `docs/CONSOLIDATED_UAT_RUNBOOK.md` remains authoritative for those journeys. Its exit rule requires every applicable UAT row to be executed and passed, or explicitly excluded by a documented product decision. Historical rows that remain `MANUAL UAT REQUIRED` are not upgraded by CI or smoke evidence.

## Preview/runtime observation

The Vercel integration reported the preview for PR #577 as **Ready** on the verified head. Preview readiness is not a Staging or Production deployment claim.

A direct health sanity attempt against the protected preview was not accepted as health evidence because the preview access layer redirected to Vercel authentication. This closeout therefore does **not** claim preview health HTTP-200 evidence.

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

- this closeout branch is documentation-only;
- PR #577 does not modify WhatsApp/Meta/Stitch/provider implementation files;
- no provider activation, credential, webhook, sender, or delivery change is authorized by this record.

This statement does not roll back, reclassify, or re-verify provider work already present on the `staging` base.

## Historical evidence preservation

The point-in-time files, including `BETA_CLOSEOUT_OVERLAY_2026-08-18.md`, `FINAL_BETA_RECONCILIATION_2026-08-17.md`, and `CONSOLIDATED_UAT_RUNBOOK.md`, remain unchanged.

In particular, this closeout does not reinterpret historical partial/blocked/manual/deferred UAT as completed. Newer CI evidence is additive and must be read according to its actual execution surface.

## Current closeout classification

| Gate | Status | Evidence boundary |
| --- | --- | --- |
| PR #577 source/regression | **PASS on PR head** | head `3fdafdfb51a08435ee4da730f28a7ad9276351f3` |
| Staging PR Validation | **PASS** | run #1071 / `35233952887` |
| Browser smoke | **PASS** | executed inside run #1071 |
| Exact-SHA Runtime UAT | **NOT VERIFIED** | run #773 was skipped |
| Full role/tenant/mobile UAT | **NOT VERIFIED / OPEN** | governed UAT matrix not fully executed by this closeout |
| Provider isolation | **PASS for change scope** | docs-only closeout; PR #577 provider-neutral |
| PR #577 merged to `staging` | **NO** | PR remains open |
| Merge of this closeout | **NOT PERFORMED** | requires separate authorization |
| Deploy | **NOT PERFORMED** | no deployment authorized |
| Production verification | **NOT PERFORMED** | Production is outside this evidence |

## Non-authorizations

This record does not authorize or perform:

- merge of PR #577 or this documentation branch;
- Staging or Production deployment;
- Production data changes;
- schema/migration changes;
- provider activation or provider configuration changes;
- synthetic/browser-smoke substitution for the governed full UAT matrix.
