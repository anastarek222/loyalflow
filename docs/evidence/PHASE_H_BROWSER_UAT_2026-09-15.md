# Phase H Browser UAT — 2026-09-15

Status: `PARTIAL / BLOCKED`

## Exact target

- Branch: `fix/reward-truth-core`
- GitHub commit: `71e4941aeda78988c43bc9e35f0a1be7196c5d1d`
- Vercel deployment: `dpl_8X2pVyRMu5U4JggLzjLZiMWam6LH`
- Environment: protected Vercel Preview only
- Deployment state at execution: `READY`

No Production alias, Production data, schema, migration, secret, or provider was changed.

## Executed browser evidence

| Scenario               | Result | Evidence                                                                                                                                    |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Marketing routes       | PASS   | `/`, `/features`, `/pricing`, `/about`, `/faq`, and `/contact` rendered their expected page title and primary heading.                      |
| Acquisition            | PASS   | `/get-started` rendered the supported Tanee business-start surface.                                                                         |
| Authentication entry   | PASS   | `/login` rendered the login surface.                                                                                                        |
| Protected direct route | PASS   | Anonymous `/businesses/forbidden/rewards` redirected to `/login`.                                                                           |
| Arabic direction       | PASS   | Language switch produced `lang=ar`, `dir=rtl`, Arabic hero copy, and no horizontal overflow at the executed desktop viewport.               |
| Invalid Public Card    | FAIL   | `/card/not-a-valid-public-token` returned the generic failure UI; Vercel recorded HTTP 500 rather than the required 404/not-found contract. |

## Blocking evidence

The Preview runtime log for the failed Public Card request reports Prisma `P2022`: the deployed code reads `Customer.whatsappOptInAt`, but the connected Preview database does not contain that column. The repository already contains the additive migration `20260901113000_add_automatic_customer_messaging`; this run did not apply or modify it.

Because the exact Preview database is not at the schema expected by the exact code SHA, fixture-backed Customer, Owner, Manager, Staff, Viewer, Super Admin, Reward, Offer, entitlement, and mobile role journeys were not executed. They remain explicit `BLOCKED`, not passed or silently skipped. Resolving the database migration gate requires separate authorization.

## Certification outcome

Phase H is not closed. Public non-database surfaces and anonymous route protection passed on the exact Preview deployment; database-backed and role-based certification remains blocked by Preview schema drift.
