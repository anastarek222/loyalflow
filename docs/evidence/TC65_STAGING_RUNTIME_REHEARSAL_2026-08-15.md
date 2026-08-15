# TC6.5 isolated-Staging runtime rehearsal — 2026-08-15

Status: `BLOCKED_STAGING_GOOGLE_WRITE_PERMISSION`

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

## Preview-scope follow-up

- Release `0c719a3634ed`; deployment `dpl_CAQDXjQcZcBbHd9ifBwU2PsK6CnD` reached `READY`.
- Both Service Account variables passed runtime configuration validation without exposing values.
- Service Account authentication and Spreadsheet metadata access succeeded.
- The first provider write stopped at `GOOGLE_API_FAILED`; `googleSheetId` remained `null`, so no Google tab was created.
- Cleanup again returned zero rehearsal businesses, users, and orphan jobs.

The remaining gate is Editor-level write access for the Staging Service Account
on the test Spreadsheet. Resume only provider success and mapped-sheet
idempotency after that access is granted.
