# TC4.2 Beta subscription runtime projection

Status: implemented for isolated Staging Beta only.

TC4.2 adds a read-only compatibility projection between the current manual
billing state and the provider-neutral TC4 subscription lifecycle. The Super
Admin Operations centre displays aggregate counts for `TRIALING`, `ACTIVE`,
`PAST_DUE`, and `SUSPENDED` without changing the persisted billing model.

The projection deliberately does not invent `PENDING`, `CANCELED`, or
`EXPIRED`, because the current legacy billing fields cannot represent those
states truthfully. Unknown input fails closed.

This slice does not persist lifecycle state, enforce lifecycle entitlements,
transition a subscription, initiate checkout, consume provider events, call a
network service, change schema, create a migration, or activate Production.
Persistence, idempotent provider events, cancellation/current-period dates,
payment activation, and runtime entitlement enforcement remain deferred.
