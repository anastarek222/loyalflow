# LoyalFlow Final Product Z Plan

Status: `Z1_PRODUCT_CONTRACT_LOCKED`

Baseline: `staging@6cdbe7935d539511f397fd7c74fb738b9d5464f3`

This document is the authoritative product contract for the Final Product Z-series. It supplements the existing TC/TR/TCR delivery controls; it does not bypass them. Staging/Beta remains the execution environment. Production, schema/migration, provider/payment, credential/secret, and environment mutations remain separately gated. Manual UAT and real-business acceptance remain deferred until explicitly resumed.

## Z-series order

1. Z1 — Final Product Contract
2. Z2 — Card Rendering Safety Contract
3. Z3 — Standard Card Professional Customizer
4. Z4 — Provider Custom Card
5. Z5 — Loyalty Program Logic & Terminology
6. Z6 — Primary Business QR + Instant Join
7. Z7 — Referral Lite
8. Z8 — Provider Provisioning + Business Onboarding
9. Z9 — Merchant Daily Operations
10. Z10 — Final Customer Experience
11. Z11 — Managed Plans & Provider Operations
12. Z12 — Final Engineering & Product Assurance
13. Z13 — Platform Brand & Website Customization
14. Z14 — Final Commercial RC

`READY_FOR_BRAND_CUSTOMIZATION` is reached after Z12. `READY_FOR_RELEASE_GATES` is reached after Z14.

## Z1 — Product roles

### Provider / Super Admin

The Provider provisions and commercially manages businesses. Provider authority includes business creation, owner assignment/invitation, plan and entitlement administration, subscription-state administration, and Provider-managed Custom Card artwork.

### Business Owner

The Business Owner operates their business inside LoyalFlow. Business Owner authority includes business profile, Loyalty Program configuration within safety rules, Standard Card customization, customers, staff, rewards, QR, reports, and day-to-day operations.

### Customer

The Customer joins a business loyalty programme, receives a loyalty card, earns loyalty value, redeems rewards, and may use supported referral functionality.

## Z1 — Card product contract

LoyalFlow has two card products only.

### Standard Card

- Business Owner managed.
- LoyalFlow-rendered and dynamically populated.
- Offers controlled customization: approved colors, themes, logo treatment, decorative artwork, typography/layout presets where supported.
- Functional geometry remains system-owned.
- QR position, required dynamic-data zones, customer identity zones, loyalty balance/progress zones, and other protected fields cannot be freely dragged or resized by the Business Owner.
- Card appearance must never mutate source customer/business/loyalty data.
- Arabic and English are presentation variants of the same card contract, not separate card configurations.

### Custom Card

- Provider/Super-Admin managed only.
- The Provider creates the artwork externally and uploads exactly one Front image and one Back image per draft version.
- LoyalFlow does not provide a Custom Card design editor, layer editor, drag/drop editor, color picker, typography editor, or QR-position editor.
- LoyalFlow overlays trusted dynamic data over the uploaded artwork using fixed protected zones.
- Dynamic overlay authority includes customer name, loyalty/member identifier, QR, loyalty balance/progress/reward data, and any other fields explicitly added to the approved overlay contract.
- Upload creates a draft; preview must precede explicit publish; the currently published card remains unchanged until publish succeeds.
- Historical artwork versions remain retained where the existing versioning implementation supports them.
- Business Owners may view Custom Card status/preview when entitled but cannot upload, edit, position, or publish Provider artwork.

## Z1 — Custom Card entitlement UX

Business-facing wording must not expose internal administrator terminology such as `Contact Super Admin`.

When Custom Card is unavailable under the current plan, the Business Owner sees a locked capability with an upgrade/provider-contact message.

When Custom Card is commercially eligible but not yet active, the Business Owner sees that the card is Provider-managed and is directed to contact their provider.

When active, the Business Owner may see the current card and status but remains read-only for Provider artwork management.

The specific commercial plan names, prices, and final capability matrix are not invented by implementation work. Existing plan/entitlement authority remains canonical until a separately approved commercial-plan decision changes it.

## Z1 — Loyalty programme terminology contract

The product distinguishes these concepts:

- Programme name: optional business-facing identity for the loyalty programme when useful.
- Loyalty mode: the economic model, currently including supported modes such as visits, points, and sales amount where the existing engine permits them.
- Unit name: the presentation label for the earned unit; it must not be presented as an unexplained duplicate of programme name.
- Earn amount: how much loyalty value an eligible operation adds.
- Reward threshold: the loyalty value required for the configured reward.
- Reward type/name: the business-facing reward outcome.

Existing historical-safety behavior remains authoritative: destructive or economically material changes must preserve history and keep existing safety/confirmation controls.

## Z1 — Managed commercial model

Current Final Product V1 is Provider-assisted, not self-service billing commerce.

Business Owner surfaces may show plan, usage, limits, locked capabilities, and provider-contact upgrade guidance. They must not introduce Buy Now, self-service Stripe checkout, automatic subscription purchase, or provider/payment behavior unless separately approved.

Provider surfaces remain the authority for plan assignment and entitled managed services under the current Beta model.

## Z1 — Non-goals

The following are not introduced by Z1:

- Custom Card visual editor.
- Business Owner Custom Card artwork upload.
- Free-form QR movement.
- Apple Wallet / Google Wallet.
- Branch- or campaign-specific QR systems.
- Advanced referral campaigns/fraud engine.
- Self-service checkout/payment activation.
- Native iOS/Android applications.
- Production deployment.
- Schema/provider/environment/secret mutations.
- Manual UAT or real-business acceptance.

## Z1 exit criteria

Z1 is closed when this contract is merged to `staging` and no current source behavior is changed by the contract itself. Z2 then becomes the next implementation authority: canonical card geometry, protected safe zones, dynamic text bounds, AR/EN rendering invariants, QR invariants, and preview/runtime renderer parity.
