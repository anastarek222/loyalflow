# LoyalFlow UAT checklist

For final release qualification, use
`docs/CONSOLIDATED_UAT_RUNBOOK.md` as the single executable runbook. This
document remains supporting phase-by-phase detail; neither checklist is UAT
evidence until its rows are executed against isolated non-production fixtures.

Run this only against an approved non-production or explicitly approved
production-like database. Use newly created test tenants and customers; do not
alter real customer balances for UAT.

## Preparation

- [ ] `npx prisma migrate status` succeeds against the intended database.
- [ ] The deployment uses the canonical HTTPS `NEXT_PUBLIC_APP_URL`.
- [ ] Create two active businesses, one owner per business, one staff user in
  business A, and an inactive staff user for an authentication check.
- [ ] Configure business A once for each loyalty mode: `VISITS`, `POINTS`, and
  `SALES_AMOUNT`.

## Super Admin

- [ ] Can create and activate/deactivate businesses.
- [ ] Can manage users and view reports for either tenant.
- [ ] Can export permitted tenant data; exports reject spreadsheet formulas.
- [ ] Cannot use an inactive business or inactive user session after the next
  request.

## Owner

- [ ] Can update branding, language, loyalty rules, card information, and
  message templates for their own business only.
- [ ] Can create/deactivate customers, manually adjust balances with a reason,
  and view actor/time/reason in transaction history.
- [ ] Can create staff, but cannot access a second tenant’s users, customers,
  QR scans, reports, activity, or exports.
- [ ] Sees segment filtering, retention KPIs, total/inactive customers, and
  first-reward timing based only on their tenant.

## Staff

- [ ] Can search or scan a card from their assigned business and earn/redeem
  loyalty only for that business.
- [ ] Cannot open a cross-tenant scanned card, manage settings/users, manually
  adjust balances, or export data.
- [ ] Redemption requires explicit confirmation and refuses insufficient funds.
- [ ] A double-click/rapid repeat earn or redemption is blocked without adding a
  second transaction or activity record.

## Promotions

Use two newly created `lf-uat-promo-*` businesses and disposable customers.
Prepare promotion rules only in the non-production database; do not modify an
existing customer or a production tenant. Retain the resulting transaction and
promotion-application IDs as evidence, then delete only the two UAT businesses.

- [ ] No promotion: earn the configured base amount and confirm no
  `PromotionApplication` exists, the transaction amount is the base amount,
  and the customer balance increases only by that amount.
- [ ] One fixed-bonus rule: confirm final credit is `base + fixed bonus`; the
  audit row records both base and bonus amounts.
- [ ] One multiplier rule: confirm a `2×` rule turns base `3` into total `6`,
  not `9`; a fixed bonus, if configured, is added separately.
- [ ] Multiple matching rules: confirm the largest computed bonus wins; ties
  resolve by oldest rule, then rule ID.
- [ ] Inactive and expired rules: confirm neither changes balance nor creates
  an audit row.
- [ ] Wrong tenant: confirm a promotion from business B cannot be selected
  while earning in business A.
- [ ] Double submit/retry: submit the same earn form twice before refreshing.
  Confirm exactly one transaction and one `PromotionApplication` exist, and
  the balance changes once.
- [ ] Transaction history: confirm the earned transaction shows the final
  credited amount and the customer balance matches it. Verify the matching
  `PromotionApplication` records the rule, base amount, bonus amount, tenant,
  customer, and transaction IDs.

## Customer

- [ ] A public `/join/[slug]` QR registers a customer only in the scanned
  active business, rejects duplicate phones, and redirects to that customer’s
  opaque public card.
- [ ] The public card opens over HTTPS, has a working QR, correct balance and
  reward progress, recent transactions, configured brand, and Arabic/English
  default language behavior.
- [ ] A public token cannot reveal another customer or tenant, and a malformed
  QR value is rejected by the staff scanner.
- [ ] Repeated reward cycles show correct post-redemption balance and history.

## Evidence to retain

