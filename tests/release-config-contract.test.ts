import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("production environment template keeps Neon production database authority on neondb", () => {
  const envExample = read(".env.example");

  assert.match(envExample, /^LOYALFLOW_PRODUCTION_DATABASE="neondb"$/m);
  assert.doesNotMatch(envExample, /^LOYALFLOW_PRODUCTION_DATABASE="loyalflow"$/m);
});

test("staging PR validation runs against PostgreSQL 18", () => {
  const workflow = read(".github/workflows/staging-pr-validation.yml");

  assert.match(workflow, /^\s*image: postgres:18$/m);
  assert.doesNotMatch(workflow, /^\s*image: postgres:17$/m);
});

test("migration integrity runs against PostgreSQL 18 alpine", () => {
  const workflow = read(".github/workflows/migration-integrity.yml");

  assert.match(workflow, /^\s*image: postgres:18-alpine$/m);
  assert.doesNotMatch(workflow, /^\s*image: postgres:16-alpine$/m);
});
