# TC8 Go / No-Go Scorecard

Status: `PREPARATION_ONLY`

This scorecard is prepared in advance but must not be completed as a real decision until TC8 is active and the governed cohort has finished.

## Prerequisite gates

| Gate | Required | Evidence | Status |
| --- | --- | --- | --- |
| TC6 Staging Runtime Proof | PASS | `<reference>` | PENDING |
| Current integrated Staging release healthy | YES | `<release/deployment>` | PENDING |
| 5–10 real businesses approved | YES | participant tracker | PENDING |
| Privacy-safe issue log ready | YES | issue log | READY_TEMPLATE_ONLY |
| Product Owner activation approval | YES | `<decision reference>` | PENDING |

If any prerequisite is not satisfied, TC8 cannot be classified `REAL_CLOSED_BETA_ACTIVE`.

## Cohort execution scorecard

| Dimension | GO requirement | Result | Evidence |
| --- | --- | --- | --- |
| Cohort size | 5–10 real businesses completed governed scope | PENDING | — |
| Mandatory journey completion | Every mandatory journey has PASS or justified NOT_APPLICABLE per participant | PENDING | — |
| Authentication/session | No unresolved blocker/high auth/session regression | PENDING | — |
| Tenant isolation | No unresolved blocker/high isolation defect | PENDING | — |
| Customer lifecycle | Repeatable on current Staging release | PENDING | — |
| Loyalty earn/redemption | Repeatable with correct balance behavior | PENDING | — |
| Balance/reconciliation | No unresolved integrity regression | PENDING | — |
| Custom Card | Front/back, flip, barcode/customer/gift/product placement acceptable where applicable | PENDING | — |
| Google Sheets integration | Durable behavior proven where enabled | PENDING | — |
| Recovery/retry | No silent stuck-job or duplicate provider-execution evidence | PENDING | — |
| AR/EN and RTL/LTR | Required participant paths usable | PENDING | — |
| Responsive/usability | No blocker/high issue preventing governed use | PENDING | — |
| Issue reconciliation | All blocker/high fixes retested on current release | PENDING | — |

## Automatic NO-GO conditions

Any one condition below forces `NO_GO` until reconciled:
- unresolved blocker severity issue;
- unresolved high security or tenant-isolation issue;
- unresolved high data-integrity or loyalty-balance issue;
- unresolved high integration-durability or duplicate-execution issue;
- mandatory journey lacks evidence on the current integrated Staging release;
- fewer than 5 real businesses complete the governed scope;
- TC6 Runtime Proof is not PASS;
- Product Owner has not recorded the final decision.

## Decision

- Technical recommendation: `<GO/NO_GO/PENDING>`
- Product Owner decision: `<GO/NO_GO/PENDING>`
- Decision date/time: `<required>`
- Integrated Staging release: `<required>`
- Open accepted follow-ups: `<references or none>`
- Rationale: `<short evidence-backed rationale>`

## Post-decision boundary

A TC8 `GO` does not authorize Production by itself. Production remains separately gated by the master plan, Production readiness evidence, credentials/environment decisions, and explicit Product Owner authorization.
