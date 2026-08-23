# LoyalFlow Final Visual — Product Owner Inputs

Status: `OWNER_INPUTS_ONLY`

This checklist intentionally contains only decisions that cannot be safely invented by implementation work. Technical/product plumbing should be completed without asking the Product Owner to make engineering decisions.

## 1. Final brand identity

Required before replacing the current LoyalFlow visual identity:

- final logo / brand mark asset;
- confirmation that the public product name remains `LoyalFlow` or an approved replacement name;
- final primary brand color;
- final secondary/supporting brand color direction if one is desired;
- preferred English and Arabic typography direction if the current safe defaults should change.

Until supplied, keep the current centralized brand/token values. Do not invent a rebrand.

## 2. Public marketing structure and claims

Product Owner decision required for content that represents the business rather than the software implementation:

- whether a standalone About page is required;
- approved About/company story and factual claims;
- whether a public Pricing/Plans page should exist for V1;
- approved public plan names, prices, capability matrix and trial policy if pricing is shown;
- approved contact/sales channel and public business contact details;
- approved testimonials, customer counts, logos or social-proof claims if any are to be shown.

Do not fabricate company history, customer numbers, testimonials, awards, geographic reach or commercial terms.

## 3. Public domain and social presentation

Before final public launch presentation:

- approved canonical public domain if it will differ from the current public origin;
- final Open Graph / social-sharing creative or approval to design one from the final brand;
- final favicon/app-icon treatment if different from the current centralized mark.

SEO plumbing can exist before these decisions; final brand/domain values are substituted only after approval.

## 4. Commercial/legal/analytics decisions

These are business decisions, not visual-cleanup tasks:

- final public plan/pricing policy;
- Provider-assisted versus future self-service checkout decision;
- legal terms / acceptance requirements;
- privacy/cookie/analytics consent policy;
- analytics provider decision if analytics is approved;
- payment provider and payment lifecycle decision if self-service payment is approved.

No implementation should infer these decisions from placeholder UI.

## 5. Final visual preference review

Once brand inputs are supplied, the Product Owner should choose/approve the visual direction for:

- Marketing website overall art direction;
- authenticated SaaS shell look and density;
- final Standard Card presentation within its existing constrained product contract;
- customer-facing digital card presentation;
- any optional illustrations, photography or brand graphics.

This is aesthetic approval only. Existing functional card safe zones, tenant/auth boundaries, loyalty rules and role authorities remain unchanged unless separately approved.

## Not required from the Product Owner

The Product Owner should not need to decide technical implementation details for:

- sitemap/robots plumbing;
- AR/EN file organization and key parity;
- component/page-layout reuse;
- semantic token wiring;
- CI/test/typecheck/lint/build commands;
- workspace package boundaries;
- migration-integrity tooling;
- standard accessibility mechanics;
- repository/branch workflow documentation.

Those are implementation responsibilities and should be handled autonomously under the existing safety gates.
