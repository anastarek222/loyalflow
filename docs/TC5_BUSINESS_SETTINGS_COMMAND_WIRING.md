# TC5 Business Settings Command Wiring

Status: `IMPLEMENTED_PENDING_CI`

## Scope

This slice wires the existing Business Settings Server Action compatibility layer to the authoritative `updateBusinessSettingsCommand` extracted in the previous TC5 slice.

## Runtime ownership after this slice

The server command owns:

- persisted subscription `OPERATE` re-check inside the transaction;
- atomic Business mutation + `BUSINESS_SETTINGS_UPDATED` audit record;
- server-derived actor metadata and request metadata.

The existing Server Action layer continues to own:

- authentication and business-management routing guards;
- FormData parsing and domain validation;
- loyalty economic-rule safety checks;
- optional Google Sheets synchronization after a successful command;
- Next.js path revalidation;
- user-visible redirects and query-state outcomes.

Profile, Program, Customer Messages and Operations settings continue through one compatibility adapter, but that adapter no longer owns a Prisma write transaction.

## Non-goals

- no Route Handler write yet;
- no schema or migration;
- no financial or ledger migration;
- no change to redirects, settings UI or card presentation;
- no payment/provider activation;
- no Production action.

## Rollback

The wiring can be reverted to the previous local transaction helper without a data migration because the command preserves the same Business + BusinessActivity atomic write semantics.
