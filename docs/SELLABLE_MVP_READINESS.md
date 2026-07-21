# Sellable MVP readiness assessment

This is a source/readiness assessment as of 2026-07-20. It does not replace
non-production UAT, production configuration, or a deployment approval.

| Area | Status | Rationale |
| --- | --- | --- |
| Loyalty engine | NEEDS UAT | Source and isolated DB verification exist; role/mode/retry journeys need consolidated browser UAT. |
| Digital card / PWA | NEEDS UAT | Source complete; mobile/RTL/LTR/public-token UAT pending. |
| Multi-reward / expiration | NEEDS UAT | DB verified; browser redemption and expiry UAT pending. |
| Promotions | NEEDS UAT | DB verified; end-to-end selection/audit UAT pending. |
| Retention analytics | NEEDS UAT | Real tenant-scoped calculations; reports/empty states need UAT. |
| Campaigns / recovery | READY NOW (manual-only) | Copy/WhatsApp handoff only; no paid automatic delivery. |
| Referrals | NEEDS UAT | DB verified; public journey and abuse checks pending. |
| Staff permissions | NEEDS UAT | DB verified; direct route/form role UAT pending. |
| Multi-branch | NEEDS UAT | DB verified; assignment/branch-context UAT pending. |
| Notes/tags / bulk operations | NEEDS UAT | DB verification where applicable; privacy/role UAT pending. |
| Offers / playbooks | NEEDS UAT | Source/offer DB verified; browser confirmation/filtering UAT pending. |
| White label | NEEDS UAT | Branding/card language and responsive card UAT pending. |
| Google Wallet readiness | OPTIONAL FUTURE FEATURE | Mapping only; no issuer/API/JWT integration. |
| Customer wallet foundation | OPTIONAL FUTURE FEATURE | Architecture/guards only; identity policy approval required. |
| Internal events / webhooks | OPTIONAL FUTURE FEATURE | Event contract only; no durable outbox/delivery. |
| Billing / paid plans | OPTIONAL FUTURE FEATURE | Free entitlements only; no billing implementation. |
| Production deployment | BLOCKED | Consolidated UAT, production DB/backups, environment, Vercel build/log, and release approval remain. |

## Customer fit

| Segment | Assessment |
| --- | --- |
| Barber, salon, coffee shop, restaurant, retail, gym | NEEDS UAT — Playbooks and core loyalty modes are source-ready; validate fixtures for each chosen flow. |
| Single-location SMB | NEEDS UAT — Current business-scoped model is suitable after final UAT/configuration. |
| Multi-branch business | NEEDS UAT — Branch foundation is database-verified; operational branch UAT is required. |
