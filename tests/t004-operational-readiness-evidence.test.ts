import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

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

test("operational ownership matrix requires explicit real assignments", () => {
  const ownership = source("docs/OPERATIONS/T004_OPERATIONAL_OWNERSHIP.md");

  const unassigned = ownership.match(/`UNASSIGNED`/g) ?? [];
  assert.ok(unassigned.length >= 8);
  assert.match(ownership, /must not be marked complete while required accountable roles remain `UNASSIGNED`/);
  assert.match(ownership, /Do not infer assignments from GitHub usernames/);
  assert.match(ownership, /does not authorise access to secrets, production, databases/i);
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
