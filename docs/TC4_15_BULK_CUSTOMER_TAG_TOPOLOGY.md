# TC4.15 Beta Bulk Customer Tag Topology

Date: 2026-08-14
Environment: isolated Staging Beta only

## Implemented boundary

- Bulk assignment and removal of an existing customer tag now enforce the canonical persisted-lifecycle `OPERATE` policy.
- The path checks lifecycle state only when at least one assignment changes and re-reads it inside the authoritative transaction immediately before assignment/removal and audit writes.
- Existing tenant, capability, plan-feature, all-or-nothing selection, tag ownership, audit, cache revalidation, and Google Sheets synchronization boundaries remain authoritative.

## Replay and safety

- A selection producing no assignment change remains write-free replay.
- Count mismatches still abort the whole transaction rather than accepting partial topology changes.
- Subscription rejection occurs before Google Sheets synchronization.

## Explicitly deferred

- New individual tag creation and assignment remain tracked by TC4.14 Draft PR.
- Referral identity remains tracked by TC4.12 Draft PR.
- Business settings, providers, checkout, schema, migrations, and Production are not changed.