- [ ] Deployment URL and Vercel production build log.
- [ ] Migration-status output with secrets removed.
- [ ] Test tenant IDs/names, not customer phone numbers or public tokens.
- [ ] Screenshots of each role’s completed journey and any failed authorization
  attempt.
- [ ] Promotion UAT screenshots plus the matching isolated transaction and
  promotion-application IDs.

## Reward expiration

Use an isolated `lf-uat-expiry-*` business and disposable customers after
`20260720210000_add_reward_expiration` is applied to the approved non-production
database. Do not modify a production customer or remove any balance to test expiry.

- [ ] Leave expiry empty on one reward and confirm it remains redeemable under the legacy balance behavior.
- [ ] Set a one-day expiry on a second reward. Earn enough balance to unlock it; confirm staff sees an active status and deterministic expiry time, and the customer card shows it as valid.
- [ ] At the exact displayed expiry instant, try redemption. Confirm it is refused, the customer balance and redemption history do not change, and an expiry/blocked-redemption activity entry is visible.
- [ ] Before expiry, redeem an active reward. Confirm normal balance deduction, redemption history, and redeemed unlock state.
- [ ] Create a second business and verify its reward/unlock cannot be shown or redeemed in the first tenant.
- [ ] Confirm a balance that existed before expiry was enabled still follows the documented legacy fallback; it is never silently removed.

## Lost customer recovery

Use an isolated `lf-uat-recovery-*` business with inactive and at-risk customers.

- [ ] Owner sees only the deterministic inactive or at-risk audience selected in the recovery page; a customer from a second tenant is absent.
- [ ] Each row previews a personalised message; **Copy message** copies text only and does not send it.
- [ ] **Open WhatsApp** opens a `wa.me` draft with the same message and requires staff to send it manually.
- [ ] CSV export follows the existing owner export setting; staff cannot export it. Confirm exported rows match the selected audience and spreadsheet formulas are escaped.
- [ ] Confirm this flow makes no automatic message, paid SMS request, or WhatsApp API request.

## Campaign Builder Lite

Use an isolated `lf-uat-campaign-*` business. This is a staff-reviewed manual
handoff, not a delivery system.

- [ ] An owner can open `/businesses/[slug]/campaigns`; staff and a second tenant are redirected and never see the campaign audience.
- [ ] Change each trigger (welcome, balance update, reward ready, one away, win-back) and confirm its deterministic default audience and configured template preview.
- [ ] Switch audience filters and confirm each previewed customer belongs only to the selected tenant and audience; confirm empty audiences are explicit.
- [ ] Add/remove an optional offer and confirm it appears only in the preview/copy/WhatsApp draft, not in any stored customer data.
- [ ] **Copy message** copies text only. **Open WhatsApp** opens a `wa.me` draft; no message is sent until staff explicitly sends it in WhatsApp.
- [ ] Confirm no campaign event, scheduled delivery, paid SMS request, paid WhatsApp API request, or provider credential is created by this feature.

## Referral Program

Use an isolated `lf-uat-referral-*` business and disposable customers after
`20260720220000_add_referral_program` is applied to the approved non-production
database. Do not use a real customer, and do not configure an automatic reward.

- [ ] An owner creates a referral link from a customer detail page; it is opaque, fixed-length, and scoped to that business.
- [ ] The public card shows the invitation-copy affordance only after a referral link exists. The link opens that business's `/join/[slug]` form.
- [ ] A newly registered customer using the active link creates exactly one referral record and one `REFERRAL_RECORDED` activity in the same tenant.
- [ ] A link from business A cannot attribute a signup in business B. An inactive referrer/link, malformed code, existing customer, or attempted self-referral records no referral.
- [ ] A referred signup does not add points, alter either balance, create a loyalty transaction, or create a reward. Referral incentive policy remains disabled.
- [ ] Staff cannot create referral links; owners/super-admins can. Confirm the referral link and record never cross tenant boundaries.

## Advanced Staff Permissions

Use an isolated `lf-uat-permissions-*` business with one account per role. Test
each account against a second tenant in a separate browser session.

