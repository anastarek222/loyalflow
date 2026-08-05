# Migration Inventory

## CONFIRMED inventory (38 directories)

| Migration | Actual purpose from SQL/name | Classification / special concern |
|---|---|---|
| 20260709205131_initial_loyalty_schema | Initial Business/User/Customer/transaction/reward schema | Baseline; order root |
| 20260711020806_add_business_activity_log | BusinessActivity audit table | Additive history |
| 20260711022533_add_team_account_security | Team account security fields | Additive security |
| 20260711023407_add_whatsapp_templates | Business WhatsApp template columns | Additive |
| 20260711051230_add_business_card_details | Card presentation fields | Additive |
| 20260712163422_add_notification_read_state | Notification read state | Additive |
| 20260712210443_add_individual_notification_reads | Individual notification reads | Additive |
| 20260713182630_add_owner_export_permission | Owner export permission | Additive authorization |
| 20260713184228_add_app_languages | User language | Additive i18n |
| 20260714003329_add_sales_loyalty_and_reward_types | Loyalty mode/reward type | Compatibility-sensitive |
| 20260718143000_add_white_label_mvp_fields | White-label business fields | Additive |
| 20260720170000_add_reward_catalog | Reward catalogue | Additive; reward ownership |
| 20260720180000_add_transaction_mode_provenance | Transaction source mode | Historical snapshot |
| 20260720190000_add_loyalty_promotions | Promotion tables | Additive |
| 20260720200000_add_earn_idempotency_and_promotion_multiplier | Earn idempotency/promotion multiplier | Raw uniqueness/ledger safety |
| 20260720210000_add_reward_expiration | Reward expiry and RewardUnlock | Partial unique index; PostgreSQL-specific |
| 20260720220000_add_referral_program | Referral tables | Additive |
| 20260720230000_add_manager_and_viewer_roles | Roles | Authorization compatibility |
| 20260720240000_add_multi_branch_foundation | Branch tables | Tenant scope |
| 20260720250000_add_customer_notes_and_tags | Notes/tags | Additive CRM |
| 20260720260000_add_customer_offers | Offers | Additive |
| 20260721000000_add_business_currency_timezone | Currency/timezone | Presentation/data semantics |
| 20260721031502_add_business_profile_fields | Business profile | Additive |
| 20260721170000_add_staff_attribution_foundation | Staff attribution | Historical reporting |
| 20260722075434_add_theme_notifications_audit | Theme/notification audit | Additive |
| 20260722085251_add_business_employee_count | Employee count | Additive |
| 20260722224333_add_business_qr_position | QR position | Additive |
| 20260723044900_enforce_tenant_composite_foreign_keys | Composite tenant FKs | Raw constraints; preserve ordering |
| 20260723054319_link_reward_redemption_to_ledger | Redemption↔ledger link | Historical integrity |
| 20260723103415_add_branch_audit_activity_types | Activity enum values | Enum ordering concern |
| 20260723120000_add_owner_phone | Owner phone | Sensitive PII |
| 20260724090000_add_experience_access | Experience access | Authorization/UI access |
| 20260726220000_add_business_subscription_billing | Billing fields | Sensitive financial data |
| 20260726224500_add_subscription_plan_entitlements | Plan entitlements | Authorization/product access |
| 20260727043000_add_google_sheets_sync_state | Sheets sync state | External integration |
| 20260729090000_add_owner_onboarding_foundation | Owner onboarding | Additive |
| 20260729100000_add_standard_card_preferences | Standard card | Additive |
| 20260729113000_add_custom_card_mode | Custom card mode | Additive |

Every row is forward-only and order-dependent on the preceding migration history. SQL under each directory—not this summary—is the authoritative column/index/FK specification. `20260720210000_add_reward_expiration` creates `RewardUnlock_one_live_per_customer_reward`; `20260723044900_enforce_tenant_composite_foreign_keys` replaces simple FKs with composite tenant FKs. Both are not fully representable in Prisma schema and require SQL preservation checks.

All migrations under `prisma/migrations/` are append-only history and must never be removed or rewritten. The initial schema creates core Business, User, Customer, ledger, and reward tables. Subsequent additive migrations add card details, messaging, activity, security, languages, ownership/export, sales/reward types, white-label fields, reward catalogue, transaction provenance/idempotency/promotions, reward expiry, referrals, branches, offers, billing/entitlements, Google Sheets, cards/onboarding, and tenant foreign-key enforcement.

Critical raw-SQL inventory:

| Migration | Feature | Compatibility risk |
|---|---|---|
| `20260720210000_add_reward_expiration` | `RewardUnlock`, expiry columns, partial unique `RewardUnlock_one_live_per_customer_reward` | Prisma schema cannot fully express partial index. |
| `20260723044900_enforce_tenant_composite_foreign_keys` | Composite customer/reward tenant FKs | Preserve order and tenant integrity. |
| `20260723054319_link_reward_redemption_to_ledger` | Historical ledger linkage | Do not rewrite history. |

Each migration is PostgreSQL SQL; verify every future migration for destructive DDL, raw constraints, provider portability, and schema drift. Detailed SQL is authoritative over generated Prisma metadata where they differ.
