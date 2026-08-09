# T004 Monitoring and Alerting Plan

Date: 2026-08-09
Status: **READY FOR PROVIDER CONFIGURATION — NOT YET VERIFIED**

This document defines the smallest external monitoring contract needed to close the T004 alert-routing evidence gap. It does not authorize provider configuration, deployment, database access, secret access, or environment-variable changes.

## Monitor target

Primary endpoint: `/api/health`

Repository behavior:

- dynamic Node.js route;
- performs a real database readiness probe using `SELECT 1`;
- returns HTTP `200` with `status: "ready"` when the readiness probe succeeds;
- returns HTTP `503` with `status: "unavailable"` when the database readiness probe fails;
- emits a server-side error event for a failed database readiness probe;
- sets `Cache-Control: no-store, max-age=0`.

This makes the endpoint suitable for an uptime/readiness monitor without adding a new monitoring-only endpoint.

## Minimum alert policy

The intended external monitor should:

1. Request the deployed application's `/api/health` endpoint on a recurring interval supported by the selected provider.
2. Treat network failure, timeout, or non-2xx response as unhealthy. The application readiness failure path is HTTP `503`.
3. Route the alert to the accountable On-call Operator: Anas Tarek (`anastarek222`). Private email/phone/webhook destinations must remain in the provider and must not be committed to GitHub.
4. Map a sustained health failure to the existing incident response runbook. A single transient failure may be retried according to provider capability; the exact retry/window policy must be recorded from the provider configuration rather than invented here.
5. Preserve environment identity so Preview alerts cannot be mistaken for Production alerts.

## Verification evidence required

Before this control can be marked verified, record sanitized evidence showing:

- provider/service name;
- monitored environment and endpoint identity;
- configured failure condition;
- accountable route/recipient role without private contact data;
- timestamp of a provider-supported test notification or equivalent safe verification;
- delivery/acknowledgement outcome;
- no secret, token, webhook credential, or private contact information.

A screenshot of a monitoring dashboard alone is not enough if it does not prove alert routing/delivery.

## Safety boundary

Do not intentionally break Production or its database merely to force an alert. Prefer a provider-native test notification, a dedicated test monitor, or another non-destructive verification supported by the monitoring provider.

Any provider/external monitoring configuration remains a controlled mutation requiring explicit owner approval.
