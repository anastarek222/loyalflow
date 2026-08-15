# LoyaltyFlow UI/UX Preparation Baseline v1

Status: `RESEARCH_BASELINE_ONLY`

Repository baseline: `staging` at `3b95f926b31030659ca5448d7500b876dc7bbf2c`

This document starts the approved UI/UX preparation phase. It records the current product surface and design-system evidence without authorizing a redesign, final brand direction, color or font selection, CSS replacement, navigation rewrite, or production UI change.

## 1. Experience boundaries

LoyaltyFlow must be researched and designed as four related but distinct experiences.

| Experience | Current representative routes/components | Primary job | Density posture |
| --- | --- | --- | --- |
| Marketing website | `/`, `/get-started`, `/login`, invitation and verification routes, `components/marketing/*` | Explain, establish trust, and move a qualified visitor to the approved acquisition CTA | Low-to-medium, content-led |
| SaaS application | `/dashboard`, `/businesses/[slug]/*`, authenticated shell and business navigation | Complete daily loyalty, customer, growth, reporting, and administration work | Task-dependent, generally medium-to-high |
| Customer experience | `/card/[token]`, `/join/[slug]`, public card and card-action components | View and use a business-branded loyalty experience on a phone | Mobile-first, focused |
| Administrative/operational UI | `/operations`, `/plans`, `/business-owners`, account security, business settings | Inspect state, manage privileged configuration, and diagnose operational conditions | High clarity and information density |

These layers share foundations where appropriate, but platform chrome, business branding, and customer-card design must remain separate styling and authorization boundaries.

## 2. Current inventory snapshot

The baseline repository contains:

- 40 App Router page files under `app/**/page.tsx`.
- 85 React component files under `components/**/*.tsx`.
- 16 general primitives under `components/ui`.
- 9 page-layout primitives under `components/page-layout`.
- One authenticated shell composed from sidebar, top bar, mobile sidebar, and mobile bottom navigation.
- Separate navigation builders for the application shell, administration, growth, and reports.
- Dedicated customer-experience, marketing, reporting, growth, onboarding, card, notification, and security components.

This is an established UI system with partial standardization, not a blank-slate redesign.

## 3. Current foundations

`app/globals.css` already defines a substantial LoyalFlow foundation:

- semantic application colors for canvas, surfaces, text, borders, actions, feedback, charts, focus, selection, and disabled states;
- Arabic, Latin, and monospace font roles;
- a 4px-based spacing scale with common 8px-multiple layout steps;
- compact, standard, and touch control heights;
- semantic radius, elevation, motion-duration, easing, and mobile safe-area tokens;
- a deliberate `.lf-business-context` boundary so business branding does not replace platform chrome;
- RTL font/leading behavior, safe text wrapping, and baseline selection behavior;
- reduced-motion handling for the existing reveal animations.

The future foundation phase should preserve useful semantics and migration compatibility. It must not begin by replacing these values wholesale.

## 4. Component architecture evidence

### Existing primitives

The repository already contains reusable button, badge, avatar, card, dialog, feedback, form-control, inset, navigation, progress, scroll-area, separator, skeleton, table, toolbar, and chart components.

### Existing page patterns

Reusable page container, header, tabs, toolbar, stats, states, sticky action bar, summary panel, and templates are already present.

### Existing product components

The codebase already has product-specific patterns for:

- customer bulk operations and customer activity;
- loyalty actions, reward redemption, points/sales progress, and transaction history;
- standard and custom loyalty cards, QR/barcode presentation, public card actions, and offline behavior;
- reports, charts, growth navigation, campaigns, recovery, notifications, and onboarding;
- business settings, programme rules, card details, teams, branches, and operational administration.

The design preparation phase must inventory usage and state coverage before proposing replacements.

## 5. Initial structural findings

### F1 — Two token namespaces coexist

LoyalFlow semantic `--lf-*` tokens coexist with the shadcn-compatible token set. This is currently functional, but the ownership and mapping between them are not fully explicit. The foundation phase should define one authority and a compatibility mapping before any visual migration.

