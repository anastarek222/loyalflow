import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const command = readFileSync(
  new URL("../lib/server/business/customer-create-command.ts", import.meta.url),
  "utf8",
);
const action = readFileSync(
  new URL("../app/businesses/[slug]/customers/actions.ts", import.meta.url),
  "utf8",
);

test("TC6.11 atomically couples customer creation with one durable Sheets job", () => {
  assert.match(command, /prisma\.\$transaction/);
  assert.match(command, /transaction\.customer\.create/);
  assert.match(command, /transaction\.businessActivity\.create/);
  assert.match(command, /enqueueIntegrationJob\(transaction/);
  assert.match(command, /kind: "GOOGLE_SHEETS_BUSINESS_SYNC"/);
  assert.match(command, /idempotencyKey: `customer-created:\$\{activity\.id\}`/);
  assert.match(command, /integrationJobId: integrationJob\.id/);
});

test("TC6.11 and TC6.12 both wake durable jobs after successful commands", () => {
  const createStart = action.indexOf("export async function createCustomerAction");
  const createSource = action.slice(createStart);
  const bulkSource = action.slice(0, createStart);

  assert.match(createSource, /createCustomerCommand\(/);
  assert.match(
    createSource,
    /scheduleBusinessGoogleSheetsSync\(creation\.integrationJobId\)/,
  );
  assert.match(bulkSource, /scheduleBusinessGoogleSheetsSync\(mutation\.integrationJobId\)/);
  assert.doesNotMatch(createSource, /syncBusinessToGoogleSheetSafely/);
  assert.doesNotMatch(bulkSource, /syncBusinessToGoogleSheetSafely/);
});
