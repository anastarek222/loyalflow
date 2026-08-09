# T004 External Monitoring / Alert Delivery Evidence — 2026-08-09

Source: user-provided UptimeRobot screenshots plus read-only Vercel verification. No secret, private contact address, API key, database credential, or webhook token is recorded here.

## Monitor configuration

External provider: UptimeRobot.

Configured monitor:

- Type: HTTP/S website monitoring.
- Production target: `https://loyalflow-gray.vercel.app/api/health`.
- Check interval: 5 minutes.
- Recipient channel: the account-associated e-mail notification channel for the accountable On-call Operator. The private address is intentionally not recorded in the repository.

Read-only Vercel verification of the target returned HTTP `200 OK` with a health payload identifying `service: "loyalflow"`, `status: "ready"`, and `environment: "production"`. The health endpoint is also repository-defined to return HTTP `503` when its database readiness probe fails.

## Observed live monitor state

The UptimeRobot monitor details screenshot showed:

- Current status: `Up`.
- Check cadence: every 5 minutes.
- Uptime shown: 100% at the time of capture.
- Incidents shown: 0 before the synthetic notification test.

## Test notification delivery

At approximately 2026-08-09 15:09 EEST, the user triggered UptimeRobot's built-in test notification from the configured production health monitor.

Provider UI showed `Test notification sent`.

The user also supplied a phone lock-screen screenshot demonstrating receipt of both synthetic test messages through Gmail:

- `TEST: Monitor is DOWN` for the LoyalFlow production health monitor.
- `TEST: Monitor is UP` for the same monitor.

This verifies end-to-end delivery from the external monitor provider to the accountable operator's configured notification channel without requiring an actual production outage.

## T004 interpretation

- External uptime monitor configured: **VERIFIED**.
- Production `/api/health` target reachable: **VERIFIED**.
- Five-minute monitoring cadence: **VERIFIED**.
- Accountable notification channel configured: **VERIFIED** without recording private contact data.
- Synthetic DOWN alert delivery: **VERIFIED**.
- Synthetic UP/recovery alert delivery: **VERIFIED**.

This closes the T004 external monitoring / alert-delivery evidence gap. It does not establish production RPO/RTO, does not constitute a real production incident, and does not authorize any database, deployment, secret, environment-variable, or unrelated provider change.
