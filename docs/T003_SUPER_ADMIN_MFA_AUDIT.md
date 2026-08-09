# T003 Super Admin MFA Audit

Baseline: `main` at `680b59747ad6d86c957f9b82f0545898653d3e66` (merged PR #46).

## Scope

Read-only product/security audit for the remaining T003 `Super Admin MFA decision` exit item. This slice does not change authentication behavior, schema, dependencies, environment variables, secrets, or production configuration.

## Current repository evidence

- LoyalFlow uses NextAuth credentials authentication with JWT sessions.
- Credentials login validates email/password, account/business active state, email-verification state, and the current auth-version before issuing/continuing a session.
- `SUPER_ADMIN` is a privileged application role, but the current credentials flow has no second-factor challenge or MFA enrollment state.
- Repository search found no TOTP, authenticator, WebAuthn/passkey, recovery-code, or two-factor implementation.
- Login rate limiting exists, but rate limiting is not a substitute for a second factor on a privileged account.

## Decision options

### A. Require MFA for Super Admin

Require a second factor before a `SUPER_ADMIN` session becomes fully authenticated. This gives the strongest protection for the highest-privilege account and matches the T003 account-security objective.

A bounded first implementation should prefer standards-based TOTP or WebAuthn/passkeys, include recovery handling, and avoid weakening tenant/session controls. The exact mechanism must be chosen before code changes because it affects persistence, secret handling, recovery UX, and authentication control flow.

### B. Defer MFA

Keep password + email verification + rate limiting only and defer MFA to a later launch-readiness phase. This avoids current auth/schema work but leaves Super Admin protected by a single knowledge factor after email verification is complete.

## Recommendation

Choose **A — require MFA for Super Admin before public launch**.

For the smallest compatible T003 follow-up, use a dedicated MFA lifecycle rather than rewriting the existing auth topology. Do not enable enforcement until enrollment/recovery behavior, schema, secret handling, and rollback are explicitly approved and verified.

## Approval boundary

The recommendation is not an authorization to implement MFA. Enforcing MFA or adding its persistence/secret lifecycle changes authentication behavior and requires an explicit product/security decision plus any required schema/dependency/environment approvals.

## T003 status impact

This audit resolves the technical unknowns but does **not** close the `Super Admin MFA decision` item until the product choice (require vs defer, and if required the mechanism) is explicitly approved.
