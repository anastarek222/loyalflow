# T003 Super Admin MFA Audit

Baseline: `main` at `680b59747ad6d86c957f9b82f0545898653d3e66` (merged PR #46).

## Scope

Product/security decision record for the remaining T003 `Super Admin MFA decision` exit item. This slice records the approved enforcement direction and the bounded follow-up contract.

## Current repository evidence

- LoyalFlow uses NextAuth credentials authentication with JWT sessions.
- Credentials login validates email/password, account/business active state, email-verification state, and the current auth-version before issuing/continuing a session.
- `SUPER_ADMIN` is a privileged application role, but the baseline credentials flow has no second-factor challenge or MFA enrollment state.
- Baseline repository search found no TOTP, authenticator, WebAuthn/passkey, recovery-code, or two-factor implementation.
- Login rate limiting exists, but rate limiting is not a substitute for a second factor on a privileged account.

## Approved product/security decision

**Require MFA for every `SUPER_ADMIN` before Public Launch.**

This decision was explicitly approved on 2026-08-09.

## Approved persistence boundary

A bounded schema/migration for the Super Admin MFA lifecycle was explicitly approved on 2026-08-09. This authorizes schema and migration authoring only. It does **not** authorize executing a migration, connecting to a database, running seeds, or changing production data.

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

## Current implementation foundation

The implementation branch now contains authored MFA persistence models/migration plus dependency-free TOTP, authenticated secret-envelope, recovery-code, and runtime lifecycle primitives. The TOTP secret is sealed with AES-256-GCM using a domain-separated key derived from the existing auth secret at runtime; no new environment variable or repository secret was introduced.

## Non-goals

- No broad NextAuth/auth-topology rewrite.
- No MFA requirement for Owner, Staff, or Customer in this T003 slice.
- No production rollout or migration execution in the implementation PR.
- No dependency, lockfile, environment, or secret changes without their separate approval boundary.

## Remaining protected boundary

Migration execution remains separately protected. Prisma Client generation for this new schema also remains a verification step requiring its targeted approval under the current operating contract.

## T003 status impact

The **MFA decision is resolved** and the lifecycle foundation is in progress. T003 remains open until end-to-end Super Admin enrollment/challenge enforcement is implemented and verified, alongside distributed rate limiting and security-notification work.
