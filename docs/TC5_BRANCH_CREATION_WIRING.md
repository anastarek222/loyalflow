# TC5 Branch Creation Wiring

Status: `IMPLEMENTED_PENDING_CI`

## Scope

The existing Branch creation Server Action now delegates authoritative persistence to `createBranchCommand`.

The Web compatibility layer still owns:

- authenticated business-management context;
- FormData parsing and validation;
- fast subscription and plan-limit preflight feedback;
- duplicate-name presentation mapping;
- redirects and route revalidation.

The server command owns the final persisted-state decision and atomic write:

- persisted subscription `EXPAND` re-check;
- current plan and editable Branch limit re-check;
- Branch creation;
- canonical Branch audit creation.

## Preserved boundaries

- tenant authorization is unchanged;
- Branch input normalization is unchanged;
- duplicate-name behavior remains bounded;
- no schema or migration change;
- no Route Handler write;
- no financial or ledger mutation;
- no provider/payment activation;
- no Production action.

## Acceptance

Required `Staging PR Validation` must pass before merge to `staging` using merge commit only.
