# TC2.6 Owner Invitation Locale Extraction

Date: 2026-08-16
Status: `IMPLEMENTED_PENDING_CI`
Environment: code and synthetic test evidence only

## Outcome

The 11 existing Owner Invitation presentation messages are now separately
sourced in Arabic and English under `@loyalflow/i18n/owner-invite` with
compile-time key parity. The compatibility catalog composes those messages
instead of owning duplicate inline values.

The public invitation page keeps the same route, locale resolution, token
preservation, `noindex` metadata, password length constraints, form action, and
error keys. Invitation acceptance, account activation, password policy,
authentication, sessions, authorization, database writes, and security behavior
are unchanged.

## Evidence boundary

Focused source/parity/compatibility tests are included in this branch. Full
Staging PR Validation remains required before the slice can be marked verified.
This is Internal/Synthetic Beta evidence only and does not satisfy runtime auth,
Real Closed Beta, Production, launch, or GA evidence.
