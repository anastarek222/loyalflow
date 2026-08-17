# TC8 Closed Beta Issue Log Template

Status: `PREPARATION_ONLY`

This is the governed issue-log shape for TC8. It contains no real participant data until the activation gate is satisfied.

## Severity definitions

- `BLOCKER`: prevents a mandatory journey or creates unacceptable security, tenant-isolation, data-integrity, loyalty-balance, or durability risk.
- `HIGH`: major functional/operational failure with no safe practical workaround for the Beta participant.
- `MEDIUM`: material defect or confusing behavior with a usable workaround and no critical integrity/security impact.
- `LOW`: minor usability, copy, visual, responsive, or polish issue that does not block the Beta journey.

## Allowed categories

`functional`, `data`, `integration`, `security`, `tenant-isolation`, `loyalty-balance`, `durability`, `usability`, `RTL-LTR`, `responsive`, `performance`, `operational`.

## Status lifecycle

`OPEN` → `TRIAGED` → `FIX_IN_PROGRESS` → `READY_FOR_RETEST` → `RESOLVED`

Use `DEFERRED` only with an explicit reason and Product Owner acceptance. A `BLOCKER` cannot be deferred into a GO decision.

## Issue record template

### `<TC8-ISSUE-XXX>` — `<short title>`

- Participant reference: `<BETA-XX>`
- Journey: `<required>`
- Environment: `Staging/Beta`
- Release/deployment: `<required>`
- First observed at: `<date/time>`
- Severity: `<BLOCKER/HIGH/MEDIUM/LOW>`
- Category: `<allowed category>`
- Reproducibility: `<always/intermittent/once/unknown>`
- Owner: `<role/person>`
- Status: `OPEN`

#### Reproduction

1. `<step>`
2. `<step>`
3. `<step>`

#### Expected

`<expected result>`

#### Observed

`<observed result>`

#### Evidence

- Privacy-safe screenshot/log/reference: `<link/reference or none>`
- Correlation/release identifiers: `<when available and safe>`

#### Impact

`<business/user/data/operational impact>`

#### Resolution

- Fix/reference: `<PR/commit/config-free action>`
- Risk notes: `<if any>`
- Retest environment/release: `<required before resolved>`
- Retest result: `<PASS/FAIL/BLOCKED>`
- Retested by: `<role/reference>`
- Retest date/time: `<required>`

## Daily/round reconciliation summary

- Active participants tested:
- Journeys completed:
- New issues by severity:
- Resolved issues by severity:
- Remaining blockers:
- Remaining high issues:
- Regression observed: `<yes/no>`
- Next controlled action:

## Go/No-Go issue gate

A GO decision is prohibited when any of the following remains true:
- any unresolved `BLOCKER`;
- unresolved `HIGH` issue involving security, tenant isolation, data integrity, loyalty balance, or integration durability;
- a mandatory failed journey without a reconciled issue record and retest outcome;
- evidence points to a regression on the current integrated Staging release.
