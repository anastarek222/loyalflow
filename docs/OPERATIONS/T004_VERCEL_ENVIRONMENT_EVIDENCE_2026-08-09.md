# T004 Vercel Environment Evidence — 2026-08-09

Source: user-provided read-only screenshots of the Vercel project Environment Variables and Deployment pages. Secret values were not inspected or recorded.

## Observed environment scoping

Earlier screenshots showed:

- `LOYALFLOW_ENVIRONMENT` — Production only.
- `PASSWORD_RESET_FROM_EMAIL` — Production only.
- `RESEND_API_KEY` — Production only.
- `GOOGLE_PRIVATE_KEY` — Production only.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — Production only.
- `LOYALFLOW_RELEASE_SHA` — Production only.
- `LOYALFLOW_PRODUCTION_DATABASE` — Production only.
- `AUTH_SECRET` — one Production-scoped entry and a separate Preview-scoped entry.
- `JWT_SECRET` — one Production-scoped entry and a separate Preview-scoped entry.
- `NEXT_PUBLIC_APP_URL` — Production and Preview.
- `AUTH_TRUST_HOST` — Production and Preview.
- `GOOGLE_SPREADSHEET_ID` — Production and Preview.

The original evidence also showed `DATABASE_URL` scoped to both Production and Preview. The project owner approved separating the Preview database connection from Production.

Later screenshots captured after that corrective change now show:

- one `DATABASE_URL` entry scoped to **Production only**;
- a separate `DATABASE_URL` entry scoped to **Preview only**;
- Vercel confirms the Preview-scoped variable was added successfully and requires a new deployment before the change takes effect.

No secret value was inspected or recorded. The provider-side target behind the Preview value is still not independently identified by the available evidence.

## Security interpretation

The provider evidence now proves that Production and Preview no longer share the same Vercel `DATABASE_URL` entry. This closes the environment-variable scope defect.

Preview/Staging database isolation is still **not fully verified** because the available screenshot does not prove that the Preview-only value points to a distinct non-production database target. A separate environment-variable entry is necessary but not sufficient: the underlying database identity must also be non-production and must not contain production customer data.

The separate Production and Preview entries for `AUTH_SECRET` and `JWT_SECRET` remain positive evidence of a distinct secret boundary for those credentials.

`LOYALFLOW_ENVIRONMENT` remains visible only for Production in the provided evidence. No provider-side evidence yet establishes a dedicated `staging` identity.

## Production deployment evidence

A Vercel deployment screenshot shows a production deployment in `Ready Latest` state from branch `main`. Runtime Logs and Observability are available in the project UI. Speed Insights and Web Analytics are shown as not enabled. The screenshot does not prove any external alert policy, delivered alert, or accountable alert recipient.

## Approved corrective action

On 2026-08-09, the project owner explicitly approved separating the Preview `DATABASE_URL` from Production.

This approval is limited to Vercel/provider configuration needed to ensure Preview uses a distinct non-production database connection. It does **not** authorise any production database command, migration, data copy, backfill, schema change, destructive database action, production deployment, or unrelated provider mutation.

Execution is partially verified:

- [x] Production `DATABASE_URL` is scoped to Production only.
- [x] Preview has its own `DATABASE_URL` scoped to Preview only.
- [ ] The Preview value is proven to point to a distinct non-production database target.
- [ ] No production customer data is intentionally copied into the Preview database as part of this change.
- [ ] A new Preview deployment has consumed the corrected configuration and been verified.

## T004 conclusion

Status: **VARIABLE SCOPE ISOLATION VERIFIED — DATABASE TARGET IDENTITY STILL REQUIRED**.

The repository must not claim that staging/preview database isolation is complete until the Preview database target is independently verified as non-production and a Preview deployment using the corrected configuration is observed.
