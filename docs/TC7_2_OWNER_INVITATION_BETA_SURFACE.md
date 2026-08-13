# TC7.2 Owner Invitation Beta Surface

Date: 2026-08-13
Status: `BETA_READY`

## Scope

The existing secure Owner invitation acceptance lifecycle remains authoritative. This slice makes its public surface bilingual and direction-aware, exposes a language switcher, and marks invitation pages `noindex, nofollow`.

## Safety boundaries

- invitation tokens remain opaque and are never included in metadata;
- invalid, expired, replayed, and unavailable invitations retain one generic public failure;
- the existing guarded Server Action remains the only acceptance writer;
- no schema, migration, database command, provider, credential, signup, checkout, or Production action;
- no role or Super Admin replay is required because authorization semantics are unchanged.

## Verification

- focused invitation and TC7.2 tests: 14/14 passed;
- full tests: 920/920 passed;
- typecheck passed.
