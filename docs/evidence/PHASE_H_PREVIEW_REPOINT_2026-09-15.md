# Phase H Preview repoint — 2026-09-15

- Scope: Preview only for branch `fix/reward-truth-core`.
- Vercel branch-specific `DATABASE_URL` was corrected administratively to the designated Neon `loyalflow-staging/main` target.
- No database credential or connection string is recorded here.
- No schema, migration, Production environment variable, Production database, or WhatsApp implementation change was made as part of the intended repoint.
- An accidental Production promotion occurred while using the Vercel redeploy UI. Production was immediately restored to the previously verified `main` deployment from PR #569 (`75ee9fb1c4bd4561f58b3a902eb9f6eb49ee3482`). `https://gettanee.com` was re-verified HTTP 200 with the expected current marketing home.
- Production is now out of scope again.

Next Phase H gate on the new branch Preview:

1. wait for the Git-triggered Preview deployment for this commit;
2. test `/card/not-a-valid-public-token` first;
3. require HTTP 404 before creating any fixtures;
4. if 404 passes, run official Staging final-UAT fixtures, the remaining Browser UAT matrix, and official cleanup;
5. do not touch Production.
