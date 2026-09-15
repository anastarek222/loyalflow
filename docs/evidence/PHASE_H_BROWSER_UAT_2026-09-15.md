# Phase H Browser UAT — 2026-09-15

Status: `PARTIAL / BLOCKED`

## Exact target

- Branch: `fix/reward-truth-core`
- Pull request: `#549`
- GitHub commit under browser test: `5c0c716446fece9f17868ab9e92053cb34ee6c09`
- Vercel deployment: `dpl_F6KfN276bqnqQNtQfcyHWhmXGrRM`
- Preview URL: `https://loyalflow-5d8cd6ne8-anas-tarek.vercel.app`
- Deployment state: `READY`
- External browser run: GitHub Actions run `34967292840`
- Browser: Playwright Chromium on GitHub-hosted Ubuntu runner

No Production alias, Production data, schema, migration, secret/environment setting, provider, or WhatsApp implementation was changed.

## Previously completed browser evidence

The earlier Phase H pass remains valid for these already-executed surfaces and was not repeated unnecessarily:

| Scenario | Result | Evidence |
| --- | --- | --- |
| Marketing routes | PASS | `/`, `/features`, `/pricing`, `/about`, `/faq`, and `/contact` rendered successfully. |
| Acquisition | PASS | `/get-started` rendered the supported business-start surface. |
| Authentication entry | PASS | `/login` rendered the login surface. |
| Protected direct route | PASS | Anonymous protected-route access redirected to `/login`. |
| Arabic / RTL | PASS | Arabic switch produced RTL direction and no desktop horizontal overflow in the prior browser pass. |

## Staging database verification — read-only

The designated Staging Neon target was re-verified after the external browser run:

- Neon project: `loyalflow-staging` (`divine-fog-40741793`)
- Branch: `main` (`br-wispy-morning-aub14jdr`)
- Database: `neondb`
- Migration `20260901113000_add_automatic_customer_messaging`: **applied**
- `Customer.whatsappOptInAt`: **present**
- Final-UAT business fixtures remaining: **0**

The migration was not re-applied. No `prisma db push`, schema write, migration write, or manual database mutation was executed.

## External Browser preflight

The earlier local execution environment had browser egress blocked, so a temporary GitHub Actions runner was used solely to obtain real external Chromium evidence without changing the application or Vercel environment.

The runner:

1. checked out exact product SHA `5c0c716446fece9f17868ab9e92053cb34ee6c09`;
2. installed Playwright Chromium;
3. authenticated to the exact protected Preview using a short-lived encrypted handoff;
4. opened the Preview successfully in Chromium;
5. tested `/card/not-a-valid-public-token` **before any fixture creation**.

Result:

| Scenario | Result | Evidence |
| --- | --- | --- |
| Protected Preview browser access | PASS | External Chromium authenticated and reached the exact Preview. |
| Invalid Public Card | **FAIL** | Expected HTTP `404`; actual HTTP `500`. |

The GitHub Actions error was: `Invalid Public Card expected 404, received 500`.

## Runtime evidence

Vercel runtime logs for the same deployment and request at `2026-09-15T12:12:25Z` report Prisma `P2022` from `prisma.customer.findUnique()`:

- model: `Customer`
- missing runtime column: `Customer.whatsappOptInAt`
- response: HTTP `500`

This conflicts with the designated Staging Neon target, where the migration is applied and the column is present. Therefore the protected Preview is not operating against the verified Staging database state expected by this Phase H run.

This is a Preview database-target/schema-drift gate. It is not valid to hide it by changing the Public Card query because fixture-backed UAT would then create fixtures in the verified Staging database while the Preview would continue reading a different/stale database target.

Changing `DATABASE_URL`, Vercel Environment Variables, Secrets, Schema, or migrations is explicitly outside the authorization for this Phase H run, so execution stops at this gate.

## Fixture gate and cleanup

The required invalid-card preflight failed before fixture creation. Consequently:

- `scripts/prepare-final-uat-fixtures.ts` was **not executed** in the external run.
- Final UAT fixtures created: **0**.
- Desktop, tablet, and mobile fixture-backed UAT steps were skipped.
- The workflow's emergency cleanup step executed successfully.
- Read-only Neon verification after the run confirmed final-UAT fixture count remains **0**.

The following journeys therefore remain unexecuted in the current external run: Customer join/profile, Scan, reward availability/redemption, Owner, Manager, Staff, Viewer, Super Admin, permission-denied, subscription-restricted, tenant isolation, and fixture-backed mobile/RTL coverage.

## Certification outcome

Phase H remains `PARTIAL / BLOCKED`.

The browser tooling blocker is resolved: a real external Chromium browser reached the exact Preview. The remaining blocker is now proven to be the Preview runtime database target/state: the Preview still returns Prisma `P2022` for a column that exists in the designated Staging Neon database.

To continue Phase H, the Preview runtime must first be pointed at the already-migrated designated Staging database (or its actual Preview database must be brought to the already-approved migration state) under a separately authorized Environment/Database gate. After that, rerun the invalid-card preflight; only when it returns `404` should the official staging fixtures be created and the remaining browser journeys executed, followed by official cleanup regardless of result.
