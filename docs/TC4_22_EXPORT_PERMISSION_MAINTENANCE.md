# TC4.22 Beta Export Permission Maintenance

## Implemented boundary

- Changing the existing Owner data-export permission is classified as a persisted-lifecycle `OPERATE` mutation.
- The Super Admin authorization boundary remains authoritative and subscription policy grants no new permission.
- A changed value is checked before work and re-checked inside the same authoritative transaction before the business and audit writes.
- Replaying the already-persisted value remains write-free and does not require an operational entitlement.
- Restricted states receive bounded Arabic/English feedback without changing export read access.

## Preserved safety behavior

- Existing customer and report export authorization remains unchanged.
- Business deletion remains outside subscription enforcement so lifecycle restrictions cannot trap a tenant or prevent an authorized destructive exit.
- No provider, checkout, credential, schema, migration, dependency, or Production behavior is introduced.

## Validation

- Focused source-level tests cover authorization, preflight and transactional enforcement, no-op replay, audit preservation, and bilingual feedback.
- Full tests, typecheck, workspace validation, lint, build, and patch checks remain required in CI.

