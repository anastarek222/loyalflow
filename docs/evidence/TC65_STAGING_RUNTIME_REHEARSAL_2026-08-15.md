# TC6.5 isolated-Staging runtime rehearsal — 2026-08-15

Status: `PASS — TC6.5_STAGING_RUNTIME_VERIFIED`

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

## Provider-success and duplicate-prevention closeout

- Editor access became effective without a redeploy; the unchanged release
  `0c719a3634ed` was used.
- One synthetic pending-Owner business reached `SUCCEEDED` with no provider
  error and mapped sheet ID `2063009995`.
- Before replay: one business, one durable job, and one mapped sheet.
- One manual Google Sheets sync returned `sheetSync=success`; the mapped sheet ID
  and title remained unchanged, and the business/job cardinality remained `1/1`.
- This proves mapped-sheet reuse and prevents a duplicate provider mapping or
  duplicate durable job for the replayed sync.
- Application cleanup verified zero rehearsal businesses, zero rehearsal users,
  and zero orphan jobs; the synthetic browser session was closed.
- The isolated provider-created tab remains in the dedicated Staging test
  Spreadsheet as the provider-success artifact. Production was not accessed.

Conclusion: TC6.5 provider success, duplicate prevention, idempotent mapped-sheet
reuse, and application fixture cleanup pass on isolated Staging. TC6.5 is closed
for the approved Beta scope.
