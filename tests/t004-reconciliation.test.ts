import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("T004 recovery runner remains disposable-local only", () => {
  const runner = source("scripts/run-t004-disposable-recovery-exercise.ts");

  assert.match(runner, /const HOST = "127\.0\.0\.1"/);
  assert.match(runner, /source_test/);
  assert.match(runner, /restore_test/);
  assert.match(runner, /LOYALFLOW_ALLOW_DISPOSABLE_DB !== "1"/);
  assert.match(runner, /process\.argv\[2\] !== "--execute"/);
  assert.match(runner, /PGHOST must be unset, localhost, or 127\.0\.0\.1/);
  assert.doesNotMatch(runner, /DATABASE_URL/);
});

test("T004 reconciliation does not overclaim production recovery objectives", () => {
  const evidence = source("docs/OPERATIONS/T004_OPERATIONAL_EVIDENCE.md");
  const recovery = source(
    "docs/OPERATIONS/T004_PRODUCTION_RECOVERY_POSTURE_EVIDENCE_2026-08-09.md",
  );

  assert.match(evidence, /Achieved production\/service RPO: unknown and unverified/);
  assert.match(evidence, /Achieved production\/service RTO: unknown and unverified/);
  assert.match(evidence, /defer a measured Production\/service RPO-RTO exercise to the public-launch readiness gate/);
  assert.match(recovery, /Achieved Production RPO: \*\*UNVERIFIED\*\*/);
  assert.match(recovery, /Achieved Production RTO: \*\*UNVERIFIED\*\*/);
});

test("T004 governance remains explicitly open after T005", () => {
  const evidence = source("docs/OPERATIONS/T004_OPERATIONAL_EVIDENCE.md");
  const ownership = source("docs/OPERATIONS/T004_OPERATIONAL_OWNERSHIP.md");

  assert.match(evidence, /Independent Reviewer: `UNASSIGNED`/);
  assert.match(evidence, /separate explicit governance exception for T004/);
  assert.match(ownership, /governance exception for another task does not automatically waive this requirement for T004/);
});
