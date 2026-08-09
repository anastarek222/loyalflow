import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("RPO/RTO runbook keeps planning targets explicitly unverified", () => {
  const runbook = source("docs/OPERATIONS/P2_RPO_RTO_RUNBOOK.md");

  assert.match(runbook, /RPO/i);
  assert.match(runbook, /15 minutes/i);
  assert.match(runbook, /RTO/i);
  assert.match(runbook, /30 minutes/i);
  assert.match(runbook, /(proposed|planning target)/i);
  assert.match(runbook, /(not achieved|not verified|unverified|unknown)/i);
});

test("T004 evidence cannot claim measured recovery before an approved exercise", () => {
  const evidence = source("docs/OPERATIONS/T004_OPERATIONAL_EVIDENCE.md");

  assert.match(evidence, /Current state: \*\*NOT MEASURED\*\*/);
  assert.match(evidence, /Achieved RPO: unknown/i);
  assert.match(evidence, /Achieved RTO: unknown/i);
  assert.match(evidence, /explicitly approved drill/i);
  assert.match(evidence, /database identity ending in `_test`/i);
  assert.match(evidence, /SHA-256 checksum/i);
});

test("T004 evidence requires named owners instead of invented assignments", () => {
  const evidence = source("docs/OPERATIONS/T004_OPERATIONAL_EVIDENCE.md");

  assert.match(evidence, /Incident commander \| UNASSIGNED/);
  assert.match(evidence, /Application rollback operator \| UNASSIGNED/);
  assert.match(evidence, /Database recovery operator \| UNASSIGNED/);
  assert.match(evidence, /Hosting\/provider escalation owner \| UNASSIGNED/);
  assert.match(evidence, /Monitoring\/alert recipient \| UNASSIGNED/);
  assert.match(evidence, /Do not infer or invent a person/i);
});

test("T004 evidence requires staging isolation and alert-routing proof", () => {
  const evidence = source("docs/OPERATIONS/T004_OPERATIONAL_EVIDENCE.md");

  assert.match(evidence, /Staging database identity is distinct from production/i);
  assert.match(evidence, /Staging secrets are isolated from production secrets/i);
  assert.match(evidence, /cannot read or mutate production customer data/i);
  assert.match(evidence, /External uptime\/error monitoring/i);
  assert.match(evidence, /sanitized test alert/i);
});

test("T004 evidence keeps provider and database mutations outside template authority", () => {
  const evidence = source("docs/OPERATIONS/T004_OPERATIONAL_EVIDENCE.md");

  assert.match(evidence, /does not authorize any database connection/i);
  assert.match(evidence, /provider mutation/i);
  assert.match(evidence, /secret or environment change/i);
  assert.match(evidence, /deployment/i);
});
