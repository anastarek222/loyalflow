import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const command = source(
  "lib/server/business/customer-record-maintenance-command.ts",
);
const action = source(
  "app/businesses/[slug]/customers/[customerId]/customer-record-actions.ts",
);
const facade = source(
  "app/businesses/[slug]/customers/[customerId]/actions.ts",
);

test("TC6.7 atomically enqueues Sheets work after each customer record mutation and audit", () => {
  assert.match(command, /enqueueIntegrationJob/);
  assert.match(command, /GOOGLE_SHEETS_BUSINESS_SYNC/);
  assert.match(command, /customer-record-updated:\$\{activity\.id\}/);
  assert.match(command, /customer-record-status:\$\{activity\.id\}/);
  assert.equal((command.match(/integrationJobId: integrationJob\.id/g) ?? []).length, 2);

  const updateWrite = command.indexOf("transaction.customer.update");
  const updateActivity = command.indexOf("const activity = await transaction.businessActivity.create");
  const updateEnqueue = command.indexOf("const integrationJob = await enqueueIntegrationJob");
  assert.ok(updateWrite >= 0 && updateActivity > updateWrite && updateEnqueue > updateActivity);

  const statusStart = command.indexOf("export async function setCustomerRecordStatusCommand");
  const status = command.slice(statusStart);
  assert.ok(status.indexOf("transaction.customer.update") < status.indexOf("const activity = await transaction.businessActivity.create"));
  assert.ok(status.indexOf("const activity = await transaction.businessActivity.create") < status.indexOf("const integrationJob = await enqueueIntegrationJob"));
  assert.doesNotMatch(command, /@vercel\/queue|publishIntegrationJob|scheduleBusinessGoogleSheetsSync|process\.env|googleapis/i);
});

test("TC6.7 wakes the Queue only after successful command completion and removes direct provider sync", () => {
  assert.match(action, /from "@\/lib\/google-sheets-sync-scheduler"/);
  assert.match(action, /scheduleBusinessGoogleSheetsSync\(mutation\.integrationJobId\)/);
  assert.equal((action.match(/scheduleBusinessGoogleSheetsSync\(mutation\.integrationJobId\)/g) ?? []).length, 2);
  assert.doesNotMatch(action, /syncBusinessToGoogleSheetSafely/);
  assert.doesNotMatch(action, /@vercel\/queue|process\.env|googleapis/i);
  assert.ok(
    action.indexOf("await updateCustomerRecordCommand") <
      action.indexOf("scheduleBusinessGoogleSheetsSync(mutation.integrationJobId)"),
  );
});

test("TC6.7 keeps the active compatibility names while routing record writes to the outbox actions", () => {
  assert.match(facade, /from "\.\/customer-record-actions"/);
  assert.match(facade, /return updateCustomerRecordCommandAction\(slug, customerId, formData\)/);
  assert.match(facade, /return setCustomerRecordStatusCommandAction\(slug, customerId, isActive\)/);
  assert.doesNotMatch(
    facade,
    /return legacy\.updateCustomerAction|return legacy\.setCustomerStatusAction/,
  );
});
