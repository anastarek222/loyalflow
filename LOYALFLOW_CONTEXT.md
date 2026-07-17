# LoyalFlow Project Context

## Project
LoyalFlow - Multi Tenant SaaS Loyalty Platform

## Tech Stack
- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL Neon
- NextAuth v5
- Zod validation

## Architecture
Multi-tenant system:
Business -> Users -> Customers -> Loyalty Data

Every business data must be isolated using businessId.

## Completed Foundation

### API Security
✅ Centralized API error handling
✅ APIError class with stable codes
✅ Zod request validation
✅ Rate limiting using Upstash
✅ Retry headers
✅ Security headers
✅ Environment validation

### Database
✅ Prisma schema hardened
✅ Tenant indexes
✅ Soft delete using deletedAt
✅ AuditLog foundation
✅ UsageMetric foundation

### Authentication & Authorization
✅ NextAuth JWT setup
✅ RBAC foundation
Roles:
- OWNER
- MANAGER
- STAFF

### SaaS Foundation
✅ Subscription model foundation
✅ Plan types:
- TRIAL
- BASIC
- PRO

## Current Status

Security and SaaS foundation completed.

Before starting UI/features, complete final backend cleanup:

1. Loyalty Transaction Ledger
2. Real idempotency protection
3. Atomic loyalty operations
4. Subscription schema improvements
5. Database seed system
6. Final architecture review

## Product Goal

Digital loyalty platform for businesses:
- Barbers
- Retail stores
- Small businesses

Supports loyalty modes:
1. Visits
2. Points
3. Sales Amount

Future features:
- Digital loyalty card
- Customer dashboard
- Rewards system
- White label branding