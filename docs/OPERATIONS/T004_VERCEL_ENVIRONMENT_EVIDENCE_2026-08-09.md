# T004 Vercel Environment Evidence — 2026-08-09

Source: user-provided read-only screenshots of the Vercel project Environment Variables page. Secret values were not inspected or recorded.

## Observed environment scoping

The screenshots show the following relevant scope metadata:

- `LOYALFLOW_ENVIRONMENT` — Production only.
- `PASSWORD_RESET_FROM_EMAIL` — Production only.
- `RESEND_API_KEY` — Production only.
- `GOOGLE_PRIVATE_KEY` — Production only.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — Production only.
- `LOYALFLOW_RELEASE_SHA` — Production only.
- `LOYALFLOW_PRODUCTION_DATABASE` — Production only.
- `AUTH_SECRET` — one Production-scoped entry and a separate Preview-scoped entry.
- `JWT_SECRET` — one Production-scoped entry and a separate Preview-scoped entry.
- `DATABASE_URL` — a single entry scoped to both Production and Preview.
- `NEXT_PUBLIC_APP_URL` — Production and Preview.
- `AUTH_TRUST_HOST` — Production and Preview.
- `GOOGLE_SPREADSHEET_ID` — Production and Preview.

No secret values were revealed in the evidence.

## Security interpretation

The separate Production and Preview entries for `AUTH_SECRET` and `JWT_SECRET` are positive evidence of a distinct secret boundary for those two credentials.

However, the screenshot shows `DATABASE_URL` as a single Vercel variable scoped to both Production and Preview. From the visible provider metadata, Preview therefore receives the same configured `DATABASE_URL` value as Production unless there is an additional provider/database control not represented on this page. This does not satisfy the T004 requirement to prove an isolated non-production database boundary.

`LOYALFLOW_ENVIRONMENT` is visible only for Production. No provider-side evidence in these screenshots establishes a dedicated `staging` environment identity.

## Approved corrective action

On 2026-08-09, the project owner explicitly approved separating the Preview `DATABASE_URL` from Production.

This approval is limited to Vercel/provider configuration needed to ensure Preview uses a distinct non-production database connection. It does **not** authorise any production database command, migration, data copy, backfill, schema change, destructive database action, production deployment, or unrelated provider mutation.

Execution remains incomplete until provider evidence shows:

- the Production `DATABASE_URL` is scoped to Production only;
- Preview has its own `DATABASE_URL` value scoped to Preview only;
- the Preview value points to a non-production database target;
- no production customer data is intentionally copied into the Preview database as part of this change.

## T004 conclusion

Status: **CORRECTIVE CHANGE APPROVED — EXECUTION NOT YET VERIFIED**.

The repository must not claim that staging/preview database isolation is complete until post-change provider evidence is captured and reviewed.
