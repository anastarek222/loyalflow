# TC5 Branch Staff Assignment Command Migration

Status: `IMPLEMENTED_PENDING_CI`

## Scope

Branch staff assignment and removal now use reusable server commands.

The Web Server Actions retain:

- authenticated branch-management context;
- opaque input parsing;
- fast persisted subscription preflight feedback;
- duplicate-assignment presentation mapping;
- redirects and route revalidation.

The authoritative commands own:

- persisted `OPERATE` subscription re-check;
- same-tenant Branch and assignment lookup;
- current User/Branch eligibility re-check inside the transaction;
- assignment create/remove;
- canonical Branch audit creation in the same transaction.

## Preserved boundaries

- no schema or migration change;
- no Route Handler write;
- no role/capability expansion;
- no financial or ledger mutation;
- no provider/payment activation;
- no UI redesign;
- no Production action.

## Acceptance

Required `Staging PR Validation` must pass before merge to `staging` using merge commit only.
