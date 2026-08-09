# T004 Vercel Environment Evidence — 2026-08-09

Source: user-provided read-only screenshots of the Vercel project Environment Variables, Storage, Neon integration, Deployment pages, and `/api/health`, plus pasted Vercel build logs. Secret values were not inspected or recorded.

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

An earlier Preview deployment from branch `docs/t004-operational-readiness-audit` at commit `8baa28b` failed during dependency installation because `DATABASE_URL` was not available to Prisma configuration. That failure occurred before the Neon Preview database was connected and therefore does not represent the corrected configuration.

A fresh Preview deployment after the Neon connection was then observed at commit `51dbc65` from branch `docs/t004-operational-readiness-audit`.

Relevant sanitized build/deployment facts:

- environment: `Preview`;
- Vercel cloned `docs/t004-operational-readiness-audit`, commit `51dbc65`;
- Neon provisioning integration completed before build output deployment;
- `pnpm install` completed successfully;
- `postinstall$ prisma generate` loaded `prisma.config.ts` successfully;
- Prisma schema loaded successfully;
- Prisma Client `7.9.0` generated successfully;
- `pnpm run build` completed successfully;
- Next.js `16.2.11` compiled successfully;
- TypeScript completed successfully;
- all static pages generated successfully;
- Vercel reported `Build Completed` and `Deployment completed`;
- deployment UI shows status `Ready Latest` and environment `Preview`;
- deployment source is commit `51dbc65` on the T004 branch;
- deployment region is `iad1` and deployment protection is enabled.

No migration, seed, schema mutation, or application database write is shown in the provided deployment logs. The successful Prisma generation/build proves that the corrected Preview environment supplied a usable database connection value to application configuration during build for that verified release.

## Runtime environment identity evidence

The user opened the fresh Preview deployment's `/api/health` endpoint and captured the following response:

```json
{"ok":true,"service":"loyalflow","status":"ready","environment":"preview","release":"51dbc65c2290"}
```

This is direct runtime evidence that the deployed application identified itself as `preview`, reported `ready`, and served the expected T004 release lineage (`51dbc65...`) at verification time.

## Security interpretation

Provider and runtime evidence demonstrate a real non-production PostgreSQL boundary and application identity for Preview at the recorded verification point:

- Production retained its own Production-only `DATABASE_URL` entry;
- Preview was connected to a separately provisioned Neon PostgreSQL resource;
- the Neon connection was scoped to Preview only;
- Production was explicitly excluded from the Neon connection;
- Preview deployment database branching was enabled;
- no production customer data was intentionally copied into the new resource during provisioning;
- a fresh Preview deployment successfully consumed the corrected configuration and reached `Ready Latest`;
- `/api/health` reported `environment: "preview"` at runtime.

This evidence does not authorize migrations or any database command against the Preview resource.

## T004 conclusion

Status: **STAGING/PREVIEW ISOLATION VERIFIED AT RECORDED EVIDENCE POINT**.

The reconciliation branch carries this sanitized evidence forward without changing Vercel, Neon, secrets, environment variables, databases, or deployments. Current-head application quality gates still require fresh verification after reconciliation.
