# T004 Independent Review Packet

Status: **AWAITING INDEPENDENT REVIEWER**

Purpose: provide a bounded, sanitized checklist for a real independent reviewer to validate T004 completion claims without requiring production access, database commands, secrets, or provider mutations.

## Review scope

Review the active branch `docs/t004-operational-readiness-audit` against `main` and confirm that the recorded evidence supports the stated T004 posture.

Primary evidence set:

- `docs/T004_OPERATIONAL_READINESS_AUDIT.md`
- `docs/OPERATIONS/T004_OPERATIONAL_EVIDENCE.md`
- `docs/OPERATIONS/T004_OPERATIONAL_OWNERSHIP.md`
- `docs/OPERATIONS/T004_DISPOSABLE_RECOVERY_EVIDENCE_2026-08-09.md`
- `docs/OPERATIONS/T004_PRODUCTION_RECOVERY_POSTURE_EVIDENCE_2026-08-09.md`
- `docs/OPERATIONS/T004_VERCEL_ENVIRONMENT_EVIDENCE_2026-08-09.md`
- `docs/OPERATIONS/T004_EXTERNAL_MONITORING_EVIDENCE_2026-08-09.md`
- `docs/OPERATIONS/T004_TABLETOP_REHEARSAL_2026-08-09.md`
- `docs/MASTER_DELIVERY_TRACKER.md`

Relevant implementation/test changes:

- `app/login/actions.ts`
- `app/login/page.tsx`
- `app/login/super-admin/page.tsx`
- `app/mfa/setup/actions.ts`
- `scripts/run-t004-disposable-recovery-exercise.ts`
- `tests/login-entrypoint-ux.test.ts`
- `tests/email-verification-public-flow.test.ts`
- `tests/t004-operational-readiness-docs.test.ts`
- `tests/t004-operational-readiness-evidence.test.ts`

## Required reviewer checks

1. Confirm local backup/restore evidence is clearly scoped to disposable local PostgreSQL and is not presented as achieved production RPO/RTO.
2. Confirm Production Neon evidence proves provider-native recovery capability/posture only, not measured achievement of the proposed 15-minute RPO or 30-minute RTO.
3. Confirm Preview database/environment isolation evidence does not imply production data was copied or that migrations were run.
4. Confirm external `/api/health` monitoring evidence supports both monitor readiness and delivered DOWN/UP test notifications without requiring a real outage.
5. Confirm the tabletop exercise is labeled as a tabletop/documentation rehearsal and is not described as a live production rollback.
6. Confirm operational ownership records the accepted temporary single-owner posture and does not invent backup owners.
7. Confirm the measured Production RPO/RTO exercise is explicitly deferred to the Public Launch gate and remains unverified.
8. Confirm current code-quality evidence is stated accurately: typecheck PASS, lint PASS with 0 errors and 2 pre-existing warnings, tests 765/765 PASS, build PASS on the unchanged runtime/test tree.
9. Review the login entry-point UX change for scope containment: regular login remains email/password only; Super Admin has a dedicated MFA login path; no auth-topology rewrite is introduced.
10. Confirm no repository evidence contains secrets, customer data, private notification addresses, disposable database credentials, or production connection strings.

## Reviewer output

The reviewer should record one of the following outcomes:

- `PASS — T004 evidence supports the stated closeout posture.`
- `PASS WITH FINDINGS — list each non-blocking finding and why it does not invalidate closeout.`
- `FAIL — list each blocking finding and the exact evidence or claim that must be corrected.`

The reviewer must identify themselves by real name or recognised team identity and date the review. Do not infer reviewer identity from commit authorship, repository ownership, provider access, or billing contacts.

## Safety boundary

Independent review is read-only. It does not authorise merge, production deployment, database connection, restore execution, migration, schema change, provider mutation, secret/environment change, or production data access.

## Current blocker

T004 must remain **NOT READY FOR DRAFT PR** until a real Independent Reviewer is named and the review result is recorded. The assistant preparing this packet is not the Independent Reviewer.
