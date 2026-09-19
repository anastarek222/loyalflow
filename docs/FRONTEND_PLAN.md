# Tanee Frontend Plan

This plan covers frontend only: marketing, authentication, onboarding, authenticated SaaS UI, customer-facing pages, shared design system, responsive states, RTL/LTR, and light/dark visual behavior.

## Brand rules

1. The product name is always written as `Tanee`, including inside Arabic copy. It is never translated to Arabic script.
2. Inline occurrences of `Tanee` stay selectable text. Do not inject the full SVG wordmark inside prose, headings, buttons, pricing copy, FAQ copy, or helper text.
3. Inline `Tanee` may receive a brand treatment on the final `ee`, while inheriting the surrounding font size, weight, line-height, and layout metrics.
4. Full wordmarks are reserved for identity moments such as the marketing header/footer and dedicated authentication identity areas.

## Execution order

### Foundation
- [x] Inline Tanee canonical text/ligature reconciliation (exact A15 geometry browser-verified)
- [x] English-only Tanee brand-name authority
- [x] Stable Arabic web font
- [x] Shared RTL tracking/uppercase normalization
- [x] Shared control-height normalization started
- [x] Shared bilingual error/loading/dialog/table defaults started
- [x] Product dark semantic foundation started
- [x] Complete semantic-color migration for remaining hard-coded product surfaces

### Shared shell
- [x] Marketing header exact desktop geometry pass
- [x] Marketing footer exact desktop geometry pass
- [x] Auth shell unification
- [x] Onboarding alignment
- [x] SaaS desktop/mobile brand alignment
- [x] Shared status, toast, pagination, modal, and dropdown visual pass

#### Marketing shell verification checkpoint — 2026-09-19

Browser evidence on code SHA `b495f74fe6c70ff5953edb1b737b75cc2b26a57c`, Production PR Validation run #397:

- Shared marketing header/footer geometry passed at 1366px and 1440px across English/Arabic and light/dark variants.
- The canonical inline Tanee A15 connected-`ee` geometry passed across rendered text sizes.
- The marketing desktop geometry suite passed at both 1366px and 1440px, including fixed bilingual navigation slots.
- Marketing FAQ/browser matrix completed 74/74 passing tests.
- CI also passed full tests, typecheck, workspace boundaries, lint, build, browser smoke, and patch whitespace.
- Visual screenshot artifacts were captured for the verified marketing shell variants.
- This checkpoint closes the reopened marketing shell/A15 desktop items only; global mobile, product-page, and remaining state validation stay open.

### Marketing pages
- [x] Home
- [x] Features
- [x] Pricing
- [x] About
- [x] FAQ
- [x] Contact
- [x] Security/trust visual surfaces

### Product pages
- [x] Dashboard
- [x] Customers
- [x] Customer detail
- [x] Reports
- [x] Staff reports
- [ ] Settings
- [ ] Account security
- [ ] Team / branches / rewards / offers

#### Reports verification checkpoint — 2026-09-19

Browser evidence on code SHA `f29aaeb16fc3bf825d62ba9f50b75a5fd5f4f166`, Production PR Validation run #398:

- Reports SIMPLE passed at 390px and 1366px across English/Arabic and light/dark variants.
- Reports ADVANCED passed at 390px and 1366px across English/Arabic and light/dark variants.
- Verified period/scope filters, summary cards, ledger disclosure, advanced analytics disclosures, responsive activity table/cards, locale direction, theme parity, and no horizontal overflow.
- The run completed 16/16 PR smoke tests and 74/74 marketing/browser matrix tests, with full tests, typecheck, workspace boundaries, lint, build, browser smoke, and patch whitespace all green.
- Visual artifacts were captured for all verified Reports variants.
- Global 360/390 and 1366/1440 validation remains a separate plan-wide gate.

#### Staff reports verification checkpoint — 2026-09-19

Browser evidence on code SHA `53d7e1444a66bb58245068d0080266854ff00a9b`, Production PR Validation run #400:

- Staff reports SIMPLE passed at 390px and 1366px across English/Arabic and light/dark variants.
- Staff reports ADVANCED passed at 390px and 1366px across English/Arabic and light/dark variants.
- Verified report filters, four-card summary, SIMPLE detail suppression, ADVANCED responsive table/cards, locale direction, theme parity, and no horizontal overflow.
- The run completed 18/18 PR smoke tests and 74/74 marketing/browser matrix tests; full tests, typecheck, workspace boundaries, lint, build, browser smoke, and patch whitespace all passed.
- Visual artifacts were reviewed for the verified Staff reports variants.
- Persisted staff attribution, permissions, and reporting calculations were not changed by this frontend verification pass.


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
