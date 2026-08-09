# T004 Reconciliation After T005

Date: 2026-08-09
Baseline: `main` at `79537d04eecbc037cadeec359e06b8281c3991f9` after merged PR #51 (T005 I18N compatibility foundation).
Legacy T004 source branch: `docs/t004-operational-readiness-audit` at latest known head `494468b20e26fba7c9733436ba83d377dee7975f`.

## Why reconciliation is required

The legacy T004 branch diverged before T005. It is currently both ahead of and behind `main`, and it contains changes to `app/login/page.tsx`, `app/login/actions.ts`, Super Admin login routing, and related tests in addition to the actual operational-readiness evidence.

T005 subsequently merged a bounded AR/EN SSR locale foundation and localized the main login entrypoint. Blindly merging the old T004 branch would therefore risk overwriting newer I18N behavior and reintroducing duplicate or stale login UX.

## Reconciliation boundary

T004 remains an operational-readiness closeout. The reconciled T004 branch will preserve current `main` as the source of truth for the login/I18N surface and will carry forward only T004 material that is necessary to prove operational readiness:

- backup/restore and recovery evidence;
- RPO/RTO posture and explicit deferral decisions;
- Preview/staging isolation evidence;
- external monitoring and alert-delivery evidence;
- incident/rollback tabletop evidence;
- named operational ownership and continuity decisions;
- disposable-recovery helper and its bounded tests where still applicable;
- T004 operational evidence tests after updating stale assertions to current repository state.

The legacy T004 login-entrypoint split is intentionally excluded from this reconciliation because it is not required to close the operational-readiness gate and now overlaps the merged T005 I18N surface. It may be reconsidered later as a separate UX/auth task if still desired.

## Safety constraints

This reconciliation does not authorize or perform:

- production, staging, Preview, shared, or remote database commands;
- migrations or schema changes;
- secrets or environment-variable changes;
- provider mutation;
- production deployment;
- direct modification of `main`.

## Current T004 governance state

The previously accepted product-owner decisions remain the working posture for reconciliation:

- measured production/service RPO/RTO proof is deferred to the later launch gate and must not be claimed as achieved;
- the temporary single-owner continuity risk is accepted pre-launch and must be resolved before Closed Beta/public launch;
- a real Independent Reviewer is unavailable. Any waiver of that review gate for T004 must be recorded as a separate explicit governance exception before merge; the T005 exception does not automatically apply to T004.

## Next steps

1. Port the operational-only T004 evidence onto this branch from the current `main` baseline.
2. Update stale T004 evidence/test assertions to the post-T005 repository state.
3. Run exact-head typecheck, lint, tests, and production build.
4. Open a Draft PR only after the reconciled tree passes the required gates.
5. Stop before merge unless T004 review is completed or a separate explicit review-governance exception is approved.

Status: `NOT READY FOR DRAFT PR` while reconciliation is in progress.
