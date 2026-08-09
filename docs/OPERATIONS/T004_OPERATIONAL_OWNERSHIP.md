# T004 Operational Ownership Matrix

This matrix defines the minimum accountable roles needed for LoyalFlow operational readiness. It does not grant database, hosting, secret, or production permissions. Assigning a person to a role is an operational decision and must be recorded explicitly rather than inferred from repository ownership.

## Current assignment status

| Responsibility | Required accountable role | Named owner | Backup owner | Current state |
|---|---|---|---|---|
| Incident command | Incident Commander | `UNASSIGNED` | `UNASSIGNED` | Open |
| Application deployment rollback | Release Operator | `UNASSIGNED` | `UNASSIGNED` | Open |
| Database backup/recovery approval | Database Owner | `UNASSIGNED` | `UNASSIGNED` | Open |
| Database recovery execution | Recovery Operator | `UNASSIGNED` | `UNASSIGNED` | Open |
| Hosting/provider escalation | Platform Owner | `UNASSIGNED` | `UNASSIGNED` | Open |
| Monitoring/alert response | On-call Operator | `UNASSIGNED` | `UNASSIGNED` | Open |
| Security incident escalation | Security Owner | `UNASSIGNED` | `UNASSIGNED` | Open |
| Operational evidence review | Independent Reviewer | `UNASSIGNED` | `UNASSIGNED` | Open |

T004 must not be marked complete while required accountable roles remain `UNASSIGNED`.

## Role boundaries

### Incident Commander

Owns incident severity, coordination, timeline, stop/go decisions, and closure. Does not gain implicit permission to run database commands.

### Release Operator

May perform an explicitly authorised application rollback through the approved hosting process. Application rollback must not rewrite database migration history.

### Database Owner

Approves the exact database target and whether destructive/disposable recovery exercises are permitted. This approval is required before any backup/restore database command in T004.

### Recovery Operator

Executes only the database recovery procedure explicitly approved by the Database Owner. Must stop when target identity, credentials handling, artifact integrity, or approval is unclear.

### Platform Owner

Owns hosting/provider escalation and configuration accountability. External provider mutations remain separately controlled changes.

### On-call Operator

Receives and acknowledges operational alerts, follows the incident runbook, and escalates according to severity. A repository health endpoint is not a substitute for a delivered alert route.

### Security Owner

Owns escalation for authentication compromise, suspected tenant isolation failure, credential exposure, and other security incidents.

### Independent Reviewer

Checks sanitized evidence after exercises and confirms that completion claims are supported. The reviewer should not silently convert planned targets into achieved results.

## Assignment rule

A valid assignment must identify a real accountable person or formally recognised team and a backup owner where operational continuity requires one. Do not infer assignments from GitHub usernames, commit authors, billing contacts, or environment access.

No assignment in this document authorises access to secrets, production, databases, hosting providers, or external monitoring services.