- [ ] Owner has every listed capability within its own business: customer view/edit, earn/redeem/adjust, reports, staff management, and settings; cross-tenant access is refused.
- [ ] Manager can view/edit customers, earn/redeem/adjust, and view reports. Manager cannot manage staff, edit settings, create referral links, or access another tenant.
- [ ] Staff / Cashier can view customers and earn/redeem loyalty. Staff cannot edit customers, adjust balances, view reports, manage staff, edit settings, or access another tenant.
- [ ] Viewer can view customers and reports only. Viewer cannot submit earn, redeem, edit, adjustment, staff, or settings actions, including by direct URL/form submission.
- [ ] Existing OWNER and STAFF accounts retain their current roles and access after migration. Create one new Manager and one new Viewer; verify the role labels in Arabic and English dashboard contexts.
- [ ] Owner can manage non-owner accounts but cannot deactivate or reset another owner; only a super admin can manage owners across tenant boundaries.

## Multi-branch foundation

Use two isolated `lf-uat-branch-*` businesses after
`20260720240000_add_multi_branch_foundation` is applied to the approved
non-production database. Do not create a default branch for an existing
business and do not rewrite historical transaction data.

- [ ] Create two active branches for business A and one for business B. Confirm optional address/contact details and active/inactive state are visible only to business A staff with appropriate access.
- [ ] Assign a Cashier/Staff user only to branch A1. Confirm the user can select and record only against A1; branch A2 and business B are refused both in the UI and on a direct request.
- [ ] Confirm an Owner and Manager of business A can use either active A branch, while a Viewer can never submit loyalty writes.
- [ ] Deactivate A2 and confirm earn, redemption, and adjustment attempts are blocked without changing a customer balance, transaction, redemption, or activity record. Its historical records remain visible in branch reporting.
- [ ] Record earn, redemption, and adjustment against A1. Confirm each transaction, redemption where applicable, and activity entry shows A1; customer membership, rewards, promotions, and referrals remain business-wide.
- [ ] Confirm branch-filtered reports contain only the selected branch and branch comparisons use the correct totals. An unfiltered business report includes historical records with no branch as pre-branch/business-wide activity.
- [ ] Confirm a second tenant cannot retrieve, filter, compare, or attach business A's branch data. Existing single-location tenants continue operating with no selected branch and no new default branch.

## Customer Notes and Tags

Use two isolated `lf-uat-notes-*` businesses after
`20260720250000_add_customer_notes_and_tags` is applied to the approved
non-production database. Notes are private staff metadata: do not enter real
customer-sensitive information during UAT.

- [ ] As an Owner or Manager in business A, create reusable tags such as `VIP`, `Premium Customer`, and `Weekend Customer`; assign and remove them from a customer. Confirm tags appear on the staff customer list/detail only.
- [ ] Filter the customer list by each tag while also using search, status, and segment filters. Confirm pagination retains the tag filter and only business A customers are returned.
- [ ] Try assigning a tag from business B to a business A customer by URL/form manipulation. Confirm it is rejected and neither assignment nor audit activity is created.
- [ ] Add and edit an internal note as Owner/Manager. Confirm the note shows creation/update actor and timestamp, while the timeline records only a generic auditable event—not the note contents.
- [ ] As Staff and Viewer, confirm tags and notes are readable in the permitted tenant customer view but no create, assign, remove, or edit controls/actions succeed. Confirm all roles are refused across tenants.
- [ ] Open the customer public card and `/api/card/[token]`. Confirm neither tag names nor note content/metadata is rendered or returned.
- [ ] Confirm existing customers without tags/notes still search, segment, export, display, and operate normally. No balance, loyalty transaction, branch reference, or customer card data changes during this feature.

## Duplicate Customer Management

Use two isolated `lf-uat-duplicate-*` businesses. This phase is read-only:
do not merge, delete, alter balances, or alter public tokens during UAT.

