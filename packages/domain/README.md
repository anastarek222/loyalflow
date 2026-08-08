# @loyalflow/domain

Contains pure business rules, use cases, and ports. Extraction starts with the loyalty
reward-progress calculation, while the root application keeps a compatibility re-export.

Allowed future internal dependency: `@loyalflow/contracts` value types only.

Forbidden: Next.js, React, Prisma concrete clients or generated models, HTTP, environment
access, provider SDKs, and application route modules.
