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
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(file)));
    } else if (/\.(?:ts|tsx|js|mjs|cjs)$/.test(entry.name)) {
      files.push(file);
    }
  }

  return files;
}

function packageImports(source) {
  return [
    ...source.matchAll(
      /(?:from\s+|import\s*\(\s*)["'](@loyalflow\/[a-z0-9-]+)(?:\/[^"']*)?["']/gi,
    ),
  ].map((match) => match[1]);
}

function internalDependencies(manifest) {
  return dependencyFields.flatMap((field) =>
    Object.keys(manifest[field] ?? {}).filter((dependency) =>
      dependency.startsWith("@loyalflow/"),
    ),
  );
}

const rootManifest = await readJson("package.json");
assert.equal(
  rootManifest.name,
  "loyalflow",
  "Root application identity must remain LoyalFlow.",
);
assert.equal(
  rootManifest.private,
  true,
  "Root application must remain private.",
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
          !source.includes(`from '${forbiddenImport}`) &&
          !source.includes(`import("${forbiddenImport}`) &&
          !source.includes(`import('${forbiddenImport}`),
        `${path.relative(repositoryRoot, file)} cannot import ${forbiddenImport}.`,
      );
    }

    for (const dependency of packageImports(source)) {
      assert.ok(
        rules.allowedInternal.includes(dependency),
        `${path.relative(repositoryRoot, file)} imports ${dependency}; allowed internal packages: ${rules.allowedInternal.join(", ") || "none"}.`,
      );
    }
  }
}

function assertAcyclic(packageName, visiting = new Set(), visited = new Set()) {
  if (visited.has(packageName)) return;
  assert.ok(
    !visiting.has(packageName),
    `Workspace dependency cycle detected at ${packageName}.`,
  );

  visiting.add(packageName);
  for (const dependency of graph.get(packageName) ?? []) {
    assertAcyclic(dependency, visiting, visited);
  }
  visiting.delete(packageName);
  visited.add(packageName);
}

for (const packageName of graph.keys()) {
  assertAcyclic(packageName);
}

console.log("Workspace package boundaries verified.");