- [ ] Seed two customers in business A with formatting variants of the same valid phone number through a controlled fixture/import-like path. Confirm only business A's Owner/Manager can open `/businesses/[slug]/duplicates` and sees the normalized-phone reason.
- [ ] Confirm the review shows both candidate records with current balance, lifetime figures, recent loyalty/reward history, tags, private-note previews, referral counts, and recent activity. Existing customer detail links must remain tenant-scoped.
- [ ] Confirm different normalized phones produce no group, and an identical phone in business B never appears in business A's review.
- [ ] Confirm Staff and Viewer cannot open the review route or obtain its data by direct navigation; a public card and CSV export do not expose duplicate-review state or private-note information.
- [ ] Confirm email matching is labelled unavailable because the current Customer schema stores no email. Do not infer an email from notes, phone, public token, or external data.
- [ ] Confirm the proposed survivor is visibly a non-executable preview only. There must be no merge, delete, balance transfer, transaction/reward/referral/tag/note reassignment, public-token redirect, or activity mutation.

## Bulk Customer Operations

Use an isolated `lf-uat-bulk-*` business with more than one customer, active
and inactive accounts, and at least two tags. This feature operates only on the
currently visible, filtered customer page; it has no background job.

- [ ] As Owner/Manager, combine search, status, segment, and tag filters. Select individual visible customers, use **Select visible**, then **Clear selection**. Confirm no customer outside the current page becomes selected.
- [ ] Add a tag to selected customers and remove it again. Confirm the exact affected count, corresponding tenant-only activity entries, and no change to notes, balances, loyalty transactions, rewards, referrals, branch context, or public cards.
- [ ] Activate selected inactive customers and deactivate selected active customers. Deactivation must show an explicit confirmation naming the count. Confirm only records whose status actually changed receive activity entries.
- [ ] Manipulate a selected customer ID from a second tenant or an invalid ID. Confirm the whole bulk operation is refused with no partial changes.
- [ ] As Staff and Viewer, confirm the bulk controls and duplicate-review controls are absent and direct bulk requests are refused. Manager/Owner remain restricted to their own tenant.
- [ ] With existing export permission enabled, export selected customers only. Verify every CSV row belongs to the selected current tenant set and the file does not include notes, public tokens, or secrets. A Manager who lacks the existing owner export permission cannot export.
- [ ] As an Owner, hand selected customers to the Campaign Builder. Confirm its preview is limited to that set, remains manual copy/WhatsApp handoff only, and creates no campaign delivery, provider request, or background job.

## Offers

Use two isolated `lf-uat-offers-*` businesses and disposable customers after
`20260720260000_add_customer_offers` is applied to the approved non-production
database. Offers are customer-facing incentives only: do not use them to change
balances, transactions, rewards, promotion applications, or campaign delivery.

- [ ] As Owner and Manager in business A, create, edit, activate, and deactivate an all-customers offer. Confirm Staff and Viewer can view the tenant list if permitted but cannot submit any offer management action, including by direct request.
- [ ] Create active, inactive, expired, and future offers. Confirm the public card and `/api/card/[token]` show only the active offer inside its inclusive UTC date range; the empty state is clear when none qualify.
- [ ] Create a segment offer for an Active customer and a VIP-only offer for a customer meeting the existing deterministic VIP threshold. Confirm each card sees only the matching offer, and a customer from business B sees neither.
- [ ] Open the public card/API response and confirm it exposes only offer name, description, and public end date. It must not expose audience type, target segment, internal eligibility rules, customer tags/notes, branch assumptions, or staff metadata.
- [ ] Inspect the affected customer before and after browsing/previewing offers. Confirm balance, lifetime earned/redeemed, loyalty transactions, reward unlocks/redemptions, promotion applications, referrals, and campaign state are unchanged.
- [ ] Confirm a legacy business with no offers continues to display normally and no offer data appears in its public response beyond an empty public list/state.
- [ ] Confirm branch and birthday targeting are unavailable in this phase: customer birthday is not stored and public cards have no branch context, so neither may be inferred or presented as eligible.

## Business Playbooks

Use an isolated `lf-uat-playbook-*` business. Playbooks must only set editable
Business defaults and one generic activity record; they must never create a
reward, promotion, offer, campaign, provider request, or paid integration.

