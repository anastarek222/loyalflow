import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const expectedPackages = new Map([
  [
    "packages/contracts",
    {
      name: "@loyalflow/contracts",
      allowedInternal: [],
      exports: {
        "./api/v1": "./src/api/v1.ts",
        "./customers/public-membership": "./src/customers/public-membership.ts",
        "./cards/public-card": "./src/cards/public-card.ts",
        "./integrations/health": "./src/integrations/health.ts",
      },
    },
  ],
  [
    "packages/domain",
    {
      name: "@loyalflow/domain",
      allowedInternal: ["@loyalflow/contracts"],
      exports: {
        "./billing/subscription-lifecycle":
          "./src/billing/subscription-lifecycle.ts",
        "./integrations/health": "./src/integrations/health.ts",
        "./loyalty/progress": "./src/loyalty/progress.ts",
        "./loyalty/reconciliation": "./src/loyalty/reconciliation.ts",
      },
    },
  ],
  [
    "packages/i18n",
    {
      name: "@loyalflow/i18n",
      allowedInternal: ["@loyalflow/contracts"],
      exports: {
        "./auth": "./src/auth.ts",
        "./common": "./src/common.ts",
        "./navigation": "./src/navigation.ts",
        "./owner-invite": "./src/owner-invite.ts",
        "./password-policy": "./src/password-policy.ts",
      },
    },
  ],
  [
    "packages/config",
    { name: "@loyalflow/config", allowedInternal: [], exports: {} },
  ],
]);

const forbiddenRuntimeImports = [
  "next",
  "react",
  "@prisma/client",
  "@/lib/prisma",
  "generated/prisma",
  "googleapis",
];

const dependencyFields = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

async function readJson(relativePath) {
  return JSON.parse(
    await readFile(path.join(repositoryRoot, relativePath), "utf8"),
  );
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === "node_modules") continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(target)));
    else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) files.push(target);
  }

  return files;
}

function internalDependencies(manifest) {
  return dependencyFields.flatMap((field) =>
    Object.keys(manifest[field] ?? {}).filter((name) =>
      name.startsWith("@loyalflow/"),
    ),
  );
}

const rootManifest = await readJson("package.json");
assert.equal(
  rootManifest.scripts.dev,
  "next dev",
  "Root dev entry point must remain unchanged.",
);
assert.equal(
  rootManifest.scripts.build,
  "prisma generate && next build --webpack",
  "Root production build entry point must remain unchanged.",
);
assert.equal(
  rootManifest.scripts.start,
  "next start",
  "Root start entry point must remain unchanged.",
);

const graph = new Map();

for (const [relativeDirectory, rules] of expectedPackages) {
  const manifest = await readJson(`${relativeDirectory}/package.json`);
  assert.equal(
    manifest.name,
    rules.name,
    `${relativeDirectory} must keep its reserved package name.`,
  );
  assert.equal(
    manifest.private,
    true,
    `${rules.name} must remain private during extraction.`,
  );
  assert.deepEqual(
    manifest.exports,
    rules.exports,
    `${rules.name} exposes an unexpected runtime module.`,
  );

  const dependencies = internalDependencies(manifest);
  for (const dependency of dependencies) {
    assert.ok(
      rules.allowedInternal.includes(dependency),
      `${rules.name} cannot depend on ${dependency}; allowed: ${rules.allowedInternal.join(", ") || "none"}.`,
    );
  }
  graph.set(rules.name, dependencies);

  for (const file of await sourceFiles(
    path.join(repositoryRoot, relativeDirectory),
  )) {
    const source = await readFile(file, "utf8");
    for (const forbiddenImport of forbiddenRuntimeImports) {
      assert.ok(
        !source.includes(`from "${forbiddenImport}`) &&
          !source.includes(`from '${forbiddenImport}`),
        `${path.relative(repositoryRoot, file)} imports forbidden runtime boundary ${forbiddenImport}.`,
      );
    }
  }
}

const visited = new Set();
const active = new Set();

function visit(packageName) {
  if (active.has(packageName))
    throw new Error(`Workspace package cycle detected at ${packageName}.`);
  if (visited.has(packageName)) return;

  active.add(packageName);
  for (const dependency of graph.get(packageName) ?? []) visit(dependency);
  active.delete(packageName);
  visited.add(packageName);
}

for (const packageName of graph.keys()) visit(packageName);

console.log(
  "Workspace boundaries are valid (4 packages, 13 approved runtime exports, no cycles).",
);