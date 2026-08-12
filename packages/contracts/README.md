# @loyalflow/contracts

Transport-neutral DTOs, value types, pagination shapes, and problem codes.

Approved runtime exports:

- `@loyalflow/contracts/customers/public-membership`: the public membership
  registration input, validated DTO, and stable public problem codes.
- `@loyalflow/contracts/cards/public-card`: the transport-neutral public card
  projection shared by the public page and API adapters.

Forbidden: domain behavior, Prisma model types, React, Next.js, provider SDKs, and
environment access.
