# TC5 Branch Creation Command Extraction

Status: `IMPLEMENTED_PENDING_CI`

## Scope

This bounded TC5 safe-write slice extracts the authoritative non-financial Branch creation lifecycle into `lib/server/business/branch-creation-command.ts` without changing the active Server Action transport yet.

The command owns:

- persisted subscription `EXPAND` re-check inside the transaction;
- current persisted plan lookup and branch-limit re-check inside the transaction;
- atomic Branch creation + canonical Branch audit activity.

The existing Server Action remains responsible for:

- authenticated tenant branch-management authorization;
- FormData parsing and branch input validation;
- duplicate-name presentation handling;
- preflight subscription/plan feedback;
- redirects and path revalidation.

## Compatibility

This extraction does not wire `createBranchAction` to the command yet. Existing runtime behavior remains unchanged in this slice. A following bounded TC5 slice may replace the local create transaction while preserving the current `subscription-restricted`, `plan-limit`, `duplicate-name`, and success outcomes.

## Non-goals

- no update/status/assignment writer migration yet;
- no Route Handler write;
- no schema or migration;
- no role/capability expansion;
- no financial/ledger mutation;
- no UI redesign;
- no provider/payment activation;
- no Production action.

## Rollback

Because this slice adds no runtime caller or persistence change, rollback is deletion of the command, its focused tests, and this document.
