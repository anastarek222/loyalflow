import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const command = readFileSync(
  new URL("../lib/server/business/playbook-application-command.ts", import.meta.url),
  "utf8",
);
const action = readFileSync(
  new URL("../app/businesses/[slug]/playbooks/actions.ts", import.meta.url),
  "utf8",
);

test("TC6.13 atomically couples an applied Playbook with one durable Sheets job", () => {
  assert.match(command, /prisma\.\$transaction/);
  assert.match(command, /transaction\.business\.update/);
  assert.match(command, /transaction\.businessActivity\.create/);
  assert.match(command, /enqueueIntegrationJob\(transaction/);
  assert.match(command, /kind: "GOOGLE_SHEETS_BUSINESS_SYNC"/);
  assert.match(command, /idempotencyKey: `playbook-applied:\$\{activity\.id\}`/);
  assert.match(command, /integrationJobId: integrationJob\.id/);
});

test("TC6.13 keeps non-mutating Playbook outcomes job-free and wakes Queue only after application", () => {
  const enqueue = command.indexOf("enqueueIntegrationJob(transaction");
  for (const outcome of [
    'return "subscription-restricted"',
    'return "missing"',
    'return "already-applied"',
    'return "confirmation-required"',
  ]) {
    const position = command.indexOf(outcome);
    assert.ok(position >= 0 && position < enqueue);
  }
  assert.match(action, /scheduleBusinessGoogleSheetsSync\(outcome\.integrationJobId\)/);
  assert.doesNotMatch(action, /syncBusinessToGoogleSheetSafely/);
});