- [ ] As an Owner, open `/businesses/[slug]/playbooks`, preview Barber, Coffee Shop, Salon, Retail, Gym, and Restaurant templates, and confirm the preview lists normal loyalty settings plus non-persistent suggestions.
- [ ] Apply one template to a new/default business. Confirm its loyalty mode, unit, reward name/description, threshold, earn amount, and programme naming update together; then edit those values normally in Settings.
- [ ] Confirm the activity log has one generic playbook/settings activity and no reward, promotion, offer, campaign, balance, transaction, or customer record was created.
- [ ] On a configured business, confirm application is refused until the Owner checks the explicit overwrite confirmation. After confirmation, only the displayed settings change; customers, balances, branding, card language, branches, rewards, promotions, offers, referrals, and history remain intact.
- [ ] Reapply the same template and confirm the no-op/already-applied message with no duplicate activity or related record.
- [ ] As Manager, Staff, Viewer, and a second tenant Owner, confirm the page/action is refused. Super Admin may use the normal scoped management path.

## Customer Wallet Foundation

Phase V ships no customer wallet UI, global identity, claim route, or schema.
Use isolated test tenants only to confirm the existing public-card and tenant
boundaries are unchanged; do not attempt to infer identity from real phones.

- [ ] Create customers with the same normalized phone in two businesses. Confirm they remain two independent customer records with distinct public cards, balances, histories, referrals, notes/tags, and staff visibility.
- [ ] Open either public card and its `/api/card/[token]` response. Confirm it shows only that one membership and provides no wallet, other-business, identity-link, or membership-enumeration affordance.
- [ ] As each business's staff/owner, confirm customer search, duplicate review, exports, reports, and activity continue to exclude the other tenant, even when phone formatting matches.
- [ ] Confirm no customer login, customer credential reset, SMS OTP, email magic-link, automatic link, or claim action is presented in this phase.
- [ ] Keep evidence that legacy public-card URLs/tokens still resolve their original single business customer after the architecture-only release.

## Google Wallet Readiness

Phase W creates no Google Wallet Class, Object, JWT, Save-to-Wallet button, API
request, issuer credential, or production pass. Use an isolated business/card to
confirm the normal card is unchanged while the feature remains disabled.

- [ ] Confirm the public card, per-card PWA manifest, icon, QR code, offline support, branding, balance/progress, reward state, offers, and staff scanner work as before with `GOOGLE_WALLET_ENABLED=false`.
- [ ] Exercise VISITS, POINTS, and SALES_AMOUNT programs and confirm their existing balances/progress/reward-ready behavior remains the source of truth; no independent wallet balance or pass state is visible or stored.
- [ ] Confirm a malformed logo/color or non-HTTPS environment/card URL cannot surface an Add to Google Wallet control or alter the normal public card.
- [ ] Confirm a customer from a second tenant cannot obtain another tenant's public-card data through any readiness/configuration path. Offers remain public-eligibility filtered only.
- [ ] Before future activation, retain evidence of issuer account approval, API enablement, server-only service-account secret management, canonical HTTPS origin configuration, a successful isolated real pass creation, pass update/revocation tests, and provider failure handling. Do not mark this item complete from mapping tests alone.

## Internal Events and Feature Entitlements Foundations

Phases X and Y create no durable event, webhook, queue, billing record, payment
flow, or remote plan. Confirm all normal behaviour remains unchanged.

- [ ] Confirm earn, redemption, adjustment, customer updates, reward state, and business settings still create their existing tenant-scoped records/activity without any outbound HTTP request, background job, customer message, or delivery retry UI.
- [ ] Confirm a staff member from business B cannot access or consume business A activity, transaction, or future event context through direct navigation or API manipulation.
- [ ] Confirm all current free features remain available according to their existing role/permission checks. No plan selector, payment collection, subscription state, or paid-provider activation is shown.
- [ ] Confirm a disabled Google Wallet flag or any entitlement state does not display an Add to Google Wallet control, create a pass, or bypass issuer credentials/production activation.
