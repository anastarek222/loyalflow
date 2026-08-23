# TC5 Team Provisioning Command Wiring

Status: `IMPLEMENTED_PENDING_CI`

## Scope

This bounded TC5 slice wires `createBusinessUserAction` to the previously extracted `provisionBusinessUserCommand` while preserving the existing Team workspace transport and user-visible outcomes.

## Runtime ownership after this slice

The server command owns:

- persisted subscription `EXPAND` re-check;
- persisted current-plan and user-limit re-check;
- duplicate-email and existing-Owner re-check;
- atomic User creation + verified EmailVerificationState enrollment;
- USER_CREATED audit and business notification.

The existing Server Action continues to own:

- authenticated tenant management authorization;
- Owner/Super Admin role policy;
- FormData and password-policy parsing;
- bcrypt hashing;
- experience-access resolution;
- preflight feedback;
- redirect/query-state mapping and path revalidation.

Command failures map back to the existing Team outcomes: subscription restriction, plan limit, Owner exists, duplicate email, or missing Business. Successful creation keeps the existing `created=1` destination.

## Non-goals

- no Route Handler write;
- no schema or migration;
- no role/capability expansion;
- no password/login policy change;
- no financial/ledger mutation;
- no UI redesign;
- no provider/payment activation;
- no Production action.

## Rollback

The wiring can be reverted to the previous local transaction without a migration because the command preserves the same persisted Team lifecycle while centralizing authoritative re-checks.
