# TC8 Evidence Capture Checklist

Status: `PREPARATION_ONLY`

Use one checklist per participant session.

## Release identity
- Participant ID:
- Session date/time:
- Staging deployment URL:
- Git SHA:
- Operator:

## Environment
- Staging READY: yes/no
- Expected SHA confirmed: yes/no
- Production avoided: yes/no
- Deployment protection active where expected: yes/no

## Journey evidence
For each required journey record:
- Journey ID/name
- Result: PASS / FAIL / BLOCKED
- Expected outcome
- Observed outcome
- Timestamp
- Issue ID if applicable
- Privacy-safe evidence reference

## Cross-cutting checks
- Authentication boundary behaved correctly.
- Tenant/business isolation behaved correctly.
- Subscription/entitlement restrictions behaved correctly.
- Arabic/English path relevant to session behaved correctly.
- Mobile/desktop path relevant to session behaved correctly.
- Errors were understandable and recoverable where applicable.
- No secret or sensitive payload was exposed in UI/evidence.

## Operational evidence
- Runtime errors reviewed for session window.
- Queue/recovery behavior reviewed if journey generated integration work.
- No silently stranded integration work observed.
- No duplicate financial/provider operation observed.

## Session close
- All findings have an issue ID or explicit `NO_ISSUE` result.
- Participant tracker updated.
- P0/P1 findings escalated immediately.
- Temporary test artifacts cleaned where required.
- Evidence contains no secrets or unnecessary PII.

The completed checklist is evidence for TC8 Go/No-Go; it is not itself a Go decision.