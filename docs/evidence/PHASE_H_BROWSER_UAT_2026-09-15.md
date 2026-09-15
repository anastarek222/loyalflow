# Phase H Browser UAT — 2026-09-15

Status: `PARTIAL / BLOCKED`

## Exact target

- Branch: `fix/reward-truth-core`
- Pull request: `#549`
- GitHub commit under test: `1bb36bd9e2841d46801d30b24e2bb7c69b06b0e0`
- Vercel deployment: `dpl_8hXCAqed3TbC6D1eyyj1hf3B22cP`
- Preview URL: `https://loyalflow-6eo40660c-anas-tarek.vercel.app`
- Environment: protected Vercel Preview / Staging database only
- Deployment state at verification: `READY`

No Production alias, Production data, schema, migration, secret, environment variable, provider, or WhatsApp implementation was changed.

## Previously completed browser evidence

The earlier Phase H browser pass already established the following and was not repeated unnecessarily in this follow-up:

| Scenario | Result | Evidence |
| --- | --- | --- |
| Marketing routes | PASS | `/`, `/features`, `/pricing`, `/about`, `/faq`, and `/contact` rendered successfully. |
| Acquisition | PASS | `/get-started` rendered the supported business-start surface. |
| Authentication entry | PASS | `/login` rendered the login surface. |
| Protected direct route | PASS | Anonymous protected-route access redirected to `/login`. |
| Arabic direction | PASS | Arabic switch produced RTL direction and no desktop horizontal overflow in the prior browser pass. |

The prior invalid Public Card failure was HTTP 500 caused by Prisma `P2022` for missing `Customer.whatsappOptInAt`.

## Current database verification — read-only

The staging Neon target was verified read-only before attempting the follow-up browser run:

- Neon project: `loyalflow-staging` (`divine-fog-40741793`)
- Branch ID: `br-wispy-morning-aub14jdr`
- Database: `neondb`
- Migration `20260901113000_add_automatic_customer_messaging`: applied
- `Customer.whatsappOptInAt`: present
- `Business.whatsappRedeemedMessage`: present
- `IntegrationJob.payload`: present
- Total businesses observed: `2`
- Final-UAT businesses matching `loyalflow-final-uat-*`: `0`

The migration was **not** re-applied. No `prisma db push`, schema write, migration write, or database mutation was executed during this follow-up.

## Current browser attempt

A real Playwright + Chromium runtime was discovered in the execution environment and a browser navigation was attempted against the exact protected Preview.

Result: `BLOCKED` before the application could be reached. Chromium returned `net::ERR_BLOCKED_BY_ADMINISTRATOR` for outbound HTTPS navigation. A control navigation to `https://example.com` returned the same browser-level error, proving this is an execution-environment egress restriction rather than a Tanee route failure.

The Vercel deployment itself remains `READY` and is confirmed to correspond exactly to commit `1bb36bd9e2841d46801d30b24e2bb7c69b06b0e0`. Vercel protected-URL fetches reached the Preview protection redirect, but that is not counted as Browser UAT and does not prove the invalid-card application response.

Therefore `/card/not-a-valid-public-token` could not be re-certified as 404/not-found in a real browser during this follow-up.

## Fixture gate and cleanup

The required precondition for staging fixture creation was not met because the invalid Public Card route could not be browser-certified first. Consequently:

- `scripts/prepare-final-uat-fixtures.ts` was **not executed**.
- Final UAT fixtures created in this follow-up: `0`.
- No disposable UAT credentials were generated or printed.
- No fixture-backed Owner, Manager, Staff, Viewer, Super Admin, Customer, Scan, Reward, redemption, tenant-isolation, subscription-restricted, mobile, or permission-denied journeys were executed in this follow-up.
- Cleanup command was not required because no fixtures were created; the read-only fixture count remained `0` before the browser attempt.

## Certification outcome

Phase H remains `PARTIAL / BLOCKED`.

The previous schema blocker is resolved at the staging database. The remaining blocker is the current execution environment: real Chromium exists, but its outbound network access is administratively blocked, preventing browser access to the protected Preview. No application workaround was introduced to bypass the tool/environment restriction.

To close Phase H, run the same exact Preview (or a newer Preview mapped to the current branch HEAD) from a browser-capable environment with outbound HTTPS access, verify the invalid public token returns the required not-found behavior, then run the official final-UAT fixture script on Staging, execute the remaining role/reward/mobile/isolation journeys, and run the official cleanup regardless of the UAT result.