### F2 — Semantic tokens and literal styling coexist

Many product screens use semantic tokens correctly. Marketing and selected feature components also contain literal colors, custom gradients, one-off shadows, and one-off radius values. These are evidence for a later audit, not permission to normalize or delete them now.

### F3 — Reusable layout foundations exist but adoption is incomplete

`components/page-layout` provides reusable structures, while several routes still compose page shells and states directly. A route-by-route adoption matrix is required before changing shared primitives.

### F4 — Navigation is capability-aware

Application and administration navigation are already derived from server-owned role, capability, plan, business, and experience-mode context. Any information-architecture proposal must preserve those authorization boundaries and cannot infer permission from visibility.

### F5 — Mobile is a separate task model in several areas

The application already uses a mobile sidebar, bottom navigation, safe-area reservation, mobile scanner/search flows, and mobile-first public-card surfaces. Responsive research must evaluate task priority instead of merely shrinking desktop layouts.

### F6 — Internationalization is embedded in current presentation

Arabic/English copy, RTL/LTR direction, Arabic typography, and logical CSS properties are present throughout the product. Future components require a bilingual content/state matrix and cannot be reviewed in English/LTR only.

### F7 — State handling is distributed

Loading, empty, error, success, restriction, confirmation, pending, and disabled states exist, but many are defined locally. The next component inventory must record which states are centralized, duplicated, missing, or inconsistent without changing behavior.

## 6. Preparation risks

| Risk | Why it matters | Required preparation evidence |
| --- | --- | --- |
| Token authority drift | Parallel token systems can create inconsistent visual and accessibility behavior | token map, ownership rule, compatibility/migration plan |
| Premature visual normalization | Literal values may encode deliberate marketing or product behavior | usage inventory and screen-level rationale before replacement |
| Shared-component blast radius | A primitive change can alter many protected flows | caller matrix, state matrix, visual/runtime regression plan |
| Navigation simplification | Hiding or regrouping items can change discoverability or appear to change permission | role/capability/plan journey matrix and direct-route security preservation |
| Desktop-first assumptions | Public cards, scanning, and daily operations are strongly mobile-sensitive | task-specific responsive rules and real-device validation plan |
| RTL regression | Direction and copy length can invalidate layouts that appear correct in English | paired AR/EN wireframes and state review |
| Marketing proof fabrication | Current Closed Beta evidence is not the same as verified customer proof | explicit proof-source register before testimonials or metrics |
| Custom Card renderer drift | Editor, preview, and customer output must remain aligned | one shared rendering/configuration contract and version compatibility review |

## 7. Next preparation deliverables

The next UI/UX work remains documentation and research only, in this order:

1. Screen inventory classified by the four experience boundaries, actor, job, primary action, risk, and responsive priority.
2. Core journey map for Super Admin, Owner/Manager, Staff, and customer/public-card users.
3. Current information-architecture map and navigation pressure points.
4. Component usage inventory and interactive-state matrix.
5. Token authority map covering LoyalFlow, Tailwind, shadcn compatibility, and business/card theming.
6. Accessibility baseline audit against WCAG 2.2 AA requirements relevant to the existing components.
7. External reference library and inspiration matrix with an explicit “do not copy” field.
8. Low-fidelity homepage information hierarchy based on the approved acquisition mode and only verifiable proof.
9. Product strategy notes for the app shell, dashboard, customer management, Custom Card editor, rewards/gifts, and settings.

## 8. Explicit non-authorization

This baseline does not authorize:

- final color, typography, logo, illustration, or animation decisions;
- broad component rewrites;
- changing current navigation or product behavior;
- rebuilding the marketing homepage;
- redesigning the dashboard or Custom Card editor;
- adding AI panels, dark mode, command palettes, bento layouts, or decorative effects;
- weakening authentication, authorization, tenant isolation, card privacy, or release gates;
- claiming manual, staging, accessibility, responsive, or production verification.

The next gate is a reviewed preparation package, not UI implementation.
