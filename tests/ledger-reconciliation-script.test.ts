import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const script = readFileSync("scripts/reconcile-ledger.ts", "utf8");
const manifest = JSON.parse(readFileSync("package.json", "utf8"));

test("ledger reconciliation is an explicit tenant-scoped read-only command", () => {
  assert.equal(manifest.scripts["reconcile:ledger"], "tsx scripts/reconcile-ledger.ts");
  assert.match(script, /--business-id=/);
  assert.match(script, /where:\s*\{ businessId \}/);
  assert.match(script, /read-only-verification/);
  assert.doesNotMatch(script, /prisma\.[A-Za-z]+\.(?:create|update|upsert|delete|createMany|updateMany|deleteMany)\(/);
  assert.doesNotMatch(script, /\$executeRaw/);
});

test("ledger reconciliation refuses preview staging and production execution", () => {
  assert.match(
    script,
    /identity\.environment !== "development" && identity\.environment !== "test"/,
  );
  assert.match(script, /restricted to development or test/);
});
