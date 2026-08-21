# Google Sheets Governance — Beta Operating Contract

Status: **Staging/Beta operating contract**. This document describes the current LoyalFlow integration and its enforced Beta scale boundary. It is not a Production privacy or provider-SLA claim.

## 1. Spreadsheet ownership and access

- `GOOGLE_SPREADSHEET_ID` identifies one platform-configured spreadsheet.
- The **platform operator** is responsible for provisioning the spreadsheet and administering its Google Drive ownership and sharing/ACLs.
- The LoyalFlow service account must have enough access to read spreadsheet metadata and write the managed business tabs.
- LoyalFlow does **not** create the top-level spreadsheet and does **not** manage Google Drive ownership or sharing permissions.
- Runtime readiness verifies authentication and spreadsheet accessibility. It does not prove who owns the Google Drive file.
- Each LoyalFlow business is mapped to a stable Google `sheetId`. A missing mapping creates a new tab; it never silently claims a same-named legacy tab.

## 2. Managed range and exported customer data

LoyalFlow owns only the mapped business tab's `A:L` customer-sync range. A successful full sync clears that managed range and rewrites the current snapshot.

The managed columns are, in order:

1. Customer ID — the LoyalFlow customer code, not the database primary key.
2. Customer Name.
3. Phone Number.
4. Card Link — a public-card URL containing the customer's public token.
5. Current Balance.
6. Unit.
7. Gifts Redeemed.
8. Lifetime Earned.
9. Lifetime Redeemed.
10. Status.
11. Registration Date.
12. Last Updated.

Phone numbers, customer identity data, public-card links, loyalty balances, reward history totals, and timestamps therefore leave the LoyalFlow database boundary when Google Sheets sync is enabled and succeeds.

## 3. Permissions and activation

### Manual sync

A manual sync requires all of the following:

- an authenticated user;
- `canManageBusiness` for the target business, which currently means a Super Admin or the assigned Owner;
- the business subscription lifecycle must allow the `OPERATE` operation;
- the persisted subscription entitlement is re-checked immediately before the provider side effect.

Managers, Staff, and Viewers do not receive the settings capability that authorizes manual Google Sheets sync.

### Provider activation

- Product entitlements do not activate Google Sheets credentials.
- Provider configuration is a separate server-side gate.
- There is currently no per-business Google Sheets enable/disable toggle. A business can have a mapping and sync state, while provider availability is controlled by the platform configuration and operation gates.

## 4. Unavailable or disabled-provider behavior

When the required Google Sheets configuration is missing or malformed:

- LoyalFlow performs no Google provider write;
- the safe sync boundary returns a typed failure;
- the business sync state is recorded as `FAILED` when that state can be persisted;
- configuration failures are non-retryable until configuration changes.

Authentication, spreadsheet-access, mapping, scale, and Google API failures are recorded using typed failure reasons. The UI exposes pending/succeeded/failed state and whether another retry is available.

## 5. Durable jobs, retries, and terminal failure

Background integration work is business-scoped and durable. Jobs use the existing integration outbox/worker contract with these Beta retry limits:

- maximum attempts: **3**;
- base retry delay: **30 seconds**;
- exponential backoff;
- maximum retry delay: **300 seconds**.

Durable job states are `PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`, and `DEAD`. A retryable failure can return to processing until the attempt limit is reached; terminal or non-retryable work becomes `DEAD` according to the worker/outbox policy.

## 6. Retention and deletion behavior

### Customer deletion

The current integration is snapshot-based. If a customer is deleted from LoyalFlow, that customer's row is removed from the mapped Google tab only on the **next successful full sync**, because a successful sync clears the managed `A:L` range and rewrites the current database snapshot.

Until that successful sync occurs, stale customer data can remain in Google Sheets.

### Business deletion

Deleting a business from LoyalFlow currently deletes the tenant data and Business record from the LoyalFlow database, but it does **not** clear or delete the mapped Google tab and does not revoke Google Drive access.

Therefore:

- Google Sheets data can remain after the LoyalFlow business is deleted;
- the spreadsheet owner/platform operator is responsible for external cleanup under the current Beta contract;
- this behavior must not be represented as automatic deletion propagation;
- Production privacy/deletion claims remain blocked until an explicit external-data deletion/retention policy is selected and verified.

### Retention authority

LoyalFlow currently has no provider-side retention timer. After data is written, retention is also governed by the configured spreadsheet owner and Google Drive controls. External retention and deletion are not enforced by the LoyalFlow database deletion transaction.

## 7. Full-rewrite scale limit

The Beta operating limit for the current clear-and-rewrite strategy is:

**2,500 customers per business.**

This value is a LoyalFlow operating contract, **not a Google Sheets hard provider limit**. It aligns with the highest currently bounded customer plan (`PRO = 2,500`), while the `BUSINESS` plan is intentionally unbounded.

R8B enforces this boundary by loading at most **2,501** customer rows. The extra row is a detection sentinel, not export data. If the sentinel exists, sync fails with the typed non-retryable reason `CUSTOMER_LIMIT_EXCEEDED` **before** Google spreadsheet metadata is read and before any tab creation, clear, update, or formatting write occurs.

A business above the limit therefore never receives a silent partial snapshot. The existing mapped tab is left untouched by that over-limit attempt.

The all-business helper is also paged in batches of **20 businesses**, so it no longer creates one unbounded `Promise.all` fan-out across every business.

The current full-rewrite implementation must not be treated as scale-safe above 2,500 customers merely because Google Sheets could accept more rows. Supporting larger snapshots requires a separately reviewed bounded strategy.

## 8. R8 completion boundary

R8A established the governance and export contract. R8B enforces the Beta scale boundary while preserving the snapshot model.

R8 is considered complete when CI and Preview verify that:

- customer loading is bounded to the 2,500-row contract plus one detection sentinel;
- over-limit sync fails before any Google provider access or write and never writes a partial snapshot;
- all-business sync processes bounded 20-business batches instead of unbounded fan-out;
- the exact `A:L` export shape, tenant/subscription gates, stable sheet mapping, retry policy, and failure-state behavior remain intact.

No Production rollout or manual UAT is part of R8A/R8B.
