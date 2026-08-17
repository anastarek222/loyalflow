import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const command = readFileSync(
  new URL("../lib/server/business/customer-bulk-command.ts", import.meta.url),
  "utf8",
);
const action = readFileSync(
  new URL("../app/businesses/[slug]/customers/actions.ts", import.meta.url),
  "utf8",
);

test("TC6.12 bulk status and tag commands commit durable Sheets jobs", () => {
  assert.match(command, /enqueueIntegrationJob/);
  assert.match(command, /kind: "GOOGLE_SHEETS_BUSINESS_SYNC"/);
  assert.match(command, /customer-bulk-\$\{scope\}:\$\{randomUUID\(\)\}/);
  assert.match(command, /integrationJobId: integrationJob\.id/);
});

test("TC6.12 bulk and customer-create actions both use durable wake-up transport", () => {
  const createStart = action.indexOf("export async function createCustomerAction");
  const bulkSource = action.slice(0, createStart);
  const createSource = action.slice(createStart);

  assert.match(bulkSource, /scheduleBusinessGoogleSheetsSync\(/);
  assert.match(createSource, /scheduleBusinessGoogleSheetsSync\(creation\.integrationJobId\)/);
  assert.doesNotMatch(action, /syncBusinessToGoogleSheetSafely/);
});
