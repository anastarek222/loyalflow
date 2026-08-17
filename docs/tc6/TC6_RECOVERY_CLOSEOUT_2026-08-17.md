# TC6 Recovery Closeout — 2026-08-17

Status: `CODE_SIDE_VALIDATED_RUNTIME_PROOF_OPEN`

Environment policy: Beta/Staging only. Production remains out of scope.

## Why this record exists

PR #77 recorded TC6 as `PARTIAL_FOUNDATION_COMPLETE` at an earlier stage. That historical audit is no longer sufficient as current-state truth because the durability, worker, queue, retry, mutation-outbox, reconciliation, rehearsal, and scheduler work advanced materially afterward.

This record captures the current closeout state without claiming runtime completion that has not yet been observed on a fresh Staging/Preview deployment.

## Recovery chain validated in GitHub

- #188 — TC6.14 bounded stranded-job reconciliation core — GitHub Staging PR Validation: PASS
- #189 — TC6.15 internal reconciliation runner boundary — GitHub Staging PR Validation: PASS
- #190 — TC6.16 Beta reconciliation trigger policy — GitHub Staging PR Validation: PASS
- #191 — TC6.17 non-production reconciliation rehearsal evidence — GitHub Staging PR Validation: PASS
- #192 — TC6.18 Beta Queue heartbeat scheduler — GitHub Staging PR Validation run #232: PASS

The #192 combined-head validation passed the full test suite, type-check, workspace boundaries, lint, application build, and patch-whitespace checks.

## Implemented recovery behavior

The current Beta recovery design provides:

- bounded stranded-job scanning
- eligibility for due `PENDING` / retryable `FAILED` work and expired-lease `PROCESSING` work
- default batch target 25 and hard reconciliation maximum 100
- job-id-only wake-ups through the existing queue transport
- worker lease acquisition as the provider-execution guard
- per-publication failure collection without mutating durable job state in the reconciliation scan
- an internal Prisma-backed runner boundary
- a pure five-minute Beta trigger policy
- a recovery rehearsal proving bounded reads, ordered selection, continued wake-up after one synthetic queue publication failure, and rejection of oversized batches before durable reads
- a dedicated internal Vercel Queue recovery topic
- delayed heartbeat delivery with time-bucket idempotency
- automatic first-heartbeat seeding from normal integration-job queue activity
- recursive heartbeat scheduling before each bounded reconciliation pass

## Explicitly not claimed yet

TC6 is **not CLOSED** yet.

The remaining required evidence is a real Staging/Preview runtime proof that demonstrates all of the following on deployed infrastructure:

1. a recovery heartbeat is seeded and delivered on the Beta deployment
2. the next heartbeat is scheduled with the intended five-minute cadence
3. eligible stranded jobs are re-woken in a bounded batch
4. the worker claims a lease before provider execution
5. repeated wake-ups do not cause duplicate provider execution
6. retry/recovery behavior remains durable across real queue delivery rather than tests only

## Current external blocker

The current #192 Vercel status points to the Hobby `build-rate-limit` gate. A fresh Preview deployment for the #192 head is therefore unavailable at this moment.

This is classified as an external deployment-capacity blocker, not as evidence of an application regression, because GitHub CI successfully builds the same application head.

No attempt should be made to bypass this blocker by deploying Production, moving the scheduler to Production Cron, changing plan tier automatically, exposing a public scheduler endpoint, or introducing unapproved credentials/secrets.

## Merge topology

Current logical order:

1. #188 — reconciliation core
2. #189 — runner boundary
3. #190 — trigger policy
4. #191 — recovery rehearsal evidence
5. #192 — Queue heartbeat scheduler

#189 and #191 contain combined-head visibility because their logical dependencies were not yet integrated when CI was run. Before merge execution, each dependent PR must be reconciled against fresh `staging` so the visible delta matches its intended slice and no duplicate commits are merged.

#192 also carries the validated recovery chain on its combined head. It must not be treated as a single independent 11-file slice for merge purposes without dependency reconciliation.

## Final closeout gate

TC6 may move from `CODE_SIDE_VALIDATED_RUNTIME_PROOF_OPEN` to `CLOSED_BETA` only after:

- dependency topology is reconciled against current `staging`
- required PR validations remain green on their final merge heads
- a fresh Staging/Preview deployment is Ready
- the runtime recovery rehearsal above passes on that deployment
- evidence is recorded in the tracker/closeout record

Production remains a separate future gate.
