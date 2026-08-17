import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const actions = source("app/businesses/[slug]/playbooks/actions.ts");
const command = source("lib/server/business/playbook-application-command.ts");

test("TC5 delegates Playbook persistence out of the Server Action", () => {
  assert.match(actions, /applyBusinessPlaybookCommand\(/);
  assert.match(actions, /canPerformSubscriptionOperation\(/);
  assert.match(actions, /"OPERATE"/);
  assert.match(actions, /canManageBusiness\(session\.user, business\.id\)/);
  assert.doesNotMatch(actions, /canBusinessPerformSubscriptionOperation/);
  assert.doesNotMatch(actions, /prisma\.\$transaction/);
  assert.doesNotMatch(actions, /transaction\.business\.update/);
  assert.doesNotMatch(actions, /transaction\.businessActivity\.create/);
});

test("TC5 Playbook command owns authoritative persisted maintenance enforcement", () => {
  assert.match(command, /prisma\.\$transaction/);
  assert.match(command, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(command, /"OPERATE"/);
  assert.ok(
    command.indexOf("await canBusinessPerformSubscriptionOperation") <
      command.indexOf("await transaction.business.update"),
  );
});

test("TC5 Playbook command preserves current-state idempotency and overwrite safety", () => {
  assert.match(command, /where: \{ id: input\.businessId \}/);
  assert.match(command, /playbookMatchesBusiness\(input\.playbook, state\)/);
  assert.match(command, /isBusinessConfiguredForPlaybook\(state\)/);
  assert.match(command, /!input\.confirmedExisting/);
  assert.match(command, /getPlaybookBusinessUpdate\(input\.playbook\)/);
  assert.match(command, /"already-applied"/);
  assert.match(command, /"confirmation-required"/);
  assert.doesNotMatch(command, /transaction\.(reward|promotion|offer|campaign)\.create/);
});

test("TC5 Playbook settings mutation and audit stay atomic", () => {
  const updateIndex = command.indexOf("await transaction.business.update");
  const auditIndex = command.indexOf("await transaction.businessActivity.create");
  assert.ok(updateIndex >= 0);
  assert.ok(auditIndex > updateIndex);
  assert.match(command, /type: "BUSINESS_SETTINGS_UPDATED"/);
  assert.match(command, /businessId: input\.businessId/);
  assert.match(command, /createdById: input\.actorId/);
});

test("TC5 keeps Google Sheets synchronization post-commit in the Action", () => {
  const commandIndex = actions.indexOf("await applyBusinessPlaybookCommand");
  const syncIndex = actions.indexOf("await syncBusinessToGoogleSheetSafely");
  assert.ok(commandIndex >= 0);
  assert.ok(syncIndex > commandIndex);
  assert.doesNotMatch(command, /syncBusinessToGoogleSheetSafely/);
});

test("TC5 Playbook boundary remains provider-neutral and non-financial", () => {
  assert.doesNotMatch(
    `${actions}\n${command}`,
    /stripe|checkout|webhook|process\.env/i,
  );
});
