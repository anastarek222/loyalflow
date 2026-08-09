# T007 Closed Beta Operating Pack

Date: 2026-08-09

## Goal

Run a controlled Closed Beta with 5-10 businesses only after isolated staging is activated and the staging readiness gates are satisfied. This pack defines participant selection, onboarding, support, issue triage, exit evidence, and Go/No-Go inputs without enrolling any real participant yet.

## Entry gates

Closed Beta does not start until all of the following are true:

- isolated staging has an explicit `staging` runtime identity;
- staging database identity is distinct from Production and passes the fail-closed isolation guard;
- repository-local typecheck, lint, tests, and production build pass on the candidate release;
- required desktop/mobile E2E journeys have evidence or an explicit accepted beta issue;
- staging `/api/health` reports ready;
- the bounded staging performance probe passes its recorded budget;
- rollback/incident ownership is known for the beta window.

## Participant cohort

Target: 5-10 businesses.

Selection criteria:

- one accountable business owner or decision maker is available;
- the business understands this is a Closed Beta and not a production SLA commitment;
- the business can test at least one real loyalty workflow end to end;
- the business agrees to report blockers and confusing behavior through the beta feedback channel;
- no participant is added solely to increase the cohort count if they cannot exercise the product meaningfully.

Prefer a small spread of business shapes rather than ten near-identical participants. Do not collect unnecessary personal or customer data for beta evaluation.

## Onboarding script

For each participant:

1. Confirm the business contact and beta expectations.
2. Confirm the beta environment is staging, not Production.
3. Create/use only the approved beta fixture or tenant path for that participant.
4. Walk through owner invitation/login and onboarding.
5. Confirm the loyalty program and Standard Card preview are understandable.
6. Exercise one customer enrollment/card flow.
7. Exercise one staff Scan/search workflow where applicable.
8. Confirm the participant knows how to report a blocker and how to identify the approximate time/workflow involved.

Any real participant provisioning, database writes, secrets, provider configuration, or customer-like seed data remains separately approval-gated.

## Minimum beta journeys

Each applicable participant should cover:

- owner invitation or existing-account login;
- owner onboarding and program/card review;
- dashboard core navigation;
- customer enrollment/public card;
- staff Scan/search and loyalty operation where staff is used;
- reward progress/redemption where the configured program reaches that state;
- basic reports or activity review for the owner;
- Arabic/English direction where relevant to the participant.

Security and cross-tenant rejection evidence remains a controlled internal test; participants are not asked to probe another tenant.

## Feedback capture

Every actionable finding is recorded in the issue log with:

- beta issue ID;
- date/time;
- participant/business alias;
- environment and release SHA;
- journey/route;
- severity;
- concise reproduction steps;
- expected behavior;
- observed behavior;
- owner;
- status;
- fix/PR reference when applicable;
- retest evidence.

Do not place secrets, access tokens, passwords, raw database URLs, or unnecessary customer PII in the issue log.

## Severity rules

- `S0 — Critical`: data isolation/security breach, destructive corruption, or a condition requiring immediate beta stop.
- `S1 — Blocker`: core beta journey cannot be completed and there is no safe workaround.
- `S2 — Major`: material workflow failure/confusion with a safe workaround or limited scope.
- `S3 — Minor`: cosmetic, copy, polish, or low-impact usability issue that does not block the journey.

S0 stops the beta immediately. S1 blocks expansion to additional businesses until triaged and explicitly accepted or fixed. S2/S3 may remain open only when their launch impact and owner are recorded.

## Daily beta operating loop

During the active beta window:

- review new findings;
- classify severity and duplicate status;
- identify owner and next action;
- retest resolved S0/S1 findings before continuing affected journeys;
- keep a short record of participant count, active blockers, fixes, and regressions;
- avoid feature expansion that is unrelated to beta blockers or agreed launch readiness.

## Exit criteria

The Closed Beta can move to Go/No-Go review only when:

- 5-10 businesses have participated, unless an explicit owner decision changes the cohort target;
- all required journeys have meaningful evidence across the cohort/internal staging tests;
- no unresolved S0 exists;
- no unresolved S1 exists unless there is an explicit No-Go/accepted-risk decision;
- all fixed S0/S1 findings have retest evidence;
- staging identity, health, isolation, E2E, and performance evidence remain valid for the evaluated release;
- known S2/S3 items have owner/status and are assessed for public-launch impact;
- a final beta summary records cohort, release SHA, issue counts by severity, and recommended Go/No-Go.

## Go/No-Go rule

The final public-launch decision is explicit. Passing automated tests alone never implies Go. A Go decision requires the accountable owner to accept the beta evidence and remaining risks; otherwise the status remains No-Go or blocked.

## Safety boundary

This document does not authorize:

- inviting real beta businesses;
- Production deployment;
- database connection or commands;
- migration/seed/reset/backfill work;
- provider or environment-variable mutation;
- dependency or lockfile changes;
- processing real participant/customer data before the beta data-handling path is approved.
