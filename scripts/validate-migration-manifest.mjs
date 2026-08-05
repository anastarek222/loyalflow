#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const migrationsRoot = resolve(repoRoot, "prisma", "migrations");
const manifestPath = resolve(migrationsRoot, "manifest.json");

const migrationNamePattern = /^\d{14}_[a-z0-9][a-z0-9_]*$/;
const sha256Pattern = /^[a-f0-9]{64}$/;

function fail(messages) {
  const list = Array.isArray(messages) ? messages : [messages];

  for (const message of list) {
    console.error(`ERROR: ${message}`);
  }

  process.exit(1);
}

function sha256(filePath) {
  return createHash("sha256")
    .update(readFileSync(filePath))
    .digest("hex");
}

if (!existsSync(manifestPath)) {
  fail("Missing prisma/migrations/manifest.json.");
}

let manifest;

try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (error) {
  fail(`Invalid manifest JSON: ${error.message}`);
}

const errors = [];

if (manifest.version !== 1) {
  errors.push(`Manifest version must be 1; found ${String(manifest.version)}.`);
}

if (manifest.algorithm !== "sha256") {
  errors.push(
    `Manifest algorithm must be "sha256"; found ${String(
      manifest.algorithm
    )}.`
  );
}

if (!Array.isArray(manifest.migrations)) {
  fail('Manifest field "migrations" must be an array.');
}

const entries = manifest.migrations;

if (manifest.migrationCount !== entries.length) {
  errors.push(
    `migrationCount is ${String(
      manifest.migrationCount
    )}, but manifest contains ${entries.length} entries.`
  );
}

const seenOrders = new Set();
const seenNames = new Set();
const seenPaths = new Set();
const seenChecksums = new Set();

for (let index = 0; index < entries.length; index += 1) {
  const entry = entries[index];
  const expectedOrder = index + 1;

  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    errors.push(`Entry ${expectedOrder} must be an object.`);
    continue;
  }

  const { order, name, path, sha256: checksum } = entry;

  if (order !== expectedOrder) {
    errors.push(
      `Entry ${expectedOrder} has order ${String(
        order
      )}; expected ${expectedOrder}.`
    );
  }

  if (seenOrders.has(order)) {
    errors.push(`Duplicate manifest order: ${String(order)}.`);
  }
  seenOrders.add(order);

  if (typeof name !== "string" || !migrationNamePattern.test(name)) {
    errors.push(
      `Invalid migration name at entry ${expectedOrder}: ${String(name)}.`
    );
  }

  if (seenNames.has(name)) {
    errors.push(`Duplicate migration name: ${String(name)}.`);
  }
  seenNames.add(name);

  const expectedPath =
    typeof name === "string"
      ? `prisma/migrations/${name}/migration.sql`
      : null;

  if (path !== expectedPath) {
    errors.push(
      `Invalid path for ${String(name)}: ${String(
        path
      )}; expected ${String(expectedPath)}.`
    );
  }

  if (seenPaths.has(path)) {
    errors.push(`Duplicate migration path: ${String(path)}.`);
  }
  seenPaths.add(path);

  if (typeof checksum !== "string" || !sha256Pattern.test(checksum)) {
    errors.push(
      `Invalid SHA-256 checksum for ${String(name)}: ${String(checksum)}.`
    );
  }

  if (seenChecksums.has(checksum)) {
    errors.push(
      `Duplicate SHA-256 checksum in manifest: ${String(checksum)}.`
    );
  }
  seenChecksums.add(checksum);

  if (typeof path === "string") {
    const absoluteMigrationPath = resolve(repoRoot, path);

    if (
      !absoluteMigrationPath.startsWith(
        resolve(repoRoot, "prisma", "migrations") + sep
      )
    ) {
      errors.push(`Manifest path escapes migrations directory: ${path}.`);
    } else if (!existsSync(absoluteMigrationPath)) {
      errors.push(`Missing migration file: ${path}.`);
    } else if (!statSync(absoluteMigrationPath).isFile()) {
      errors.push(`Migration path is not a file: ${path}.`);
    } else if (
      typeof checksum === "string" &&
      sha256Pattern.test(checksum)
    ) {
      const actualChecksum = sha256(absoluteMigrationPath);

      if (actualChecksum !== checksum) {
        errors.push(
          `Checksum mismatch for ${path}: expected ${checksum}, found ${actualChecksum}.`
        );
      }
    }
  }
}

const actualMigrations = readdirSync(migrationsRoot, {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => {
    const migrationSqlPath = resolve(
      migrationsRoot,
      name,
      "migration.sql"
    );
    return existsSync(migrationSqlPath);
  })
  .sort((left, right) => left.localeCompare(right, "en"));

for (const name of actualMigrations) {
  if (!migrationNamePattern.test(name)) {
    errors.push(
      `Migration directory violates timestamp_name convention: ${name}.`
    );
  }
}

const manifestNames = entries
  .map((entry) => entry?.name)
  .filter((name) => typeof name === "string");

const sortedManifestNames = [...manifestNames].sort((left, right) =>
  left.localeCompare(right, "en")
);

if (
  manifestNames.length !== sortedManifestNames.length ||
  manifestNames.some((name, index) => name !== sortedManifestNames[index])
) {
  errors.push(
    "Manifest migrations are not in deterministic lexical order."
  );
}

const actualNameSet = new Set(actualMigrations);
const manifestNameSet = new Set(manifestNames);

for (const name of actualMigrations) {
  if (!manifestNameSet.has(name)) {
    errors.push(
      `Unregistered migration exists: prisma/migrations/${name}/migration.sql. Update the manifest.`
    );
  }
}

for (const name of manifestNames) {
  if (!actualNameSet.has(name)) {
    errors.push(
      `Manifest references a deleted or renamed migration: ${name}.`
    );
  }
}

if (manifest.migrationCount !== actualMigrations.length) {
  errors.push(
    `migrationCount is ${String(
      manifest.migrationCount
    )}, but repository contains ${actualMigrations.length} migration.sql files.`
  );
}

if (entries.length !== actualMigrations.length) {
  errors.push(
    `Manifest contains ${entries.length} entries, but repository contains ${actualMigrations.length} migration.sql files.`
  );
}

for (let index = 0; index < actualMigrations.length; index += 1) {
  if (manifestNames[index] !== actualMigrations[index]) {
    errors.push(
      `Migration order mismatch at position ${index + 1}: manifest has ${String(
        manifestNames[index]
      )}, repository has ${String(actualMigrations[index])}.`
    );
  }
}

if (errors.length > 0) {
  fail(errors);
}

console.log(
  `Migration manifest valid: ${actualMigrations.length} migrations verified with SHA-256.`
);
