# TC5 Business Settings Command Extraction

Status: `IMPLEMENTED_PENDING_CI`

## Scope

This bounded TC5 slice extracts the authoritative non-financial Business Settings transaction into `lib/server/business/settings-command.ts` without changing the existing Server Action transport yet.

The command owns:

- persisted subscription `OPERATE` re-check inside the write transaction;
- atomic `Business` update plus `BusinessActivity` audit record;
- server-derived actor metadata and request metadata;
- typed success versus `SUBSCRIPTION_RESTRICTED` result.

The command deliberately does not own:

- redirects;
- Next.js path revalidation;
- optional Google Sheets synchronization;
- FormData parsing or UI validation;
- schema/migrations;
- financial/ledger mutations;
- Production behavior.

## Compatibility

Existing Business Settings Server Actions remain the active runtime path in this slice. The next bounded TC5 slice will wire Profile / Program / Customer Messages / Operations settings actions to this command while preserving their current redirects, revalidation and optional Sheets synchronization.

## Rollback

Because this slice introduces no runtime caller and no persistence change, rollback is deletion of the extracted command, focused tests and this document.
