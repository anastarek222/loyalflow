# TC8 Closed Beta Operations Record

Status: `SYNTHETIC BETA PASS — REAL PARTICIPANT ENROLLMENT PENDING`  
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
| Candidate release SHA | `c85ec07d639fc2b37b285683af0ea710c1d0f6db` |
| Staging deployment | `dpl_DhZ28skWsrTgjeULzJXNzJsnNj7n` — Ready |
| Completed participants | 0 |
| Open S0 / S1 / S2 | 0 / 0 / 0 |
| Role/device matrix | COMPLETE FOR CURRENT ENTRY GATE |
| Performance evidence | PASS — 20/20, 0% errors, in-process p95 37.3 ms |
| Rollback rehearsal | PASS — rollback Ready/200 and forward recovery Ready |
| Fixture cleanup | CONFIRMED ZERO |
| Decision | NOT DECIDED |
| Decision owner | TBD |
| Decision date/time | TBD |
| Conditions / follow-ups | TBD |

Allowed decisions are `GO`, `NO-GO`, or `CONDITIONAL GO`. A green CI build,
successful Preview, or this document cannot make the decision automatically.

## Synthetic Beta UAT — 2026-08-13

The product owner authorised the current validation work to run as synthetic
Beta on isolated Staging. Three explicitly marked, non-real businesses were
created temporarily, bringing the database total to six for the bounded test.
Each synthetic business had one synthetic customer and one Earn transaction.

The public card journey for one synthetic participant returned HTTP 200 on the
protected Staging deployment. The response showed an active Arabic/RTL card,
the expected balance and reward progress, `no-store` caching, CSP and bounded
security headers. Follow-up direct API fetches were redirected by Vercel
Protection (HTTP 302); this is protection-layer evidence, not an application
failure, and no API success is claimed from those redirected requests.

Cleanup completed in dependency order. Verification reported zero matching
synthetic businesses, customers, and transactions after the test. No existing
record, Production environment, credential, schema, migration, or deployment
was changed.

This evidence validates the disposable synthetic Beta path only. It does not
count toward the five required real participants, participant consent,
authenticated owner journeys, Closed Beta completion, or Go/No-Go approval.

## Current evidence boundary

Current technical entry evidence is based on Staging release
`c85ec07d639fc2b37b285683af0ea710c1d0f6db`. Its deployment is `Ready`, the
direct readiness sample passed 20/20 with 0% errors and in-process p95 37.3 ms,
and the governed rollback/forward-recovery rehearsal completed without a data
or Production mutation. The authenticated role/MFA evidence remains valid and
all disposable fixture counts remain zero.

No real participant has yet been invited or completed the journey. The Closed
Beta participant register, issue log, and explicit human Go/No-Go decision
therefore remain open. No Production deployment or Production data action
occurred.
