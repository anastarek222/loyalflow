# T004 Operational Ownership Matrix

This matrix defines the minimum accountable roles needed for LoyalFlow operational readiness. It does not grant database, hosting, secret, or production permissions. Assigning a person to a role is an operational decision and must be recorded explicitly rather than inferred from repository ownership.

## Current assignment status

| Responsibility | Required accountable role | Named owner | Backup owner | Current state |
|---|---|---|---|---|
| Incident command | Incident Commander | Anas Tarek (`anastarek222`) | `UNASSIGNED` | Assigned — single-owner posture accepted |
| Application deployment rollback | Release Operator | Anas Tarek (`anastarek222`) | `UNASSIGNED` | Assigned — single-owner posture accepted |
| Database backup/recovery approval | Database Owner | Anas Tarek (`anastarek222`) | `UNASSIGNED` | Assigned — single-owner posture accepted |
| Database recovery execution | Recovery Operator | Anas Tarek (`anastarek222`) | `UNASSIGNED` | Assigned — single-owner posture accepted |
| Hosting/provider escalation | Platform Owner | Anas Tarek (`anastarek222`) | `UNASSIGNED` | Assigned — single-owner posture accepted |
| Monitoring/alert response | On-call Operator | Anas Tarek (`anastarek222`) | `UNASSIGNED` | Assigned — single-owner posture accepted |
| Security incident escalation | Security Owner | Anas Tarek (`anastarek222`) | `UNASSIGNED` | Assigned — single-owner posture accepted |
| Operational evidence review | Independent Reviewer | `UNASSIGNED` | `UNASSIGNED` | Open |

Primary operational ownership was explicitly approved on 2026-08-09 for Anas Tarek (`anastarek222`) for the primary roles above. On the same date, Anas Tarek explicitly approved assignment as Recovery Operator. On 2026-08-09 the accountable owner also accepted the temporary single-owner continuity posture for T004 closeout, meaning backup/alternate owners remain unassigned by deliberate decision rather than by omission.

This acceptance is a documented operational risk decision only. It does not create redundancy, does not claim continuity if the primary owner is unavailable, and does not authorise database commands, production access, provider mutations, secrets access, or external monitoring configuration. Backup/alternate ownership should be revisited before public launch or earlier if another qualified operator becomes available.

T004 must not be marked complete while Independent Reviewer remains `UNASSIGNED` if independent review is retained as a mandatory closeout requirement.

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

A valid assignment must identify a real accountable person or formally recognised team. For T004, backup/alternate owners are intentionally unassigned under the accepted temporary single-owner posture; this does not satisfy true redundancy and is a tracked risk for later launch-readiness work.

Do not infer assignments from GitHub usernames, commit authors, billing contacts, or environment access.

No assignment in this document authorises access to secrets, production, databases, hosting providers, or external monitoring services.