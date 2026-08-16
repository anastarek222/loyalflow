# @loyalflow/i18n

Locale messages, direction metadata, and presentation-only formatting.

Approved runtime exports:

- `@loyalflow/i18n/auth`: separately sourced English and Arabic authentication
  presentation messages with compile-time key parity. Authentication actions,
  validation, sessions, and authorization remain outside this package.
- `@loyalflow/i18n/common`: separately sourced English and Arabic shared
  messages with compile-time key parity. The existing `lib/i18n/catalog.ts`
  remains the compatibility adapter while domains are extracted incrementally.
- `@loyalflow/i18n/navigation`: separately sourced English and Arabic app-shell
  navigation messages with compile-time key parity. Navigation authorization,
  destinations, ordering, and experience-mode policy remain in the web adapter.
- `@loyalflow/i18n/owner-invite`: separately sourced English and Arabic owner
  invitation presentation messages with compile-time key parity. Invitation
  tokens, acceptance actions, password policy, and account activation remain
  outside this package.
- `@loyalflow/i18n/password-policy`: separately sourced English and Arabic
  password-policy validation messages with compile-time key parity. Password
  length/security policy and auth flow behavior remain outside this package.

Forbidden: business write policy, Prisma, HTTP handlers, provider SDKs, and secret or
server environment access.