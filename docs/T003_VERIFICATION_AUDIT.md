# T003 Email Verification Audit

Baseline: `main` at `bcbecc053473ae8a7a91d9b26a8ac617f95cf265`.

## Scope

Read-only product/security audit for the remaining T003 `verification` exit item. No auth-topology rewrite, dependency change, environment change, database command, or migration execution.

## Current evidence

- `User` has no persisted email-verification state such as `emailVerifiedAt`.
- There is no email-verification token model or verification route/action in the current repository.
- Owner Invitation proves possession of the invited mailbox only for the invitation redemption path because the plaintext single-use token is delivered to that mailbox.
- The separate Super Admin custom-business path still creates an active `OWNER` directly with an admin-supplied password and no email-possession verification state.
- Password-reset tokens cannot safely stand in for account verification because they represent a different lifecycle and security purpose.

## Minimum bounded implementation contract

To close the T003 verification item without changing auth topology:

1. Persist explicit user email-verification state.
2. Add a dedicated hashed, expiring, single-use verification token lifecycle.
3. Deliver only the plaintext verification token by email using the existing email-delivery infrastructure where appropriate.
4. Add a public verification endpoint/action with generic invalid/expired/replayed behavior.
5. Ensure verification consumption and user-state transition are atomic.
6. Add behavioral tests for success, expiry, replay, token hashing, and state transition.

## Approval boundary

The minimum implementation requires a Prisma schema change and authored migration. Migration execution and database commands remain separate protected actions and are not part of this audit.
