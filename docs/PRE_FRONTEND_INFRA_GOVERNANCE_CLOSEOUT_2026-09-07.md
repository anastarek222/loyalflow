# Tanee Pre-Frontend Infrastructure and Governance Closeout

Date: 2026-09-07

Status: `PARTIAL_PASS / EXTERNAL_GATES_OPEN`

Scope: Master Plan items 19–25 only. This record does not close product flows,
live Meta certification, human browser UAT, the Pre-Frontend Freeze, or
Production authorization.

## Source checkpoint

- Repository: `anastarek222/loyalflow`
- Integration authority: `staging@f3ac53588d8a912117cf3ee393bbdbdc405a66bc`
- Pre-Frontend lane: Draft PR #507
- Inspected PR head: `c553909b60128d4fcb85362ad6b3c0fabbb3e35d`
- `main@31ae12b1a2d8f74dad618edc1d305450b35d6385`
- Production mutation: not authorized or performed

PR #507 moves independently. Every later claim must be repeated or confirmed
against its then-current exact head.

## Gate matrix

| Area | Evidence at inspected head | Status | Remaining gate |
| --- | --- | --- | --- |
| Immutable migrations | 54 migration directories match the SHA-256 manifest | PASS — source | None for inspected source |
| Destructive SQL | 54 migrations scanned; 30 reviewed statements; 0 unreviewed | PASS — source | Database-owner review remains required for any new migration |
| Prisma / disposable deploy | Dedicated Migration Integrity workflow validates, generates, deploys to PostgreSQL 18, and verifies required objects | PASS — CI at inspected head | Repeat on integration head |
| Required PR gate | `Validate application` was Green at inspected head | PASS — inspected head | This lane adds manifest, destructive-SQL, Prisma validation, and disposable deploy directly to that required job |
| Security contracts | Focused environment, release, tenant, rate-limit, backup/restore, and public-input suite: 100/100 passed locally | PASS — source | Runtime/provider evidence remains separate |
| Storage contracts | Private Custom Card paths are Business-prefixed; MIME/size/geometry and public token routes have source tests | PASS — source | Verify actual Staging Blob configuration and bad/missing object behavior in browser UAT |
| Environment separation | Runtime validators require explicit deployed origin, TLS DB configuration, and guarded Staging/Production identities | PASS — source | Verify actual Vercel scope by variable name only; do not print values |
| Git rulesets | Active rulesets exist for `main` and `staging` | PARTIAL | See governance gaps below |
| Domain | Repository canonical marketing origin is `https://gettanee.com`; root returned HTTP 200 during this audit | PARTIAL | Verify `www` redirect/canonical, auth callbacks, email links, and webhook URLs on the release candidate |
| Production migration rehearsal | Safe scripts and rollback/restore documentation exist | NOT RUN | Requires an explicitly authorized read-only target check and operator-owned backup/restore evidence |

## GitHub governance gaps

The active repository rulesets prevent deletion and non-fast-forward updates,
and require pull requests. They do not yet fully match the written release
policy:

1. `staging` requires `Validate application`, but does not require the separate
   `Validate migrations` context.
2. `main` requires `Validate production candidate`, but does not require the
   separate `Validate migrations` context.
3. Required checks are not strict/up-to-date with the target branch.
4. Both rulesets allow merge, squash, and rebase while the repository policy
   requires merge commits only.

The source change in this lane closes the highest-risk bypass by running the
migration checks and disposable deploy inside each required application job.
The ruleset settings themselves remain an external repository-administration
gate and are not changed by source code.

## Environment and runtime checklist

Before the Pre-Frontend Freeze, verify by variable name and deployment scope,
without revealing values:

- Preview and Staging use isolated database and Redis targets.
- Production database and Redis targets are not shared with Preview/Staging.
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, and `AUTH_URL` describe the
  intended environment and canonical topology.
- WhatsApp sender credentials remain Business-scoped; global sender values are
  not accepted as a cross-Business fallback.
- Resend, Blob, Google, Meta, Auth, and queue secrets remain server-only.
- no populated `.env` file or credential material is tracked.

## Domain and routing decision

The current source supports a same-origin SaaS topology with
`https://gettanee.com` as the canonical public site. Before Stitch, record one
explicit contract for:

- apex versus `www` canonical redirect;
- whether authenticated SaaS remains on the apex or moves to an app subdomain;
- Auth.js callback origin;
- invitation/password-reset email origin;
- WhatsApp webhook origin;
- stable Staging origin distinct from Production.

Do not let Stitch or a page-level component invent these routing decisions.

## Closeout decision

Items 19–25 are not globally closed yet. Source-level database and security
guards are strong and the inspected exact head is Green, but the external
ruleset, Vercel environment-scope, stable-domain, runtime-provider, and
Production rehearsal gates remain open. Therefore this lane must not emit
`TANEE PRE-FRONTEND PRODUCT / BACKEND / INTEGRATIONS = CLOSED`.
