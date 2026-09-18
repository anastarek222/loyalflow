# Tanee Frontend Plan

This plan covers frontend only: marketing, authentication, onboarding, authenticated SaaS UI, customer-facing pages, shared design system, responsive states, RTL/LTR, and light/dark visual behavior.

## Brand rules

1. The product name is always written as `Tanee`, including inside Arabic copy. It is never translated to Arabic script.
2. Inline occurrences of `Tanee` stay selectable text. Do not inject the full SVG wordmark inside prose, headings, buttons, pricing copy, FAQ copy, or helper text.
3. Inline `Tanee` may receive a brand treatment on the final `ee`, while inheriting the surrounding font size, weight, line-height, and layout metrics.
4. Full wordmarks are reserved for identity moments such as the marketing header/footer and dedicated authentication identity areas.

## Execution order

### Foundation
- [x] Inline Tanee text component
- [x] English-only Tanee brand-name authority
- [x] Stable Arabic web font
- [x] Shared RTL tracking/uppercase normalization
- [x] Shared control-height normalization started
- [x] Shared bilingual error/loading/dialog/table defaults started
- [x] Product dark semantic foundation started
- [x] Complete semantic-color migration for remaining hard-coded product surfaces

### Shared shell
- [x] Marketing header pixel pass
- [x] Marketing footer pixel pass
- [x] Auth shell unification
- [x] Onboarding alignment
- [x] SaaS desktop/mobile brand alignment
- [x] Shared status, toast, pagination, modal, and dropdown visual pass

### Marketing pages
- [x] Home
- [x] Features
- [x] Pricing
- [x] About
- [x] FAQ
- [x] Contact
- [ ] Security/trust visual surfaces

### Product pages
- [ ] Dashboard
- [ ] Customers
- [ ] Customer detail
- [ ] Reports
- [ ] Staff reports
- [ ] Settings
- [ ] Account security
- [ ] Team / branches / rewards / offers

### Customer-facing
- [ ] Customer card
- [ ] Join
- [ ] Invalid/expired card state
- [ ] Invalid/expired join state
- [ ] Global 404/error state

### Validation
- [ ] 360px and 390px narrow-mobile pass
- [ ] 1366px and 1440px desktop pass
- [ ] Arabic/English parity
- [ ] Light/dark parity where supported
- [ ] Loading/empty/error/disabled/focus states
- [ ] Visual-regression screenshots for critical routes

## Definition of done

A frontend task is not complete until the relevant Arabic/English, mobile/desktop, light/dark, and state variants have been checked without layout regression. Render-only issues such as logo optical alignment must be closed with browser evidence, not source inspection alone.
