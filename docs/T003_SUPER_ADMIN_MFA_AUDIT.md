# T003 Super Admin MFA Audit

Baseline: `main` at `680b59747ad6d86c957f9b82f0545898653d3e66` (merged PR #46).

## Scope

Product/security decision record for the remaining T003 `Super Admin MFA decision` exit item. This slice records the approved enforcement direction and the bounded follow-up contract; it does not itself change authentication behavior, schema, dependencies, environment variables, secrets, or production configuration.

## Current repository evidence

- LoyalFlow uses NextAuth credentials authentication with JWT sessions.
- Credentials login validates email/password, account/business active state, email-verification state, and the current auth-version before issuing/continuing a session.
- `SUPER_ADMIN` is a privileged application role, but the current credentials flow has no second-factor challenge or MFA enrollment state.
- Repository search found no TOTP, authenticator, WebAuthn/passkey, recovery-code, or two-factor implementation.
- Login rate limiting exists, but rate limiting is not a substitute for a second factor on a privileged account.

## Approved product/security decision

**Require MFA for every `SUPER_ADMIN` before Public Launch.**

This decision was explicitly approved on 2026-08-09. It closes the product-choice portion of the T003 MFA item, but it does not claim that MFA enforcement is implemented yet.

## Bounded implementation direction

The smallest compatible follow-up is a dedicated Super Admin MFA lifecycle rather than an auth-topology rewrite.

Preferred first mechanism: standards-based TOTP with recovery codes. The implementation must:

- require a second factor before a `SUPER_ADMIN` session becomes fully authenticated;
- support enrollment and recovery without weakening existing password, email-verification, auth-version, or session-revocation controls;
- store only hashed recovery codes;
- protect the TOTP secret at rest rather than storing it in plaintext;
- rate-limit MFA verification attempts;
- invalidate or rotate relevant sessions when MFA enrollment/recovery state changes;
- keep non-`SUPER_ADMIN` authentication behavior unchanged;
- include behavioral tests for enrollment, valid/invalid/replayed recovery, rate limiting, and enforcement.

## Non-goals

- No broad NextAuth/auth-topology rewrite.
- No MFA requirement for Owner, Staff, or Customer in this T003 slice.
- No production rollout or migration execution in the implementation PR.
- No dependency, lockfile, environment, or secret changes without their separate approval boundary.

## Remaining approval boundary

Implementing the approved direction requires persistent MFA enrollment/recovery state. That means a bounded schema/migration change is still required before implementation can proceed. Migration authoring may be approved separately from migration execution; executing any migration against a database remains a separate protected action.

## T003 status impact

The **MFA decision is resolved**: MFA is mandatory for `SUPER_ADMIN` before Public Launch. T003 remains open until the approved lifecycle is implemented and verified, alongside the remaining distributed rate limiting and security-notification work.
