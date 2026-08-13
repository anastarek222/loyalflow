# TC8 Closed Beta Operations Record

Status: `READY FOR OPERATOR EXECUTION`  
Environment: isolated `staging` only  
Target cohort: 5-10 businesses

This record closes the operating-document gap for TC8. It does not claim that
the Closed Beta, authenticated UAT, rollback rehearsal, or Go/No-Go decision
has been completed.

## Entry gate

Do not invite a participant until all of the following are evidenced for the
exact staging release SHA:

- the named staging deployment is `Ready`;
- `/api/health` reports the approved staging identity and fails closed on an
  invalid database boundary;
- required repository checks and staging smoke checks pass;
- the desktop/mobile and role matrix has an accountable operator;
- rollback owner, incident contact, and rollback target are recorded;
- only isolated non-production data will be used.

A transient PR Preview or a green build alone does not satisfy this gate.

## Participant register

Use anonymous participant IDs in repository evidence. Keep names and contact
details outside GitHub in the approved business-contact system.

| Participant ID | Business profile | Owner | Invited at | Started at | Completed at | Outcome | Evidence link |
|---|---|---|---|---|---|---|---|
| BETA-01 | TBD | TBD | — | — | — | NOT STARTED | — |
| BETA-02 | TBD | TBD | — | — | — | NOT STARTED | — |
| BETA-03 | TBD | TBD | — | — | — | NOT STARTED | — |
| BETA-04 | TBD | TBD | — | — | — | NOT STARTED | — |
| BETA-05 | TBD | TBD | — | — | — | NOT STARTED | — |
| BETA-06 | Optional | TBD | — | — | — | NOT STARTED | — |
| BETA-07 | Optional | TBD | — | — | — | NOT STARTED | — |
| BETA-08 | Optional | TBD | — | — | — | NOT STARTED | — |
| BETA-09 | Optional | TBD | — | — | — | NOT STARTED | — |
| BETA-10 | Optional | TBD | — | — | — | NOT STARTED | — |

Minimum accepted cohort: five completed participants. Maximum: ten.

## Required journey evidence

For every participating business, retain only bounded evidence and safe IDs:

1. owner authentication and logout;
2. business setup and programme configuration;
3. staff/role boundary check;
4. customer join and public card;
5. earn and redeem cycle;
6. reports/dashboard review;
7. Arabic/English and mobile/desktop check;
8. support feedback and completion outcome.

Never place credentials, phone numbers, customer names, public card tokens,
database URLs, raw logs, or private notes in this record.

## Issue log

| Issue ID | Participant ID | Release SHA | Journey | Severity | Status | Owner | Reproduction (sanitised) | Decision |
|---|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — | — |

Severity rules:

- `S0` — security/privacy breach or Production-impact risk: stop the beta.
- `S1` — data integrity, tenant isolation, authentication, or core loyalty
  failure: stop the affected journey and block Go.
- `S2` — material workflow failure with a safe workaround: fix or explicitly
  accept before Go.
- `S3` — cosmetic or low-impact issue: may be scheduled with an owner.

An issue may be closed only with a fix/evidence link or a documented acceptance
owner. Do not paste sensitive runtime output into the issue log.

## Daily operating loop

1. Confirm the staging release SHA and health before sessions.
2. Execute only the scheduled participant journeys.
3. Record outcome and sanitised evidence immediately.
4. Triage new issues using the severity rules.
5. Stop on any S0/S1 condition or staging/Production boundary uncertainty.
6. At the end of the window, confirm no disposable fixture is left behind.

## Exit gate

The Closed Beta is complete only when:

- 5-10 participants have a recorded outcome;
- the required journey matrix is complete for each accepted participant;
- no open S0 or S1 exists;
- every S2 has a fix or explicit acceptance owner;
- staging health, performance evidence, and rollback rehearsal are current for
  the candidate release;
- fixture cleanup is confirmed;
- an explicit human Go/No-Go decision is recorded.

## Go/No-Go record

| Field | Value |
|---|---|
| Candidate release SHA | TBD |
| Staging deployment | TBD |
| Completed participants | 0 |
| Open S0 / S1 / S2 | 0 / 0 / 0 |
| Role/device matrix | NOT COMPLETE |
| Performance evidence | NOT COMPLETE |
| Rollback rehearsal | NOT COMPLETE |
| Fixture cleanup | NOT APPLICABLE |
| Decision | NOT DECIDED |
| Decision owner | TBD |
| Decision date/time | TBD |
| Conditions / follow-ups | TBD |

Allowed decisions are `GO`, `NO-GO`, or `CONDITIONAL GO`. A green CI build,
successful Preview, or this document cannot make the decision automatically.

## Current evidence boundary

On 2026-08-13, isolated Staging release
`2bda4e7b69b76e47e9c7275b36603917f65e4e4e` reached Vercel `Ready`.
Authenticated disposable UAT then confirmed:

- Owner login, Dashboard, and Loyalty Program access;
- Manager access to reports and denial from owner-only Settings;
- Staff access to Scan and denial from Reports and Settings;
- Viewer read-only access to Customers and Reports and denial from Scan;
- the ordinary primary-login path after fixing omitted optional MFA input;
- Super Admin fail-closed MFA setup, TOTP verification, Dashboard, and Operations access;
- zero remaining UAT businesses, users, MFA records, and recovery-code records after cleanup;
- a fresh 20-request protected health sample completed with 0% request errors,
  but measured p95 was 4,770 ms against the 1,500 ms gate. This timing includes
  the protected connector path and is not used as an application-only latency
  claim; the performance gate remains failed pending a direct approved runner.

This is bounded authenticated role evidence only. Mobile coverage,
onboarding-state variants, performance remeasurement, rollback rehearsal, real
5-10 business participation, and the human Go/No-Go decision remain open. No
Production deployment, Production data, migration, provider activation, or real
participant invitation occurred.
