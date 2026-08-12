# @loyalflow/i18n

Locale messages, direction metadata, and presentation-only formatting.

Approved runtime exports:

- `@loyalflow/i18n/common`: separately sourced English and Arabic shared
  messages with compile-time key parity. The existing `lib/i18n/catalog.ts`
  remains the compatibility adapter while domains are extracted incrementally.

Forbidden: business write policy, Prisma, HTTP handlers, provider SDKs, and secret or
server environment access.
