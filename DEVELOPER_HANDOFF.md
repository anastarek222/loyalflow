# LoyalFlow Developer Handoff

## Authoritative working state

- Repository: `anastarek222/loyalflow`
- Working/integration branch: `staging`
- Reconciled Staging checkpoint: `32162b9f8ef5e9ff67e16ae184487838e0597764`
- Current authorized phase: Product Completion closeout / Pre-Pilot source reconciliation
- Current commercial model: Provider-assisted V1 with `BETA_INVITATION_ONLY`; self-service signup and public payment checkout remain off
- Program-level roadmap authority: GitHub issue #340
- Release/runtime evidence authority: GitHub issue #206

Historical Final Visual and earlier Closed Beta documents remain useful evidence, but they do not override current repository state or issue #340.

Do not infer Production, Pilot, GA, final-domain, legal-publication, analytics-provider or commercial approval from source completion.

## What is already implemented

The repository already contains the product foundations needed for Product Completion closeout, including:

- authentication, email verification, Super Admin MFA, session invalidation and distributed login/public abuse controls;
- business/tenant isolation and role/capability permissions;
- role-aware direct workspace entry and safe auth-boundary cache invalidation across account switches;
- Provider provisioning, Owner Invitation and Business Owner onboarding;
- loyalty programme configuration and visits/points/sales-amount modes;
- customer membership, QR join, earn/redeem operations, rewards and Referral Lite;
- dashboard, operations, reports, staff/team, settings and managed plan/provider surfaces;
- Standard Card constrained customization and adaptive canonical unit labels;
- Provider-managed Custom Card artwork with protected dynamic overlays, runtime-accurate preview, retained immutable design pairs and explicit publish semantics;
- canonical card Front/Back geometry and flip rendering;
- Business Logo crop/confirmation and canonical 500 KB PNG/JPEG/WebP upload policy across current replacement/setup flows;
- Arabic RTL and English LTR support;
- reusable UI primitives and page-layout templates;
- migration integrity, workspace-boundary validation, PostgreSQL 18 CI authority and Staging PR CI;
- public marketing Home/Features/Pricing/About/FAQ/Contact routes with bilingual SEO foundations;
- centralized public canonical URL, support-channel and fail-closed legal-publication authorities;
- provider-neutral marketing conversion event authority for CTA, contact, demo, onboarding start/complete and business-created evidence.

Source readiness is not the same as runtime, human, Pilot or Production acceptance.

## Current source authorities

Use one authority rather than page-level copies or local overrides:

- public/canonical marketing origin: `lib/urls/public-site-url.ts`;
- public support channels: `lib/marketing/public-support-channels.ts`;
- legal publication profile: `lib/legal/public-legal-profile.ts`;
- marketing conversion event contract: `lib/marketing/conversion-events.ts`;
- application brand identity authority: the shared platform brand/branding modules already used by shell/auth/email surfaces;
- Business Logo validation/upload policy: `lib/branding/image-policy.ts` plus the shared Business Logo components;
- Standard Card text limits: `lib/cards/standard-card-text.ts`;
- design-system tokens: `app/globals.css` and `app/loyalflow-theme-aliases.css`;
- runtime-neutral locale ownership: `packages/i18n/src/locales/ar` and `packages/i18n/src/locales/en`;
- marketing locale ownership: `lib/i18n/locales/ar/marketing.ts` and `lib/i18n/locales/en/marketing.ts`;
- web i18n composition: `lib/i18n/catalog.ts`.

Do not replace these with per-page constants merely to satisfy a visual request.

## Current developer scope

Autonomous source work may close bounded, evidence-backed gaps from the Product Completion Master Plan and issue #340 when it does not require an Owner business decision, provider activation or Production mutation. Typical allowed slices include:

- consistency fixes that reuse an existing domain/config/design authority;
- marketing/source instrumentation that remains provider-neutral until a provider is approved;
- documentation/handoff reconciliation against current Staging;
- accessibility/responsive/i18n fixes that preserve product behavior;
- contract tests and exact-head browser receipts for existing journeys;
- removal of confirmed stale/debug/dead source where behavior is preserved.

