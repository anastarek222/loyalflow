# TC8 Closed Beta Session Runbook

Status: `PREPARATION_ONLY`

## Objective
Run each participant session consistently and collect comparable evidence without turning the Closed Beta into ad-hoc support or Production testing.

## Before the session
Confirm:
- TC6 runtime proof is PASS.
- Participant is `APPROVED_FOR_BETA`.
- Staging deployment is READY and matches the approved Beta release.
- No Production URLs or credentials are in use.
- Participant tracker has a unique Participant ID.
- Issue log is ready.

## Session sequence
1. Confirm participant identity and role.
2. Restate that this is Staging/Closed Beta.
3. Ask the participant to perform only the journeys listed in `TC8_CLOSED_BETA_PREPARATION.md`.
4. Observe without coaching unless the participant is blocked by an environment problem unrelated to product usability.
5. Record pass/fail/blocked for each journey.
6. Capture only privacy-safe evidence.
7. Log every product defect or material usability blocker in `TC8_ISSUE_LOG_TEMPLATE.md` format.
8. Record the participant’s final confidence: would use in real operations / would not use yet / unsure.

## Evidence rules
Allowed:
- route or journey name;
- timestamp;
- status code or non-sensitive error code;
- sanitized screenshot reference;
- issue ID;
- deployment SHA;
- observed result.

Do not record:
- passwords, tokens, API keys, session cookies;
- full payment details;
- unnecessary customer PII;
- raw provider credentials;
- private customer exports.

## Stop conditions
Stop the session and mark it `BLOCKED` if:
- Staging no longer matches the approved SHA;
- tenant isolation appears broken;
- data is visible across businesses;
- a destructive or irreversible behavior is observed unexpectedly;
- a P0/P1 issue makes continued testing unsafe;
- Production is reached accidentally.

## End of session
- ensure all issues have IDs;
- update participant tracker status;
- record journey completion counts;
- record open blockers;
- confirm no temporary test credentials/evidence were left in public locations;
- feed results into the Go/No-Go scorecard.

This runbook does not authorize Beta activation by itself.