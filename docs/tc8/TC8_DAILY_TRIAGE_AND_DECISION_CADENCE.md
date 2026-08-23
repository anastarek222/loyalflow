# TC8 Daily Triage and Decision Cadence

Status: `PREPARATION_ONLY`

## Purpose
Keep the 5–10 business Closed Beta controlled, comparable, and decision-oriented once activation is authorized.

## After each session
- update participant tracker;
- log new issues once, deduplicating repeated reports;
- assign severity and owner;
- link evidence by issue ID;
- flag any P0/P1 immediately;
- update the Go/No-Go scorecard inputs.

## Daily triage
Review:
1. participant coverage and remaining journeys;
2. new P0/P1/P2 issues;
3. repeated usability blockers;
4. auth/tenant/subscription boundary findings;
5. integration/recovery findings;
6. fixes awaiting retest;
7. evidence completeness.

## Severity handling
- P0: immediate NO-GO and stop affected testing until contained.
- P1: NO-GO for release unless explicitly resolved and retested.
- P2: may continue Beta if bounded, understood, and tracked.
- P3: backlog candidate unless it materially affects a required journey.

## Fix/retest loop
A reported issue is not considered resolved until:
- a fix is integrated into Staging through normal validation;
- the affected journey is rerun;
- the issue log records PASS evidence on the fixed SHA.

Do not use code merge or CI PASS alone as Closed Beta closure evidence.

## Go/No-Go review
Run the human decision only when:
- planned cohort coverage is complete or explicitly waived by Product Owner;
- automatic NO-GO conditions in the scorecard are clear;
- unresolved P0/P1 count is known;
- required journeys have evidence;
- material repeated blockers are summarized;
- the decision owner has reviewed the issue log and scorecard.

Final decision values:
- `GO`
- `GO_WITH_BOUNDED_FOLLOWUPS`
- `NO_GO`

Record rationale and named follow-ups. This document prepares the operating cadence but does not start the real Closed Beta.