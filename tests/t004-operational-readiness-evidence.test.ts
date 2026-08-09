import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("RPO/RTO runbook keeps recovery objectives explicitly proposed and unverified", () => {
  const runbook = source("docs/OPERATIONS/P2_RPO_RTO_RUNBOOK.md");

  assert.match(runbook, /Proposed RPO:\s*15 minutes/);
  assert.match(runbook, /Proposed RTO:\s*30 minutes/);
  assert.match(runbook, /not an achieved or verified RPO/i);
  assert.match(runbook, /not an achieved or verified RTO/i);
  assert.match(runbook, /Actual achieved RPO and RTO remain unverified/i);
});

test("T004 evidence template starts unexecuted and cannot be mistaken for measured evidence", () => {
  const evidence = source("docs/OPERATIONS/T004_EVIDENCE_TEMPLATE.md");

  assert.match(evidence, /State:\s*`NOT_EXECUTED`/);
  assert.match(evidence, /Calculated achieved RPO:\s*`UNVERIFIED`/);
  assert.match(evidence, /Calculated achieved RTO:\s*`UNVERIFIED`/);
  assert.match(evidence, /Test alert delivery result:\s*`UNVERIFIED`/);
  assert.match(evidence, /Evidence contains no secrets or customer data/);
  assert.match(evidence, /T004 remains incomplete/);
});

test("operational ownership matrix records the approved primary owner without broadening permissions", () => {
  const ownership = source("docs/OPERATIONS/T004_OPERATIONAL_OWNERSHIP.md");

  for (const role of [
    "Incident Commander",
    "Release Operator",
    "Database Owner",
    "Platform Owner",
    "On-call Operator",
    "Security Owner",
  ]) {
    assert.ok(
      ownership.includes(`| ${role} | Anas Tarek (\`anastarek222\`) |`),
      `${role} should be assigned to the approved primary operational owner`,
    );
  }

  assert.match(ownership, /Recovery Operator \| `UNASSIGNED`/);
  assert.match(ownership, /Independent Reviewer \| `UNASSIGNED`/);
  assert.match(ownership, /does not itself authorise database commands, production access, provider mutations, secrets access/i);
  assert.match(ownership, /must not be marked complete while Recovery Operator and Independent Reviewer remain `UNASSIGNED`/);
});

test("disposable recovery runner is hard-bound to synthetic localhost test databases", () => {
  const runner = source("scripts/run-t004-disposable-recovery-exercise.ts");

  assert.match(runner, /const HOST = "127\.0\.0\.1"/);
  assert.match(runner, /const PORT = "5432"/);
  assert.match(runner, /loyalflow_t004_\$\{suffix\}_source_test/);
  assert.match(runner, /loyalflow_t004_\$\{suffix\}_restore_test/);
  assert.match(runner, /LOYALFLOW_ALLOW_DISPOSABLE_DB !== "1"/);
  assert.match(runner, /process\.argv\[2\] !== "--execute"/);
  assert.match(runner, /Synthetic source validation failed before backup/);
  assert.match(runner, /Restore validation failed/);
  assert.match(runner, /synthetic disposable-local exercise only; this is not production RPO\/RTO evidence/);
  assert.doesNotMatch(runner, /DATABASE_URL/);
  assert.doesNotMatch(runner, /production database/i);
});

test("backup and incident runbooks preserve database recovery safety boundaries", () => {
  const backup = source("F19_BACKUP_RECOVERY_CHECKLIST.md");
  const incident = source("F19_INCIDENT_RESPONSE_RUNBOOK.md");

  for (const document of [backup, incident]) {
    assert.match(document, /prisma migrate reset/);
    assert.match(document, /prisma migrate dev/);
    assert.match(document, /prisma db push/);
  }

  assert.match(backup, /isolated recovery database\/branch/i);
  assert.match(incident, /Keep the database migration history intact/i);
  assert.match(incident, /Prefer provider-native backups\/restore points/i);
});
