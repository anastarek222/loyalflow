# TC6.5 isolated-Staging runtime rehearsal — 2026-08-15

Status: `BLOCKED_STAGING_ENV_SCOPE`

- Environment: isolated Vercel Preview branch `staging`; Neon branch `staging`.
- Release: `23899e0fb78d`; deployment `dpl_5QbSeRpr2c8pd5Q6PA8XtyVDffCq` reached `READY`.
- Scope: one synthetic pending-Owner business creation; no Production access.
- Durable enqueue: one `GOOGLE_SHEETS_BUSINESS_SYNC` job committed with the business.
- Queue runtime: delivery reached the consumer; the job was claimed once and recorded `attemptCount=1`.
- Safe failure: the lease was released and the job persisted `FAILED` with `MISSING_SERVICE_ACCOUNT_EMAIL`; no Google Sheet mutation occurred.
- Cleanup: zero rehearsal businesses, zero rehearsal users, and zero orphan jobs.

Conclusion: the application, Queue transport, consumer, outbox claim, and safe
failure boundary executed on Staging. The deployed runtime did not receive the
Service Account email. Scope `GOOGLE_SERVICE_ACCOUNT_EMAIL` and
`GOOGLE_PRIVATE_KEY` to Preview branch `staging`, redeploy, and run one bounded
provider-success/duplicate-prevention rehearsal. Retain all evidence above and
do not repeat previous local or CI checks.
