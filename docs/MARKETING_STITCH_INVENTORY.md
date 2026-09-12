# Tanee Marketing Stitch Integration Inventory

Status: `FOUNDATION_READY / STITCH_EXPORTS_PENDING`

Branch: `feat/stitch-marketing-frontend`

Baseline: `4b1d8d687dacc788d8f1b434640efa5318957011`

This inventory keeps the Marketing Website isolated from the Product Core and
WhatsApp tracks. Stitch controls visual composition; current product contracts,
routes, and canonical locale copy control behavior and claims.

## Public route inventory

| Route            | Current purpose                                        | Header / footer          | Primary destinations                  | Stitch variants          |
| ---------------- | ------------------------------------------------------ | ------------------------ | ------------------------------------- | ------------------------ |
| `/`              | Marketing home                                         | Shared / shared          | `/get-started`, `/features`, `/login` | 8 received / implemented |
| `/features`      | Product capabilities                                   | Shared / shared          | `/get-started`, `/login`              | 8 pending                |
| `/pricing`       | Current entitlement limits; no public checkout         | Shared / shared          | `/get-started`                        | 8 pending                |
| `/about`         | Product positioning, without invented company claims   | Shared / shared          | `/get-started`                        | 8 pending                |
| `/faq`           | Current product and acquisition answers                | Shared / shared          | Navigation only                       | 8 pending                |
| `/contact`       | Setup, account access, and configured support channels | Shared / shared          | `/get-started`, `/login`              | 8 pending                |
| `/get-started`   | Public 14-day Trial entry and existing-account path    | Conversion header / none | Trial action, `/login`, `/`           | 8 pending                |
| `/demo`          | Owner-supplied demo embed; fail-closed when absent     | Shared / shared          | Configured media only                 | Pending if supplied      |
| `/privacy`       | Review-stage privacy baseline                          | Shared / shared          | Published contact only                | Pending if supplied      |
| `/terms`         | Review-stage terms baseline                            | Shared / shared          | Published contact only                | Pending if supplied      |
| `/data-deletion` | Public data-deletion guidance                          | Shared / shared          | `/contact`                            | Pending if supplied      |

Each `8 pending` entry means:

- Desktop Light Arabic
- Desktop Dark Arabic
- Mobile Light Arabic
- Mobile Dark Arabic
- Desktop Light English
- Desktop Dark English
- Mobile Light English
- Mobile Dark English

## Home variant mapping

| Stitch export | Verified variant      |
| ------------- | --------------------- |
| `174`         | Desktop Light Arabic  |
| `175`         | Desktop Dark Arabic   |
| `176`         | Mobile Light Arabic   |
| `177`         | Mobile Dark Arabic    |
| `178`         | Desktop Light English |
| `179`         | Desktop Dark English  |
| `180`         | Mobile Light English  |
| `181`         | Mobile Dark English   |

The dark mobile preview images exported with truncated widths, so their full
HTML sources were used alongside the visible screenshots for responsive parity.
The Home implementation preserves the approved editorial section order and
light/dark composition while replacing placeholder product-image blocks with
the existing production-safe Tanee product preview.

## Shared foundation already implemented

- One responsive Header and mobile drawer.
- One shared Footer.
- Canonical Home link is present in Header and Footer navigation.
- Arabic/English use the existing locale authority and RTL/LTR direction.
- Light/Dark uses one persistent theme preference scoped to Marketing only.
- Marketing theme state cannot restyle authenticated Product UI.
- Current CTA routes remain `/get-started` and `/login`.
- Current Trial truth is 14 days in Arabic and English Marketing copy.

## Content truth gates during Stitch parity work

- Reject every 7-day Trial claim; use 14 days.
- Reject invitation-only language for normal new-merchant acquisition.
- Do not invent public prices, checkout, testimonials, customer counts, or
  company-history claims.
- Pricing visuals may display current plan/entitlement definitions only while
  making clear that public checkout is not active.
- Preserve current route destinations and server actions even when Stitch copy
  or links are stale.
- Preserve exact Arabic/English meaning while allowing natural Arabic phrasing.
- Record any mobile/desktop or light/dark content mismatch as a Stitch defect,
  not as separate product behavior.

## Stitch ingestion contract

For every supplied page, map the eight exports to the route above, record asset
files and dimensions, then compare section order, copy, CTA destinations,
navigation, and footer before implementation. No visual parity claim is allowed
until the relevant exports are locally available and inspected.
