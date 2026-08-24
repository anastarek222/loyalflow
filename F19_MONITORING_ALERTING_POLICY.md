# LoyalFlow Monitoring & Alerting Policy

This policy defines the launch-critical signals LoyalFlow must monitor and how
those signals escalate. It is intentionally provider-neutral: it does not grant
permission to add secrets, change Production configuration, or mutate customer
data.

## Scope

Monitoring covers four classes of operational risk:

1. application liveness and dependency-aware readiness
2. authentication infrastructure required for valid users to sign in
3. tenant isolation and loyalty write correctness
4. material integration or recovery degradation

Every incident record must include the exact deployed Git SHA, environment,
timestamp, affected route or bounded reason, and severity. Never include raw
credentials, connection strings, customer data, authentication tokens, or
secret environment values in an alert.

## Core external probes

### Liveness

Probe `/api/health/live` once per minute from outside the application runtime.

- One failed probe is recorded but does not page by itself.
- **Two consecutive liveness failures** are **Critical**.
- A Critical liveness alert freezes new deployment activity until the incident
  is classified and the exact deployed Git SHA is recorded.

Liveness must not query the database or optional providers; it answers whether
the application process can serve requests.

### Readiness

Probe `/api/health` once per minute from outside the application runtime.

- One failed readiness probe is recorded for correlation.
- Two consecutive readiness failures are **High**.
- **Five continuous minutes of readiness failure** are **Critical**.
- A recovered readiness probe closes the active availability condition only
  after recovery is confirmed by at least two consecutive successful probes.

Readiness is dependency-aware. A readiness alert must not expose database host,
credentials, or the raw `DATABASE_URL`.

## Runtime security and infrastructure signals

The distributed authentication limiter intentionally fails closed in
production-like runtime. Therefore recurring production events with bounded
reason `missing_credentials` or `backend_unavailable` are launch-critical when
they prevent valid credential login.

- A confirmed systemic valid-user login outage caused by either bounded reason
  is **Critical**.
- A single isolated infrastructure warning without user impact is investigated
  as **Operational attention** and correlated with readiness before escalation.
- `limit_exceeded` is an abuse-control signal, not an infrastructure outage by
  itself.

Do not include limiter keys, email addresses, IP addresses, passwords, MFA
codes, or reset/invitation tokens in alert payloads.

## Correctness signals

Some failures are more serious than availability loss and escalate immediately:

- suspected **tenant isolation** failure is **Critical**
- uncertain or duplicate **loyalty write correctness** is **Critical**
- a systemic authentication outage for valid users is **Critical**
- public card privacy exposure is **Critical**

For correctness incidents, stop new deployment activity, preserve evidence, and
follow `F19_INCIDENT_RESPONSE_RUNBOOK.md`. Do not repair balances by deleting
transactions and do not bypass tenant boundaries to diagnose an incident.

## Integration and recovery signals

Optional-provider degradation is normally **Operational attention** when core
LoyalFlow operations remain healthy. Escalate to **High** when repeated failures
materially block a supported customer or business workflow. Escalate to
**Critical** only when the failure causes a launch-critical core path to become
unavailable or correctness becomes uncertain.

Queue or recovery errors must be correlated by deployment/release identity so
stale Preview deployments are not mistaken for the active release.

## Severity and response ownership

### Critical

- Deliver immediately to the Owner-designated external channel.
- Freeze new deployment activity.
- Record the exact deployed Git SHA.
- Start `F19_INCIDENT_RESPONSE_RUNBOOK.md` and determine application, database,
  configuration, or provider scope.

### High

- Deliver to the Owner-designated external channel promptly.
- Investigate before the next deployment.
- Escalate to Critical if the condition reaches a Critical threshold or impacts
  tenant isolation, authentication availability, or loyalty correctness.

### Operational attention

- Record for the next operations review.
- Correlate repeated occurrences and promote to High when a material workflow
  is affected.

## Release monitoring window

For every Production release, monitoring must retain the exact deployed Git SHA
and observe both health probes during the immediate post-deploy window. A
release is not operationally certified while a Critical or unresolved High
condition is active.

The manual product/UAT plan is separate from this operational monitoring policy.
Health probes and alert delivery do not substitute for product UAT.

## External alert delivery

**External alert delivery provider activation is pending.** The final provider
and destination require Owner approval because they create external account,
notification, and potentially secret configuration.

Before Pilot/Production monitoring can be certified, the chosen provider must:

- probe the canonical Production URL rather than a Preview deployment
- support the liveness and readiness thresholds above
- deliver Critical and High alerts to an Owner-designated external channel
- avoid placing application secrets or PII in alert bodies
- produce one controlled test alert with confirmed external receipt
- document the active destination and escalation owner without committing
  destination credentials to the repository

Until that provider activation and receipt test exist, the **source monitoring
policy is defined but external alert delivery remains pending**.

## Recovery and closure

An availability alert may close after its recovery condition is met, but an
incident is not closed until the runbook recovery checks are complete and the
final deployed Git SHA is recorded. Correctness/security incidents require
explicit evidence that the affected boundary is safe before service is treated
as recovered.
