# T004 Production Recovery Posture Evidence — 2026-08-09

Status: **READ-ONLY PROVIDER POSTURE VERIFIED / MEASURED RPO-RTO UNVERIFIED**

## Scope and authorization

The accountable owner explicitly approved a read-only verification of the Production database provider backup / point-in-time recovery posture. This verification did not authorize and did not perform a database query, restore, branch creation, migration, schema change, secret change, provider configuration mutation, or production deployment.

## Provider evidence

Read-only Neon project metadata identified the production database project as `Loyalty Card` (`ancient-tooth-70219018`) on PostgreSQL 18 in `aws-us-east-1`.

The project reports:

- `history_retention_seconds: 21600`, equivalent to a 6-hour retained history window.
- Production branch `production` (`br-nameless-sky-adxk3s83`) is `primary: true`, `default: true`, and currently `ready`.
- No restore, snapshot, branch, or data operation was executed as part of this verification.

Neon documentation states that retained history supports point-in-time restore within the configured retention window. Current Neon product documentation/changelog also describes a 6-hour default instant-restore window for Free-plan projects and allows the restore window to be configured in project settings.

## Interpretation

This evidence verifies that the Production project currently exposes provider-native point-in-time recovery capability with a 6-hour history-retention window.

It does **not** prove an achieved 15-minute RPO or 30-minute RTO:

- A retention window describes how far back a restore point may be selected; it is not measured recovery-point loss from a real incident or exercise.
- No Production restore was performed, so detection, preparation, restore, reconnect, and validation time remain unmeasured.
- The proposed RPO/RTO targets therefore remain planning targets until a separately approved recovery exercise or equivalent provider evidence supports them.

## Result

- Provider-native Production recovery posture: **VERIFIED READ-ONLY**.
- Production history-retention window: **6 hours**.
- Achieved Production RPO: **UNVERIFIED**.
- Achieved Production RTO: **UNVERIFIED**.

No secrets, connection strings, customer data, or private provider credentials are recorded in this evidence.