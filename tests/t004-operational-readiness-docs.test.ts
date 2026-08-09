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

test("T004 evidence records the measured local drill without promoting it to production RPO/RTO", () => {
  const evidence = source("docs/OPERATIONS/T004_OPERATIONAL_EVIDENCE.md");
  const recovery = source("docs/OPERATIONS/T004_DISPOSABLE_RECOVERY_EVIDENCE_2026-08-09.md");

  assert.match(evidence, /MEASURED LOCALLY \/ PRODUCTION RPO-RTO UNVERIFIED/);
  assert.match(evidence, /Backup duration: `95 ms`/);
  assert.match(evidence, /Restore duration: `53 ms`/);
  assert.match(evidence, /not production RPO\/RTO evidence/i);
  assert.match(recovery, /source_test/);
  assert.match(recovery, /restore_test/);
  assert.match(recovery, /SHA-256/i);
  assert.match(recovery, /Result: `PASS`/);
});

test("T004 evidence preserves approved recovery ownership and open independent review", () => {
  const evidence = source("docs/OPERATIONS/T004_OPERATIONAL_EVIDENCE.md");
  const ownership = source("docs/OPERATIONS/T004_OPERATIONAL_OWNERSHIP.md");

  assert.match(evidence, /Anas Tarek \(`anastarek222`\)/);
  assert.match(evidence, /Recovery Operator/);
  assert.match(evidence, /Independent Reviewer: `UNASSIGNED`/);
  assert.match(evidence, /Do not infer or invent a person/i);
  assert.match(ownership, /Database recovery execution \| Recovery Operator \| Anas Tarek \(`anastarek222`\)/);
  assert.match(ownership, /Operational evidence review \| Independent Reviewer \| `UNASSIGNED`/);
});

test("T004 evidence records Preview isolation and verified external alert delivery", () => {
  const evidence = source("docs/OPERATIONS/T004_OPERATIONAL_EVIDENCE.md");
  const monitoring = source("docs/OPERATIONS/T004_EXTERNAL_MONITORING_EVIDENCE_2026-08-09.md");

  assert.match(evidence, /VERIFIED FOR PREVIEW ISOLATION/);
  assert.match(evidence, /separately provisioned Neon PostgreSQL resource/i);
  assert.match(evidence, /environment: \"preview\"/i);
  assert.match(evidence, /VERIFIED — external monitor and alert delivery confirmed/i);
  assert.match(evidence, /loyalflow-gray\.vercel\.app\/api\/health/i);
  assert.match(evidence, /TEST: Monitor is DOWN/i);
  assert.match(evidence, /TEST: Monitor is UP/i);
  assert.match(monitoring, /UptimeRobot/i);
  assert.match(monitoring, /5 minutes/i);
  assert.match(monitoring, /Synthetic DOWN alert delivery: \*\*VERIFIED\*\*/i);
  assert.match(monitoring, /Synthetic UP\/recovery alert delivery: \*\*VERIFIED\*\*/i);
});

test("T004 evidence keeps provider and database mutations outside summary authority", () => {
  const evidence = source("docs/OPERATIONS/T004_OPERATIONAL_EVIDENCE.md");

  assert.match(evidence, /does not authorize any database connection/i);
  assert.match(evidence, /provider mutation/i);
  assert.match(evidence, /secret or environment change/i);
  assert.match(evidence, /deployment/i);
});
