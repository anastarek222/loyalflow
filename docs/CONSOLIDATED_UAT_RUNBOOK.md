# LoyalFlow consolidated non-production UAT runbook

Run only against an explicitly named non-production database with isolated
`lf-uat-final-*` businesses, users, branches, and customers. Never use a real
customer, business, phone number, public token, or production credential.

## Fixture baseline

- Business A: Owner, Manager, Staff, Viewer; two active branches and one
  inactive branch; separate active and inactive customers.
- Business B: separate Owner and equivalent customer/reward/promotion/offer/
  branch/referral/tag/note data for negative tenant tests.
- Configure distinct customer fixtures for VISITS, POINTS, and SALES_AMOUNT;
  retain IDs only as evidence.
- Record the migration-status output with credentials removed. Use the latest
  isolated verifier scripts first; do not reset or truncate the database.

Mark **Actual result** and **PASS/FAIL** only while executing the row.

## Operator execution order

Run the highest-risk batches in this order. Stop the batch when a failure can
invalidate later results; retain the fixture run ID and safe reproduction.

1. **Authentication and authorization:** A-01, A-02, A-03, B-02, L-01.
2. **Tenant/direct-route isolation:** B-01, then cross-tenant checks within
   C-03, E-01, F-01, K-01, M-01, N-01, and O-01.
3. **Core loyalty:** D-01 (VISITS), D-02 (POINTS), D-03 (SALES_AMOUNT).
4. **Reward and incentive safety:** E-01, F-01, G-01, K-01.
5. **Branch and staff boundaries:** M-01, then the staff portions of B-02 and
   L-01.
6. **Public privacy and responsive card:** Q-01, C-02, C-03, O-01, and G-01.
7. **Customer operations:** C-01, C-04, C-05, N-01.
8. **Reports and manual-growth tools:** H-01, H-02, I-01, J-01, O-01, P-01,
   R-01, S-01.

## Fixture preparation

The retained browser fixtures are separate from the self-cleaning
`verify:local-*` scripts. They can be created only in `loyalflow_test`:

```bash
npx prisma migrate status
npm run prepare:final-uat -- --base-url=http://localhost:3000
```

The command prints a unique run ID, disposable test logins, routes, and the
exact cleanup command. It never prints the database connection string. Start
the application in a second terminal with `npm run dev`; use only the printed
`lf-uat-final-*` fixture records. Cleanup is explicit and limited to the
printed run ID:

```bash
npm run cleanup:final-uat -- --run=PRINTED_RUN_ID
```

## Agent automation execution record — 2026-07-21

- **Capability discovery:** no Playwright, Puppeteer, Cypress, WebDriver, or
  usable local browser binary is installed in this checkout. A dev-only
  Playwright install was attempted but did not produce a local package.
- **Local application reachability:** the agent sandbox cannot connect to
  `http://localhost:3000` or `http://127.0.0.1:3000`; the in-app browser also
  remained at `about:blank` when directed to the local login page. This agent
  therefore cannot safely exercise browser sessions, direct routes, server
  actions, or public-card endpoints for run `e696d3476d`.
- **Executed source-boundary evidence:** `npm run test` passed all 123 tests;
  `npx prisma validate` passed. Rows R-01 and S-01 are the only rows whose
  stated execution surface is source/unit-boundary, so they are marked PASS.
- Browser-dependent rows are **MANUAL UAT REQUIRED**, not passed or blocked by
  product behavior. No browser fixture data was changed by this agent.