Do not invent final domain names, brand assets, company claims, pricing, legal text, analytics vendors, support destinations, payment providers or Production configuration. If a requirement depends on those inputs, classify it as an external/manual/Owner gate instead of fabricating a source answer.

## Product boundaries to preserve

Do not change as ordinary Product Completion polish:

- tenant isolation;
- role/capability permissions;
- authentication/MFA/email-verification/session rules;
- entitlement and subscription-state enforcement;
- loyalty economic calculations;
- earn/redeem idempotency and duplicate protection;
- public-card privacy boundaries;
- Provider versus Business Owner authority;
- canonical Standard/Custom Card geometry and protected safe zones;
- current Provider-assisted, invitation-only commercial model.

Any deliberate product-rule change requires its own authority, tests and rollout gate.

## Design-system authority

- `app/globals.css` owns canonical `--lf-*` application tokens.
- `app/loyalflow-theme-aliases.css` maps compatibility names to the canonical tokens.
- `components/ui/` owns reusable controls and primitives.
- `components/page-layout/` owns shared page structures.

Do not create a new independent palette or page-specific component system during Product Completion work.

## i18n authority

- runtime-neutral locale ownership: `packages/i18n/src/locales/ar` and `packages/i18n/src/locales/en`;
- marketing locale ownership: `lib/i18n/locales/ar/marketing.ts` and `lib/i18n/locales/en/marketing.ts`;
- web composition: `lib/i18n/catalog.ts`;
- Arabic and English must remain equivalent presentations of the same product behavior.

## Card authority

### Standard Card

Business Owner managed and intentionally constrained. Current controls are approved palette/theme/artwork choices; protected functional geometry remains system-owned. The canonical unit-label authority is shared; do not introduce a page-local limit or abbreviation rule.

### Custom Card

Provider/Super Admin artwork authority and plan-gated. A Custom Card draft is one immutable **Front + Back pair uploaded together**. Both sides are required; LoyalFlow never generates, reconstructs or substitutes missing artwork.

- Accepted artwork: PNG / JPEG / WebP.
- Front and Back must have the exact same pixel dimensions and use the standard ID-1 card aspect ratio; `856 × 540` is the recommended base size.
- Artwork owns business branding, business contact/location copy, background and decorative treatment. Do not duplicate those elements with system branding or business-profile overlays.
- System-owned protected dynamic overlays remain fixed: Front = QR, customer name and the active loyalty balance/value; Back = reward plus score/progress.
- Draft preview must use the canonical runtime card renderer. Publishing is a separate explicit confirmed action.
- Complete immutable pairs remain retained for later preview/reselection; publishing switches the active pair without deleting retained versions. Exactly one pair is published for customers at a time.
- Do not invent a hard retained-version cap or persistent naming scheme unless Product Owner authority explicitly adds one.
- Standard and Custom cards must preserve the same physical aspect ratio, silhouette/corner treatment and Front/Back flip behavior; artwork is the intended visual difference.

Do not add freeform QR movement, arbitrary safe-zone movement, drag/drop card geometry, Owner-managed Custom Card artwork or system-generated Custom Card artwork as visual polish.

## Business Logo authority

Business Logo behavior has a newer explicit full-frame contract. Preserve the accepted shared renderer rather than blindly changing `object-cover` to `object-contain` from an older planning note. Current upload flows use the canonical Business Logo policy and square crop/confirmation where applicable.

Do not create route-specific size/type limits. If another Business Logo upload path is discovered, reuse the shared policy instead of duplicating `500 KB`, MIME or crop rules locally.

## Public URL, support, legal and conversion authority

- `NEXT_PUBLIC_SITE_URL` supplies the final canonical public origin through `lib/urls/public-site-url.ts`; Preview/request origins must not become canonical automatically.
- Contact support channels are optional validated configuration. Missing or invalid values must not render fabricated contact information.
- Privacy and Terms remain fail-closed/noindex until the legal profile is complete and publication status is explicitly `published`.
- Marketing conversion source is provider-neutral. The browser bridge performs no network request, cookie write or local persistence by itself.
- `business_created` and `onboarding_complete` must rely on committed Business provisioning evidence, not a pre-commit create call.
- The `demo` event exists in the taxonomy but must not be emitted until an approved Demo surface exists.

