import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const actions = source("app/businesses/[slug]/customers/actions.ts");
const command = source("lib/server/business/customer-bulk-command.ts");
const bulkStart = actions.indexOf("export async function bulkCustomerAction");
const bulkEnd = actions.indexOf("export async function createCustomerAction", bulkStart);
assert.ok(bulkStart >= 0 && bulkEnd > bulkStart);
const bulkAction = actions.slice(bulkStart, bulkEnd);

test("TC5 bulk action delegates writes and wakes the durable job", () => {
  assert.match(bulkAction, /setBulkCustomerStatusCommand/);
  assert.match(bulkAction, /mutateBulkCustomerTagCommand/);
  assert.match(bulkAction, /scheduleBusinessGoogleSheetsSync/);
  assert.doesNotMatch(bulkAction, /syncBusinessToGoogleSheetSafely/);
  assert.doesNotMatch(bulkAction, /prisma\.\$transaction/);
});

test("TC5 bulk commands preserve tenant and entitlement guards", () => {
  assert.match(command, /getBulkStateChangeIds/);
  assert.match(command, /canBusinessPerformSubscriptionOperation/);
  assert.match(command, /"OPERATE"/);
  assert.match(command, /"INVALID_SELECTION"/);
  assert.match(command, /"INVALID_TAG"/);
  assert.match(command, /transaction\.businessActivity\.createMany/);
});

test("TC6 bulk commands atomically create durable Sheets jobs including no-op submissions", () => {
  assert.match(command, /enqueueIntegrationJob/);
  assert.match(command, /kind: "GOOGLE_SHEETS_BUSINESS_SYNC"/);
  assert.match(command, /changedIds\.length === 0/);
  assert.match(command, /integrationJobId: integrationJob\.id/);
  assert.doesNotMatch(command, /process\.env|stripe|checkout|webhook/i);
});
