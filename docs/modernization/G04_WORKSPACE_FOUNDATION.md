# G04 Workspace Foundation Evidence

## Scope

PR3 reserves four workspace ownership boundaries without relocating or importing any
runtime code:

- `@loyalflow/domain`
- `@loyalflow/contracts`
- `@loyalflow/i18n`
- `@loyalflow/config`

`apps/web` and `apps/api` remain deferred. The existing root Next.js application,
Prisma directory, Vercel root, and root `dev`/`build`/`start` commands are unchanged.

## Import direction

| Package | Allowed future internal dependency | Runtime export in PR3 |
|---|---|---|
| `contracts` | none | none |
| `domain` | `contracts` value types only | none |
| `i18n` | `contracts` message types only | none |
| `config` | none | none |

The boundary validator rejects unapproved internal dependencies, package cycles,
runtime exports, and direct framework/database/provider imports in these packages.

## Evidence commands

```text
pnpm install --frozen-lockfile
pnpm validate:workspace
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Gate G04 passes only when the lockfile is deterministic, all existing checks remain
green, and the build continues to use the current root application entry and output.
No database command or production credential is required or authorized.
