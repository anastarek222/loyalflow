# T004 Vercel Environment Evidence — 2026-08-09

Source: user-provided read-only screenshots of the Vercel project Environment Variables, Storage, Neon integration, and Deployment pages plus pasted Vercel build logs. Secret values were not inspected or recorded.

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

Later screenshots captured after that corrective change showed:

- one `DATABASE_URL` entry scoped to **Production only**;
- a separate Preview-only placeholder `DATABASE_URL`, which was subsequently removed before connecting Neon;
- no production scope selected while connecting the new Neon resource.

No secret value was inspected or recorded.

## Storage/provider evidence

The Vercel project initially had no connected database resource. The project owner approved provisioning a new **Neon PostgreSQL non-production database for Preview only**.

Provider-side screenshots then show:

- Neon resource created successfully: `neon-alizarin-pendant`;
- Neon status: `Available`;
- plan: `Free`;
- region: Washington, D.C., USA (East) / `iad1`;
- Neon Auth disabled;
- the connection configuration selected `Preview` only;
- `Production` was explicitly not selected;
- `Development` was not selected;
- `Create Database Branch For Deployment` had `Preview` enabled and `Production` disabled;
- the resource was connected to the Vercel project `loyalflow`;
- Neon/Vercel exposes a masked `DATABASE_URL` and related PostgreSQL connection variables for the connected resource.

These screenshots establish that the provider resource used for Preview is a newly provisioned Neon PostgreSQL resource and not the existing production database resource. No production customer data was copied as part of the provisioning flow shown in the evidence.

## Preview deployment evidence

An earlier Preview deployment from branch `docs/t004-operational-readiness-audit` at commit `8baa28b` failed during dependency installation.

Relevant sanitized build-log facts:

- environment: `Preview`;
- Vercel cloned branch `docs/t004-operational-readiness-audit`, commit `8baa28b`;
- `pnpm install` ran and triggered `postinstall$ prisma generate`;
- Prisma failed before application build with `PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL`;
- Vercel reported `Command "pnpm install" exited with 1`.

This failure occurred before the Neon Preview database was connected and therefore does not represent the corrected configuration. No application database connection, migration, or data operation occurred in that failure path.

A fresh Preview deployment is still required after the Neon connection so that the corrected Preview environment can be observed in use.

## Security interpretation

Provider evidence now demonstrates a real non-production PostgreSQL boundary for Preview:

- Production retains its own Production-only `DATABASE_URL` entry;
- Preview is connected to a separately provisioned Neon PostgreSQL resource;
- the Neon connection was scoped to Preview only;
- Production was explicitly excluded from the Neon connection;
- Preview deployment database branching is enabled;
- no production customer data was intentionally copied into the new resource during provisioning.

This closes the provider target identity gap for staging/preview database isolation.

`LOYALFLOW_ENVIRONMENT` remains visible only for Production in the earlier evidence, so a dedicated application-level staging identity is not yet independently verified. A fresh Preview deployment is also still required to prove the corrected environment is consumable by the application build/runtime.

## Production deployment evidence

A Vercel deployment screenshot shows a production deployment in `Ready Latest` state from branch `main`. Runtime Logs and Observability are available in the project UI. Speed Insights and Web Analytics are shown as not enabled. The screenshot does not prove any external alert policy, delivered alert, or accountable alert recipient.

## Approved corrective action

On 2026-08-09, the project owner explicitly approved separating the Preview `DATABASE_URL` from Production.

The project owner then explicitly approved proceeding with a new **Neon PostgreSQL non-production database for Preview only**. This provisioning approval was limited to creating and connecting that isolated Preview database. It did **not** authorise any production database command, migration, production data copy, backfill, schema change, destructive database action, production deployment, or unrelated provider mutation.

Execution status:

- [x] Production `DATABASE_URL` is scoped to Production only.
- [x] Preview placeholder `DATABASE_URL` removed before provider connection.
- [x] Neon non-production Preview database provisioned.
- [x] Neon resource connected to `loyalflow` with Preview only.
- [x] Production excluded from the Neon connection.
- [x] Preview database branching enabled.
- [x] Preview target is proven to be a distinct Neon non-production PostgreSQL resource.
- [x] No production customer data was intentionally copied during the provisioning flow.
- [ ] Fresh Preview deployment after the Neon connection succeeds and is verified.
- [ ] Dedicated application-level staging/preview environment identity is verified.

## T004 conclusion

Status: **PREVIEW DATABASE ISOLATION VERIFIED — FRESH PREVIEW DEPLOYMENT STILL REQUIRED**.

The repository must not claim T004 staging/preview readiness complete until a fresh Preview deployment using the connected Neon resource succeeds and the application-level environment identity is confirmed.
