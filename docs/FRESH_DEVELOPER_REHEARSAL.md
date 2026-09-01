# LoyalFlow Fresh Developer Rehearsal

Status: current source/developer bootstrap acceptance contract. Manual product UAT and Production runtime acceptance remain separate.

## Goal

Prove that a new contributor can take the current repository state, install the locked dependency graph, understand the environment/safety boundaries, and run the normal application validation without relying on an already-warmed local checkout or undocumented commands.

The repository's Staging PR Validation is the repeatable clean-runner rehearsal authority because it starts on a fresh GitHub-hosted runner, checks out the PR repository state, installs the pinned pnpm version, uses the lockfile, and executes the normal validation gates.

## Developer bootstrap

A developer starts from the integration branch:

```bash
git checkout staging
git pull --ff-only
pnpm install --frozen-lockfile
```

The package-manager authority is `package.json` (`pnpm@11.17.0`). Do not substitute npm/yarn lockfiles or regenerate the dependency graph merely to make installation pass.

For local application startup:

```bash
pnpm dev
```

Environment values must be supplied outside Git. `.env.example` is a template, not a usable secret file. Never commit real database URLs, auth secrets, provider tokens, MFA material, or production credentials.

## What the clean-runner rehearsal must execute

The exact-head Staging PR Validation must complete successfully for:

1. repository checkout on a fresh hosted runner;
2. pnpm setup using the repository-pinned version;
3. Node setup using the workflow-owned version;
4. `pnpm install --frozen-lockfile`;
5. focused entitlement tests;
6. `pnpm test`;
7. `pnpm run typecheck`;
8. `pnpm run validate:workspace`;
9. `pnpm run lint`;
10. `pnpm run build`;
11. `git diff --check`.

Browser/migration smoke is conditional by changed-file scope. A docs-only handoff change does not need to manufacture a browser run; product/runtime changes must continue to use the existing scope detector and the required browser projects.

## Required reading before changing product behavior

A fresh developer should be able to find these authorities without tribal knowledge:

- `README.md` — repository, stack, local workflow, validation and safety boundaries.
- `.env.example` and `docs/ENVIRONMENT.md` — environment/configuration template and safety rules.
- `DEVELOPER_HANDOFF.md` — current product and visual-development boundaries.
- `docs/architecture/AUTH_ROLE_AUTHORITY.md` — current authentication, role, tenant and entry-routing authority.
- `docs/operations/SUPPORT_RUNBOOK.md` — safe support triage and escalation.
- `docs/OPERATIONS/P2_BACKUP_RESTORE_PROCEDURE.md` — backup/restore boundary.
- `docs/PRODUCTION_DEPLOYMENT.md` and `docs/PRODUCTION_RELEASE_CHECKLIST.md` — Production release boundary.
- `docs/CONSOLIDATED_UAT_RUNBOOK.md` — manual/non-production UAT authority.

Custom Card behavior is also summarized in `DEVELOPER_HANDOFF.md`: one required Front + Back pair, no system-generated artwork, protected dynamic overlays, explicit publish, retained immutable pairs, and one published pair at a time.

## Acceptance rule

Fresh-developer source rehearsal is accepted only when an exact-head Staging PR Validation run proves the clean checkout/install/test/typecheck/workspace/lint/build/whitespace path.

Record the exact PR head SHA and successful workflow run in the Master Launch Roadmap issue rather than hard-coding a transient SHA into this evergreen document.

This acceptance means the repository can be bootstrapped and validated from a clean CI checkout. It does **not** claim:

- a human completed every UI journey;
- a real-business Closed Beta participant completed UAT;
- a local developer possesses Production/Staging secrets;
- external providers are configured or healthy;
- Production deployment is authorized.

## Failure handling

A clean-runner failure must be classified before changing code:

- lockfile/install failure → dependency/toolchain issue;
- test/type/lint/build failure → application/source issue unless proven external;
- browser failure → inspect the exact scoped journey and fixture authority;
- hosting/provider status failure outside application CI → record separately as an external gate.

Do not add dummy commits, weaken tests, remove safety checks, expose secrets, or broaden environment permissions to manufacture a passing rehearsal.
