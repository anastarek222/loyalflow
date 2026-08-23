# TC5 Team Provisioning Command Extraction

Status: `IMPLEMENTED_PENDING_CI`

## Scope

This bounded TC5 safe-write slice extracts the authoritative non-financial Team account provisioning lifecycle into `lib/server/business/team-provisioning-command.ts` without changing the active Server Action transport yet.

The command owns:

- persisted subscription `EXPAND` re-check inside the transaction;
- current persisted plan lookup and user-limit re-check inside the transaction;
- duplicate-email and existing-Owner re-checks before authoritative creation;
- atomic User creation and explicit verified `EmailVerificationState` enrollment;
- `USER_CREATED` BusinessActivity audit with server-derived actor/request metadata;
- durable business notification creation in the same transaction.

The existing Server Action remains responsible for:

- authenticated tenant management authorization and Owner/Super Admin role policy;
- FormData parsing and validation;
- password-policy validation and bcrypt hashing;
- experience-access resolution;
- redirects and path revalidation;
- preflight feedback for plan, email and Owner conflicts.

## Compatibility

This extraction does not wire `createBusinessUserAction` to the new command yet. Existing runtime behavior therefore remains unchanged in this slice. The following bounded TC5 slice may replace the local transaction with the command while mapping command outcomes to the same existing query-state redirects.

## Non-goals

- no Route Handler write;
- no schema or migration;
- no role or capability expansion;
- no password-policy or login-policy change;
- no financial/ledger mutation;
- no UI redesign;
- no provider/payment activation;
- no Production action.

## Rollback

Because this slice introduces no runtime caller or persistence change, rollback is deletion of the extracted command, its focused tests, and this document.
