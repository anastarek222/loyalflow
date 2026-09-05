import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const command = source(
  "lib/server/business/customer-balance-adjustment-command.ts",
);
const action = source(
  "app/businesses/[slug]/customers/[customerId]/balance-adjustment-action.ts",
);

test("TC6.8 atomically couples successful balance adjustment with one durable Sheets job", () => {
  assert.match(command, /recordBalanceAdjustment\(transaction/);
  assert.match(command, /enqueueIntegrationJob\(transaction/);
  assert.match(
    command,
    /customer-balance-adjustment:\$\{input\.idempotencyKey\}/,
  );
  assert.ok(
    command.indexOf("recordBalanceAdjustment(transaction") <
      command.indexOf("enqueueIntegrationJob(transaction"),
  );
  assert.match(command, /if \(balance === null\)/);
  assert.match(command, /integrationJobId: null/);
  assert.doesNotMatch(
    command,
    /@vercel\/queue|publishIntegrationJob|scheduleBusinessGoogleSheetsSync|process\.env|googleapis/i,
  );
});

test("TC6.8 schedules transport only after the committed command succeeds", () => {
  assert.match(action, /from "@\/lib\/integration-job-scheduler"/);
  assert.match(action, /scheduleIntegrationJobs\(result\.integrationJobIds\)/);
  assert.doesNotMatch(action, /syncBusinessToGoogleSheetSafely/);
  assert.ok(
    action.indexOf("await adjustCustomerBalanceCommand") <
      action.indexOf("scheduleIntegrationJobs(result.integrationJobIds)"),
  );
});
