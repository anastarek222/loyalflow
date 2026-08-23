# @loyalflow/domain

Contains pure business rules, use cases, and ports. Extraction starts with the loyalty
reward-progress calculation and read-only ledger reconciliation, while the root
application keeps compatibility where legacy imports already exist.

The provider-neutral subscription lifecycle is a pure policy foundation only.
It does not persist state, consume provider events, activate checkout, or grant
authority outside the application's existing role and tenant boundaries.

Allowed future internal dependency: `@loyalflow/contracts` value types only.

Forbidden: Next.js, React, Prisma concrete clients or generated models, HTTP, environment
access, provider SDKs, and application route modules.
