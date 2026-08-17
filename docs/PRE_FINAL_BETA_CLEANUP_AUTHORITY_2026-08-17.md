# LoyalFlow Pre-Final Beta Cleanup Authority — 2026-08-17

Status: `PRE_FINAL_BETA_CLEANUP_REQUIRED`

Execution environment: isolated `staging` Beta only.

Production, schema/migration, environment, provider, credential, secret, and participant-data changes remain outside this authority.

## 1. Current execution authority

GitHub Issue #206 — **Pre-Final Beta Cleanup: close consolidated audit findings before Final Product** — is the single current execution authority until its exit gate is satisfied or an explicit later Product decision supersedes it.

The existing planning/reconciliation records remain evidence, but they no longer compete as the current task queue:

- `docs/MASTER_DELIVERY_TRACKER.md` remains the long-lived product/modernization planning and evidence history.
- `docs/BETA_DEFERRED_REGISTER.md` remains the durable register of Beta foundations whose final Product/provider/participant/Production evidence is still deferred.
- `docs/FINAL_BETA_RECONCILIATION_2026-08-17.md` remains a point-in-time snapshot taken before the consolidated pre-final audit cleanup was opened.

If any of those records names a different immediate next action, Issue #206 governs current execution. In particular, the earlier statement that TC8 Real Closed Beta is the immediate next action is superseded while Issue #206 remains `PRE_FINAL_BETA_CLEANUP_REQUIRED`.

This reconciliation does not erase or rewrite historical evidence. It establishes one current authority and assigns the older records supporting roles.

## 2. Legacy `Notification.isRead` exit plan

### Current authority

Per-user read state is authoritative. Runtime notification read behavior is represented by the per-user/per-business notification read-state records (`NotificationReadState` and `NotificationItemRead`). The legacy global `Notification.isRead` field is compatibility residue and must not determine one user's unread state for another user.

### Beta rule

- New runtime read/unread logic must use the per-user authority.
- No new feature may depend on `Notification.isRead` as authoritative state.
- The legacy field remains inert until a separately approved schema/migration gate removes it.

### Removal gate

Removing `Notification.isRead` requires all of the following:

1. repository zero-reference proof outside schema/migration history and an explicitly named compatibility adapter if one still exists;
2. isolated-Staging UAT covering mark-one, mark-all, unread counts, replay/idempotency, and cross-user isolation;
3. dependency/data review proving no supported consumer still reads or writes the legacy field;
4. an explicit schema/migration authorization with rollback/observation plan;
5. post-migration verification before any Production claim.

No schema or data migration is authorized by this document.

## 3. Compatibility `paymentStatus` exit plan

### Current authority

Persisted subscription lifecycle state is authoritative for runtime subscription entitlements and lifecycle transitions. `paymentStatus` remains a compatibility/manual-billing projection or input and is not the entitlement source of truth.

### Beta rule

- New runtime access/entitlement decisions must use the authoritative subscription lifecycle state.
- Compatibility projection from legacy/manual billing state must remain bounded and explicit.
- No checkout/provider activation or provider-event consumption is implied by retaining `paymentStatus`.

### Removal/cutover gate

Retiring or redefining `paymentStatus` requires all of the following:

1. an explicit billing/provider cutover decision;
2. inventory and zero-unintended-consumer proof for runtime entitlement code;
3. mismatch instrumentation/reconciliation between compatibility state and lifecycle state during the observation window;
4. isolated-Staging parity/UAT for subscription transitions, restricted/allowed operations, cancellation/reactivation paths, and administrative billing workflows;
5. a separately approved schema/migration/backfill plan with rollback criteria;
6. provider/Production activation only under later explicit authorization.

No schema, provider, checkout, webhook, credential, or Production change is authorized by this document.

## 4. Manual Google Sheets sync decision

Decision: `KEEP_MANUAL_SYNC_SYNCHRONOUS_FOR_CURRENT_BETA`.

The explicit operator-triggered Settings sync remains synchronous for the current Beta contract: the command re-checks persisted `OPERATE` entitlement, invokes the bounded safe Google Sheets sync, and returns the immediate `success`/`failure` result used by the Settings redirect feedback.

Automatic mutation follow-up remains separate and durable through the PostgreSQL `IntegrationJob` outbox plus queue/worker/reconciliation path. The durable job record remains the authority for those asynchronous automatic integrations.

### Why this is the current Beta decision

- It preserves the existing manual operator feedback contract instead of silently changing the button to fire-and-forget behavior.
- The application does not currently expose a complete manual-job status/polling UX that would justify changing the interaction contract.
- Automatic mutation synchronization already has the durable job path needed for retry/recovery semantics.
- Keeping the two initiation modes explicit is lower-risk than introducing an async manual status lifecycle during pre-final cleanup.

### Future convergence gate

Moving manual sync to durable job status requires a separately bounded slice with:

1. explicit manual-sync idempotency semantics;
2. user-visible queued/running/succeeded/failed status and retry/replay behavior;
3. proof that repeated manual clicks do not create unintended provider executions;
4. isolated-Staging recovery/reconciliation UAT;
5. compatibility handling for the existing immediate-result Settings contract.

No Google provider configuration, credentials, environment changes, or Production activation are authorized here.

## 5. Slice B closeout classification

Once the Customer Detail legacy-action removal and this authority/decision record are merged with passing repository validation, Slice B can be classified `BETA_SOURCE_OF_TRUTH_CLEANUP_CLOSED`.

That classification does **not** close Issue #206, Slice C, the Configuration/UAT gate, the exact-SHA runtime matrix, or TC8 Real Closed Beta.
