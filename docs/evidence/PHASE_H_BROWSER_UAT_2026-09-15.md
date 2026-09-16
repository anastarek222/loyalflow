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

## Designated Staging database verification — read-only

The intended Staging Neon target was re-verified after the external browser run:

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

## Exact Preview database target — read-only proof

The Preview database mismatch is now identified, not merely inferred.

At the failed external-browser request, the Neon compute that became active at exactly `2026-09-15T12:12:27Z` was the legacy project's Staging branch:

- Neon project: `Loyalty Card` (`ancient-tooth-70219018`)
- Branch: `staging` (`br-late-leaf-adwhj06g`)
- Endpoint identity: `ep-lucky-mountain-adz1ckw2.c-2.us-east-1.aws.neon.tech`

Read-only verification of that exact branch showed:

- `Customer.whatsappOptInAt`: **absent**
- migration `20260901113000_add_automatic_customer_messaging`: **not applied**
- Final-UAT business fixtures: **0**
- latest applied repository migration: `20260814213000_add_integration_outbox_jobs`

The repository currently contains six migrations after that point:

1. `20260831160000_add_trial_runtime_persistence`
2. `20260901113000_add_automatic_customer_messaging`
3. `20260901160000_add_business_whatsapp_credentials`
4. `20260903171000_add_whatsapp_delivery_status`
5. `20260905120000_add_public_trial_acquisition_identity`
6. `20260907120000_add_business_whatsapp_template_bindings`

Therefore this is not a safe single-column or single-migration catch-up. Blindly migrating the legacy Preview database would cross trial, acquisition, and WhatsApp schema scopes and was intentionally **not** performed.

The correct remediation is to repoint the Vercel Preview environment for `fix/reward-truth-core` to the designated, already-current `loyalflow-staging` database rather than masking the failure in application code or bulk-migrating the legacy database.

## Environment write-path gate

The connected Vercel capability can inspect projects, deployments, build/runtime logs, and protected Preview URLs, but it does not expose a project Environment Variable mutation action in this session.

The repository also has prior explicit evidence that repository secret `VERCEL_TOKEN` is not configured, so a temporary GitHub Actions Vercel REST mutation cannot be performed without introducing a new credential.

Required administrative correction:

- Vercel project: `loyalflow` (`prj_XR2myqPuensw4MTYF5Rgi0w0MPMG`)
- scope: Preview / branch `fix/reward-truth-core` only
- repoint the Preview database target from legacy `Loyalty Card/staging` to designated Neon `loyalflow-staging/main`
- keep any staging-isolation host variables consistent with the designated Staging host
- do not change Production environment variables or Production aliases
- redeploy the branch Preview after the Environment Variable correction

No database credentials or connection strings are recorded in this evidence file.

## Fixture gate and cleanup

The required invalid-card preflight failed before fixture creation. Consequently:

- `scripts/prepare-final-uat-fixtures.ts` was **not executed** in the external run.
- Final UAT fixtures created: **0**.
- Desktop, tablet, and mobile fixture-backed UAT steps were skipped.
- The workflow's emergency cleanup step executed successfully.
- Read-only Neon verification after the run confirmed final-UAT fixture count remains **0** on both the designated Staging branch and the legacy Preview Staging branch.

The following journeys therefore remain unexecuted in the current external run: Customer join/profile, Scan, reward availability/redemption, Owner, Manager, Staff, Viewer, Super Admin, permission-denied, subscription-restricted, tenant isolation, and fixture-backed mobile/RTL coverage.

## Certification outcome

Phase H remains `PARTIAL / BLOCKED`.

The browser tooling blocker is resolved and the database-target blocker is now precisely identified. The exact Preview is using legacy `Loyalty Card/staging`, which is six repository migrations behind, while the designated `loyalflow-staging/main` target already contains the required schema state.

After the Preview Environment Variable correction and redeploy, the next gate is strictly:

1. authenticate external Chromium to the corrected exact Preview;
2. verify `/card/not-a-valid-public-token` returns HTTP `404` with the unavailable-card surface;
3. only after that PASS, create the official Staging final-UAT fixtures;
4. execute the remaining desktop/tablet/mobile role, reward, permission, subscription, and tenant-isolation journeys;
5. run official cleanup regardless of UAT result.
