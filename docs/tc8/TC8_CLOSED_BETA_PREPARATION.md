# TC8 Closed Beta Preparation

Status: `PREPARATION_ONLY`

## Gate

TC8 real Closed Beta does not start until TC6 Staging Runtime Proof is complete. This document prepares the Beta operating pack only; it does not recruit, onboard, deploy to Production, or claim TC8 execution.

## Beta cohort

Target: 5–10 real businesses.

Selection criteria:
- willing to use the Staging/Beta environment and provide structured feedback
- representative loyalty operations rather than internal-only demo accounts
- one accountable business owner/contact per participant
- able to complete the defined journeys during the Beta window
- no Production dependency or Production data requirement

## Required journeys per business

1. Invitation acceptance and authenticated entry.
2. Business/profile/settings verification.
3. Customer creation and customer lifecycle operations.
4. Loyalty earn and redemption flows.
5. Balance adjustment/reconciliation where applicable.
6. Referral/tag operational flows where applicable.
7. Custom Card front/back configuration, preview/flip behavior, barcode/customer/gift/product placement verification where applicable.
8. Google Sheets integration path where enabled for the participant.
9. Recovery/retry observation for any naturally occurring integration failure; no artificial Production-impacting failure injection.
10. Logout/session/security behavior relevant to the participant role.

## Evidence required

For each participant capture:
- participant/business identifier that is safe for the Beta issue log
- date/time of test window
- environment/release identifier
- journeys attempted
- pass/fail/block result per journey
- issue references for failures or confusing behavior
- severity and reproducibility
- screenshots or other evidence only when privacy-safe
- explicit participant feedback summary
- unresolved blocker list

## Issue log schema

Each issue must record:
- ID
- business/cohort reference
- journey
- environment/release
- severity: blocker / high / medium / low
- category: functional / data / integration / security / usability / RTL-LTR / responsive / performance / operational
- reproduction steps
- expected result
- observed result
- evidence reference
- owner
- status
- retest result

## Go / No-Go gate

`GO` requires all of the following:
- 5–10 real businesses completed the governed Beta scope
- no unresolved blocker severity issue
- no unresolved high-severity security, tenant-isolation, data-integrity, loyalty-balance, or integration-durability regression
- critical journeys have repeatable evidence on the current integrated Staging release
- TC6 Runtime Proof is complete on Staging
- issue log is reconciled and retests are recorded
- human Product Owner Go/No-Go decision is recorded

`NO-GO` applies if any mandatory criterion above is not met.

## Explicit exclusions

- no Production deployment
- no Production credentials/data
- no self-service commercial signup activation
- no billing/payment activation
- no schema/migration introduced by this preparation pack
- no provider/environment/secret changes
- no claim that real Closed Beta has started

## Activation checklist

TC8 may move from `PREPARATION_ONLY` to `REAL_CLOSED_BETA_ACTIVE` only after:
1. TC6 Staging Runtime Proof is PASS.
2. Current Staging release is identified and healthy.
3. 5–10 real businesses are approved for the cohort.
4. A privacy-safe issue log is ready.
5. Test windows and accountable contacts are recorded.
6. Human Product Owner explicitly authorizes Beta activation.
