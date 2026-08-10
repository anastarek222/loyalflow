# T007 Staging Runtime Verification — 2026-08-10

## Verified runtime

- Vercel deployment verified after the isolated Upstash redeploy: `loyalflow-ox71356gc-anas-tarek.vercel.app`.
- Release: `fa5b9f07449d`.
- `/api/health/live`: HTTP 200, `environment: staging`, `status: live`.
- `/api/health`: HTTP 200, `environment: staging`, `status: ready`.
- Neon branch: `staging` (`br-late-leaf-adwhj06g`), database `neondb`.
- Chromium 149 ran from the CLI; no Cloud Browser was used.
- Production was inspected only for the previously approved migration-count baseline and was not changed.

## Schema parity and migration deployment

The owner approved deploying the eleven reviewed repository migrations to Neon Staging only. Before deployment, the migration manifest was repaired by adding the four missing SHA-256 records without changing any migration SQL. The resulting pre-deployment gates passed:

- migration manifest: 46/46 files verified;
- destructive SQL scan: 46 migrations, 29 reviewed statements, 0 unreviewed;
- migration validator/raw-SQL contract tests: 22/22 passed;
- Prisma schema validation and Prisma Client 7.9 generation: passed;
- TypeScript: passed.

The owner then ran `prisma migrate deploy` from an authorized Mac connection against the verified Staging endpoint `ep-lucky-mountain-adz1ckw2`. Prisma applied all eleven pending migrations from `20260729090000_add_owner_onboarding_foundation` through `20260809084500_add_security_notification_lifecycle`.

Post-deployment read-only verification proved:

- Staging: 46 applied migrations, all finished and none rolled back;
- latest finish time: 2026-08-10T15:39:51.034Z;
- Production baseline remains 35 applied migrations with 0 incomplete;
- no Production migration or data write occurred.

Schema drift is therefore closed.

## Browser evidence

Previously recorded public conversion evidence remains:

- local Chromium: 3/3 passed;
- protected Staging: 3/3 passed across desktop and mobile.

Fresh post-migration protected-Staging evidence:

- Desktop public conversion: 2/2 passed.
- Mobile public conversion and public-card journey: 2/2 passed.
- The public-card journey covered enrollment, EN/AR card rendering, narrow viewport safety, private-note non-disclosure, and the intentional invalid-card 404.

Two Remote Staging test-harness drifts were corrected in the uncommitted working tree:

- the invalid-login assertion now uses the current MFA-aware copy from `app/login/page.tsx`;
- only the specific Vercel Toolbar CSP message and the intentional invalid-card 404 console message are treated as expected Preview-environment noise.

Post-change repository gates passed:

- TypeScript: passed;
- targeted ESLint: passed with no output;
- unit/source suite: 809/809 passed;
- `git diff --check`: passed.

## Authenticated Owner E2E

The first authenticated run correctly exposed missing isolated Upstash configuration: because protected Staging executes with `NODE_ENV=production`, the distributed auth limiter failed closed and rejected the otherwise valid disposable Owner credentials. Isolated Staging Upstash credentials were then configured and the same release was redeployed without changing Production.

The final protected-Staging Chromium run passed 1/1 in 36 seconds and covered:

- one intentionally invalid login followed by a valid Owner login through the Redis-backed limiter;
- Dashboard navigation and reports;
- customer search from Scan;
- Earn from balance 4 to 5, including a reload that proved exact-once persistence;
- successful Redeem.

Two stale browser assertions were aligned with the current product copy: the camera-ready status and the `Record visit` / `تسجيل زيارة` action label. These are test-harness corrections only and do not change runtime behavior.

Targeted post-run checks passed:

- T007 tests: 28/28;
- TypeScript: passed;
- `git diff --check`: passed.

Manager/Viewer authorization, Staff Arabic Scan, Super Admin tablet/MFA, and Owner onboarding remain part of the wider T007 browser matrix and are not claimed by this Owner smoke journey.

## Performance evidence

A fresh 20-request readiness sample against protected Staging returned:

- sample count: 20;
- HTTP error rate: 0%;
- p95: 8,739 ms;
- budget: 1,500 ms;
- decision: failed (`p95_exceeded`).

The earlier p95 was 7,886.961 ms. Because the no-database live endpoint was also slow in the earlier observation, the protected Vercel/proxy path remains a measurement confounder; the evidence does not isolate Neon as the cause.

## Fixture safety and cleanup

A disposable fixture with run ID `8bed75820e` was created only on Neon Staging. It contained two synthetic businesses, six synthetic users, three seed customers, one branch, and one reward unlock. The public enrollment test created one additional synthetic customer.

Cleanup removed the fixture businesses, users, customers, activities, loyalty rows, and related dependents. Final read-only verification returned:

- businesses: 0;
- users: 0;
- customers: 0.

No real customer data was used. Production was not changed.

A later minimal Owner fixture used for the successful authenticated smoke journey was also removed. Its final verification independently returned 0 businesses, 0 users, and 0 customers for the UAT identifiers.

## Gate decision

`NO-GO — PERFORMANCE, REMAINING ROLE MATRIX, ROLLBACK, AND CLOSED BETA`

The isolated Redis-backed authentication blocker is closed. The next safe action is to complete the remaining authenticated Desktop/Tablet/Mobile/Owner-Onboarding role matrix, configure the disposable Super Admin MFA fixture, remeasure performance on a less confounded path, rehearse rollback, and only then consider the 5–10 business Closed Beta.