| ID | Feature | Route / role | Exact actions | Expected result | Actual result | PASS/FAIL |
| --- | --- | --- | --- | --- | --- | --- |
| A-01 | Authentication | `/login` — Owner, Manager, Staff, Viewer, Super Admin | Sign in/out once per active role; then submit invalid credentials. | Correct session/landing per role; invalid login is refused. | Not executed: agent cannot reach local browser/server. | MANUAL UAT REQUIRED |
| A-02 | Account state | `/login` — inactive user/business | Try login after deactivating only isolated fixture user, then fixture business. | Session is refused/invalidated; no tenant access. | Not executed: agent cannot reach local browser/server. | MANUAL UAT REQUIRED |
| A-03 | Session/logout | Any protected page | Refresh after login, then log out and revisit direct URL. | Session persists correctly then protected route redirects. | Not executed: agent cannot reach local browser/server. | MANUAL UAT REQUIRED |
| B-01 | Tenant isolation | Direct business A/B URLs — all roles | Substitute business B slug/customer/reward/offer/promotion/branch/referral/note/activity IDs in A routes and APIs. | Refused or empty; no B data disclosed. | Not executed: direct routes/API unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| B-02 | Capability matrix | Protected routes/actions — Owner/Manager/Staff/Viewer | Exercise view/edit, earn/redeem/adjust, reports, staff management, and settings by UI and direct URL/form. | Only documented capabilities succeed. | Not executed: direct routes/forms unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| C-01 | Customer lifecycle | `/businesses/[slug]/customers` — Owner/Manager | Create, edit, deactivate/reactivate, search, filter, paginate. | Tenant-only results; code/token generated and lifecycle audit exists. | Not executed: agent cannot reach local browser/server. | MANUAL UAT REQUIRED |
| C-02 | Self signup/QR | `/join/[slug]`, `/card/[token]` — public | Scan/open QR; join once; repeat normalized phone; inspect generated card. | Active tenant only; duplicate blocked; opaque token/card issued. | Not executed: public routes unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| C-03 | CRM privacy | Customer detail/list/card/API — Owner/Manager/public | Add tags/private note; filter tag; call `/api/card/[token]`. | Staff metadata visible only internally; absent from card/API. | Not executed: local UI/API unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| C-04 | Bulk operations | Customer list — Owner/Manager/Staff/Viewer | Select individual/visible, clear, add/remove tag, activate/deactivate, export selected, campaign handoff; submit B ID. | Confirmation for destructive actions; atomic tenant validation; role limits hold. | Not executed: local UI/actions unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| C-05 | Duplicate review | `/businesses/[slug]/duplicates` — Owner/Manager | Seed normalized-phone/code candidates; inspect preview and try non-editor/cross-tenant route. | Tenant-only read-only grouping; no merge/delete/transfer control. | Not executed: local route unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| D-01 | VISITS engine | Customer detail — Owner/Manager/Staff | Earn, redeem, repeat cycle, adjust with/without reason, double submit. | Correct ledger/progress/reward; reason required; no negative/duplicate balance. | Not executed: local loyalty UI/actions unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| D-02 | POINTS engine | Customer detail — Owner/Manager/Staff | Repeat D-01 with points configuration. | Correct configured earning and audit/idem behavior. | Not executed: local loyalty UI/actions unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| D-03 | SALES_AMOUNT engine | Customer detail — Owner/Manager/Staff | Earn using sale amount, redeem, adjust, rapid retry. | Recorded sales-based earning only; correct balance/progress/audit. | Not executed: local loyalty UI/actions unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| E-01 | Multi-reward | `/businesses/[slug]/rewards` and customer detail — Owner/Manager | Create/edit/toggle multiple rewards; redeem selected active reward; attempt inactive; remove catalogue for fallback. | Selected active reward only; inactive blocked; legacy fallback works. | Not executed: local UI/actions unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| F-01 | Promotions | Earn flow — Owner/Manager/Staff | Test none, fixed, multiplier, multiple match, inactive/expired/B tenant, retry. | One deterministic eligible rule; final credit and PromotionApplication correct. | Not executed: local loyalty UI/actions unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| G-01 | Reward expiry | Reward/customer/card — Owner/Manager/Staff/public | No expiry, active expiry, exact UTC boundary, expired redemption, inspect card/activity. | Base balance preserved; expired reward blocked with state/audit. | Not executed: local UI/public card unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| H-01 | Segments/retention | Customers/reports — Owner/Manager | Create fixtures for all eight segments and retention-score boundaries. | Deterministic labels/counts; no cross-tenant fixture. | Not executed: reports unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| H-02 | Retention metrics | Reports — Owner/Manager | Check returning/at-risk/recovered, redemption rate, average activity, first reward, rankings/value. | Recorded values only; sales metrics only in SALES_AMOUNT. | Not executed: reports unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| I-01 | Analytics | Reports/API — Owner/Manager | Change date, mode, segment filters; inspect trends and empty data. | Strict bounded tenant-scoped results and honest empty states. | Not executed: reports/API unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| J-01 | Campaign/recovery | `/campaigns`, `/recovery` — Owner/Manager/Staff | Select trigger/audience/offer, preview/copy/WhatsApp/export win-back list. | Manual-only handoff; no send, paid provider, or persistence. | Not executed: local routes unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| K-01 | Referrals | Customer detail/join/card — Owner/public | Create code, join same tenant, try self/B tenant/duplicate. | Same-tenant attribution/audit only; no automatic reward. | Not executed: local UI/public routes unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| L-01 | Staff permissions | All staff routes — each role | Repeat direct URL and form submissions for every capability. | Owner full; Manager documented subset; Staff cashier subset; Viewer read-only. | Not executed: local routes/forms unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| M-01 | Multi-branch | Branches/customer flows/reports — all roles | Create/assign branches; use active/inactive/cross-branch/B branch; inspect history/report. | Branch constraints/context work; historical unassigned and single-location paths work. | Not executed: local routes/actions unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| N-01 | Notes/tags | Customer list/detail/card/API — roles/public | Create/assign/remove/filter tags; edit note; attempt Staff/Viewer/B tenant edits. | Authorized private metadata only; public output remains clean. | Not executed: local UI/API unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| O-01 | Offers | `/offers`, public card/API — roles/public | Create/edit/toggle all/segment/VIP/date offers; inspect inactive/future/expired. | Only eligible active current offers show; no balance mutation. | Not executed: local UI/public API unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| P-01 | Playbooks | `/playbooks` — Owner/Manager | Preview/apply all templates; test configured overwrite and repeat; edit settings afterwards. | Explicit protection/audit; editable defaults; no auto related records. | Not executed: local route/actions unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| Q-01 | Public digital card | `/card/[token]` — public/mobile | Valid/invalid/inactive tokens/business; Arabic/English, responsive, QR, branding, rewards/offers/expiry. | Single membership, correct state, no private metadata. | Not executed: local public card unavailable from agent sandbox. | MANUAL UAT REQUIRED |
| R-01 | Google Wallet readiness | Source/unit boundary — Owner/public | Keep flag false; exercise all loyalty modes and malformed branding/card URL fixture. | No API/JWT/pass/credential call; mapper only derives safe data. | Automated source-boundary tests passed on 2026-07-21. | PASS |
| S-01 | Events/entitlements | Source/unit boundary | Exercise normal writes with disabled event delivery and free features. | No outbound/network delivery, billing, plan UI, or provider bypass. | Automated source-boundary tests passed on 2026-07-21. | PASS |

## Evidence and exit rule

- Attach screenshots for each role/negative tenant case and retain fixture IDs,
  not tokens, passwords, or phone numbers.
- Record a failure with its test ID, route, role, timestamp, and safe repro.
- **UAT is verified only when every applicable row is executed and passed, or a
  documented product decision accepts an exclusion.**
