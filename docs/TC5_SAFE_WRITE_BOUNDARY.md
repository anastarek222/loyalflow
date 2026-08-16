# TC5 Safe Write Boundary

Status: `IMPLEMENTED_PENDING_CI`

## Scope

This is the first bounded TC5 safe-write architecture slice after the completed read foundation. It defines the fail-closed rules that must hold before any web write is migrated behind a `/api/v1` Route Handler or extracted into a reusable server command.

## Policy

- Actor identity is server-session derived only.
- Tenant/business authority is server-session derived only.
- Client supplied actor, role, or tenant authority is forbidden.
- Existing Server Actions remain the compatibility transport while write ownership is extracted incrementally.
- No new write Route Handler is introduced in this slice.
- A future Route Handler write must prove an explicit same-origin CSRF guard before it can pass the boundary.
- Every migrated command must declare an idempotency policy and remain inside an authoritative transaction; transactional outbox is used when durable asynchronous side effects are part of the command.
- Financial Earn, Redeem, Adjustment, RewardUnlock, and reversal commands remain last in the migration order.

## First named consumer

The first planned safe-write consumer is **Business Settings** (Profile / Program / Customer Messages / Operations), because its existing Server Actions already enforce authenticated management, persisted subscription `OPERATE` policy, transactional Business + BusinessActivity writes, and non-financial semantics. The next slice will move the authoritative transaction into a server command boundary while preserving the current Server Action redirects and revalidation as presentation responsibilities.

## Non-goals

- no schema or migration;
- no new public/external API stability promise;
- no payment/provider activation;
- no financial/ledger write migration;
- no Production action;
- no UI redesign.

## Rollout / rollback

This slice is pure policy and regression coverage. Existing runtime writes are unchanged. Rollback is removal of the new policy/test/document until the first bounded command consumer is integrated.
