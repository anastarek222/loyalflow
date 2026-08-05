# API Extraction Matrix

## CONFIRMED counts and rules
Inventory commands identify 10 `app/api/**/route` files, 18 `"use server"` files, 57 direct Prisma import locations, and the action symbols below. Current actions authenticate via `auth()`/NextAuth, redirect on errors, and commonly validate with Zod plus tenant `businessId` predicates. API migration must preserve those semantics.

## A–G reads, public routes, exports and API handlers
| Current symbol/path | Kind / auth / models | Proposed v1 / phase / deletion condition |
|---|---|---|
| `app/api/health/route.ts:GET`, `health/live:GET` | public health; no Prisma write | `GET /v1/health[/live]`; A; health contract/monitor parity |
| `api/auth/[...nextauth]/route` | NextAuth handler | retain adapter through B; replace only after session parity |
| `api/analytics:GET`, `analytics/historical-trends:GET` | authenticated analytics; Business/Customer/Transaction | `/v1/businesses/:id/analytics*`; G; tenant/query parity |
| `api/scan/customers:GET`, `scan/resolve:POST` | authenticated scan read/resolve | `/v1/businesses/:id/scan/*`; C; permission/rate tests |
| `api/card/[token]:GET`, `card-icon/[token]:GET`, `card-manifest/[token]:GET` | public token reads | `/v1/public/cards/:token*`; F; token DTO/no-PII tests |
| `customers/export:GET`, `reports/export:GET`, `recovery/export:GET` | authenticated download/export | `/v1/businesses/:id/*/export`; G; CSV snapshot/permission parity |
| tenant pages `businesses/[slug]/{page,customers,rewards,reports,campaigns,recovery}/page.tsx` | direct Prisma server reads | business/customer/reward/report endpoints; C–G; feature-flag read parity |
| `card/[token]/page.tsx`, `join/[slug]/page.tsx` | public Prisma reads | public-card/join DTO endpoints; F; token/slug privacy parity |

## H–N server-action inventory
| Current exported symbol | Domain / write risk | Proposed endpoint / phase |
|---|---|---|
| `loginAction`, `logoutAction` | Auth/session | session adapter; B |
| `saveOwnerOnboardingAction`, `launchOwnerOnboardingAction` | onboarding | `POST /v1/onboarding`; H |
| `updateUserLanguageAction`, `updateExperienceModeAction` | preference | `PATCH /v1/me`; H |
| `createOwnerInvitationAction`, `createBusinessAction` | business creation | `/v1/businesses`; H |
| `updateBusinessBillingAction`, `recordBusinessPaymentAction`, `updateBusinessPlanAction`, `setBusinessPlatformStatusAction`, `updatePlanLimitsAction` | billing/admin | admin/billing API; H, high authorization risk |
| `joinBusinessAction` | public customer join | `POST /v1/public/businesses/:slug/join`; H |
| `bulkCustomerAction`, `createCustomerAction` | customer safe writes | `/v1/businesses/:id/customers`; H |
| `updateCustomerAction`, `setCustomerStatusAction`, `createCustomerReferralCodeAction`, `createAndAssignCustomerTagAction`, `assignCustomerTagAction`, `removeCustomerTagAction`, `createCustomerNoteAction`, `updateCustomerNoteAction` | customer CRM writes | customer subresources; H |
| `adjustCustomerBalanceAction` | ledger adjustment | `POST /adjustments`; L; transaction, row lock, idempotency migrate last |
| `addLoyaltyAction` | earn + promotions + unlocks | `POST /loyalty/earn`; I; critical transaction |
| `redeemRewardAction` | redemption + unlock claim | `POST /rewards/redeem`; J; critical transaction |
| `createBusinessUserAction`, `updateBusinessUserExperienceAccessAction`, `setBusinessUserStatusAction`, `resetBusinessUserPasswordAction` | team/security | `/users` endpoints; H |
| `markBusinessNotificationsReadAction`, `markBusinessNotificationItemReadAction` | notification state | `/notifications/read`; H |
| `createOfferAction`, `updateOfferAction`, `toggleOfferStatusAction` | offers | `/offers`; N |
| `createRewardAction`, `updateRewardAction`, `toggleRewardStatusAction` | rewards | `/rewards`; I |
| `createBranchAction`, `updateBranchAction`, `setBranchStatusAction`, `assignStaffToBranchAction`, `removeStaffAssignmentAction` | branches | `/branches`; H |
| `applyBusinessPlaybookAction` | settings/playbook | `/playbooks/apply`; H |
| settings action exports (`updateBusinessProfileAction`, `updateProgramRulesAction`, `updateCustomerMessagesAction`, `updateOperationsSettingsAction`, `updateBusinessCardDesignAction`, `syncGoogleSheetAction`, `updateBusinessCardDetailsAction`, `updateBusinessExportPermissionAction`, `deleteBusinessAction`) | settings/integration/delete | settings API; H/N; delete last with audit/tenant tests |

## Critical transaction shortlist
`addLoyaltyAction`, `redeemRewardAction`, `adjustCustomerBalanceAction`, and `lib/loyalty/transactions.ts` are final-phase API moves. Preserve Zod validation, idempotency, customer row locks, tenant predicates, activity/notification writes, promotion and RewardUnlock behavior.

## Read-first shortlist
Health, public card, business/customer/reward list/detail, reports, analytics, scan resolution, and exports migrate before writes. Presentation helpers (`lib/loyalty/presentation.ts`, reward availability/expiry helpers) belong in `packages/domain` only when they remain pure; frontend must not make authorization, ledger, or Prisma truth decisions.

## Versioning/deprecation
Use `/v1`, additive DTOs, typed error codes (`401`, `403`, `404`, `409`, `422`, `429` as applicable), feature-flag adapters, contract and tenant-isolation tests. Remove legacy actions only after contract, integration, transaction parity, rollback, and frontend forbidden-import scans prove web is Prisma-free.
