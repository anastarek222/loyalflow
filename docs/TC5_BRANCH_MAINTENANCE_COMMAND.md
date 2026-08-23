# TC5 Branch Maintenance Command Migration

Status: `IMPLEMENTED_PENDING_CI`

## Scope

Branch update and activate/deactivate writes now use reusable server commands.

The Web Server Actions retain:

- authenticated business-management context;
- FormData / action input parsing;
- fast persisted-state preflight feedback;
- duplicate-name presentation mapping for updates;
- redirects and route revalidation.

The authoritative server commands own:

- persisted `OPERATE` subscription re-check;
- same-tenant Branch lookup inside the transaction;
- Branch update or status mutation;
- canonical Branch audit creation in the same transaction.

## Preserved boundaries

- no schema or migration change;
- no Route Handler write;
- no role/capability expansion;
- no financial or ledger mutation;
- no provider/payment activation;
- no UI redesign;
- no Production action.

Staff assignment/removal remain intentionally separate because they have additional eligibility and duplicate-assignment semantics.

## Acceptance

Required `Staging PR Validation` must pass before merge to `staging` using merge commit only.
