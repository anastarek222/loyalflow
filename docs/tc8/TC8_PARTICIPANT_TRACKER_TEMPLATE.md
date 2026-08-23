# TC8 Participant Tracker Template

Status: `PREPARATION_ONLY`

Use only after TC8 activation gate is satisfied. Do not place secrets, credentials, payment data, or unnecessary personal data in this tracker.

## Cohort summary

- Target cohort size: 5–10 real businesses
- Environment: Staging/Beta only
- Integrated release: `<record at activation>`
- TC6 Runtime Proof: `<PASS required before activation>`
- Product Owner activation approval: `<required>`

## Participant record

Duplicate this block once per approved business.

### Participant `<BETA-XX>`

- Privacy-safe business reference: `<required>`
- Accountable contact role: `<owner/admin/operations/etc.>`
- Contact channel reference: `<external/private location only; do not store secrets here>`
- Approved for cohort: `<yes/no>`
- Test window: `<date/time>`
- Staging release: `<release/commit/deployment>`
- Locale/device coverage: `<AR/EN; desktop/mobile as applicable>`
- Google Sheets path enabled: `<yes/no/not applicable>`
- Custom Card path applicable: `<yes/no>`

### Journey status

| Journey | Result | Evidence | Issue refs | Retest |
| --- | --- | --- | --- | --- |
| Invitation/authenticated entry | NOT_RUN | — | — | — |
| Business/profile/settings | NOT_RUN | — | — | — |
| Customer create/lifecycle | NOT_RUN | — | — | — |
| Loyalty earn | NOT_RUN | — | — | — |
| Loyalty redemption | NOT_RUN | — | — | — |
| Balance adjustment/reconciliation | NOT_RUN | — | — | — |
| Referral/tag flows | NOT_RUN | — | — | — |
| Custom Card front/back/flip/layout | NOT_RUN | — | — | — |
| Google Sheets integration | NOT_RUN | — | — | — |
| Recovery/retry observation | NOT_RUN | — | — | — |
| Logout/session/security | NOT_RUN | — | — | — |

Allowed result values: `PASS`, `FAIL`, `BLOCKED`, `NOT_APPLICABLE`, `NOT_RUN`.

### Participant feedback

- What was clear:
- What was confusing:
- Missing workflow/value:
- Operational concern:
- Would continue using Beta: `<yes/no/conditional>`
- Follow-up needed:

### Exit state

- Mandatory journeys completed: `<yes/no>`
- Blocker/high issues unresolved: `<yes/no>`
- Participant evidence complete: `<yes/no>`
- Participant exit classification: `<PASS/PASS_WITH_FOLLOWUP/BLOCKED>`

## Cohort completion gate

The cohort tracker is complete only when:
- 5–10 approved real businesses have individual records;
- every mandatory journey has a recorded outcome or justified `NOT_APPLICABLE`;
- every failure/block has an issue-log reference;
- retest evidence is attached for resolved blocker/high issues;
- no private credentials or unnecessary personal data were copied into the repository.