Provider selection, cookie/privacy disclosure and provider-side measurement remain separate Owner/runtime gates.

## Required development workflow

Start from current Staging:

```bash
git checkout staging
git pull --ff-only
pnpm install --frozen-lockfile
```

Before merge, validate through the repository's Staging PR Validation gate, including at minimum:

```bash
pnpm test
pnpm run typecheck
pnpm run validate:workspace
pnpm run lint
pnpm run build
git diff --check
```

Run focused browser coverage when a touched journey requires it.

Delivery workflow:

1. reconcile against the current `staging` head rather than replaying an older snapshot;
2. create a small branch from exact current `staging`;
3. make one bounded change;
4. open a PR targeting `staging`;
5. require exact-head Staging PR Validation and the applicable Vercel Preview gate;
6. merge with a merge commit only when green;
7. record material Product Completion evidence in issue #340.

No squash/rebase merge for governed completion slices. No force-push/history rewrite. Do not create meaningless product changes solely to retrigger an external gate.

## Production and data safety

The current phase does not authorize:

- Production deployment or Production data mutation;
- resets, seeds, truncation or destructive data commands;
- Production schema/migration execution;
- Production environment-variable changes;
- credential or secret changes;
- payment/provider activation;
- force-push or history rewriting;
- committing `.env`, tokens, credentials, private keys or service-account material.

Database, infrastructure, credential and Production work must be a separately approved slice with its own rollback/evidence gate. Explicit Product Owner authorization is required before Production promotion.

## External/manual gates still separate

The following cannot be declared complete from source work alone:

- final custom domain selection, DNS, Vercel/TLS, apex/www behavior and final `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` values;
- Resend sending-domain ownership, SPF/DKIM/DMARC and real password-reset/email-verification/Owner-invitation delivery certification;
- a real receivable/repliable support mailbox or forwarding destination plus final WhatsApp/phone values;
- approved final legal entity/copy/effective date and explicit Privacy/Terms publication;
- approved product/marketing analytics provider, privacy/cookie disclosure and provider-side event receipt verification;
- final approved brand assets, positioning/copy, screenshots/creative and commercial plan/pricing decisions;
- structured Manual UAT for Super Admin / Owner / Staff / Customer-Public across desktop/mobile and AR/EN, including negative/permission states;
- exact-candidate Fresh Developer rehearsal where a new developer follows the handoff on a clean environment without private verbal guidance;
- Closed Beta / Pilot with 5–10 real Businesses on an exact candidate SHA and evidence-backed defect handling;
- Product Owner GO / CONDITIONAL GO / NO-GO and explicit Production promotion/rollback checkpoint.

These are gates, not invitations to add speculative code.

## Product Owner inputs intentionally left for later

Autonomous preparation must not invent:

- final custom domain and DNS ownership choices;
- final logo/brand assets, colors or typography choices;
- public plan names, prices, trial policy or final capability matrix;
- About/company claims or customer/social-proof claims;
- final legal entity/copy/publication approval;
- final support mailbox/phone/WhatsApp destinations;
- analytics provider and privacy/cookie policy;
- approved Demo surface and demo conversion definition beyond the existing event taxonomy;
- payment-provider/checkout decision;
- final social/OG creative;
- first real Pilot Business creation;
- final Production launch decision.

`docs/FINAL_VISUAL_OWNER_INPUTS.md` remains a useful historical visual-input checklist where applicable, but current repository state plus issue #340 take precedence when it conflicts or is incomplete.

## Handoff closeout rule

A clean source tree, green CI and complete documentation are necessary but do not prove the final Handoff gate alone. Before public launch, reconcile this document to the exact release candidate and perform the required Fresh Developer rehearsal. Record the result and any evidence-backed corrections; do not mark the rehearsal complete from documentation review only.
