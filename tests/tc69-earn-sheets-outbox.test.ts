import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const command = source("lib/server/business/loyalty-earn-command.ts");
const action = source(
  "app/businesses/[slug]/customers/[customerId]/loyalty-earn-actions.ts",
);

test("TC6.9 atomically couples a successful earn with one durable Sheets job", () => {
  assert.match(command, /recordLoyaltyEarn\(transaction/);
  assert.match(command, /createRewardUnlocksForEarn\(transaction/);
  assert.match(command, /enqueueIntegrationJob\(transaction/);
  assert.match(command, /loyalty-earn:\$\{input\.idempotencyKey\}/);
  assert.ok(
    command.indexOf("recordLoyaltyEarn(transaction") <
      command.indexOf("enqueueIntegrationJob(transaction"),
  );
  assert.match(command, /if \(balanceAfter === null\)/);
  assert.doesNotMatch(
    command,
    /@vercel\/queue|publishIntegrationJob|scheduleBusinessGoogleSheetsSync|syncBusinessToGoogleSheetSafely|process\.env|googleapis/i,
  );
});

test("TC6.9 schedules transport only after the committed earn succeeds", () => {
  assert.match(action, /scheduleBusinessGoogleSheetsSync\(result\.integrationJobId\)/);
  assert.doesNotMatch(action, /syncBusinessToGoogleSheetSafely/);
  assert.ok(
    action.indexOf("await executeLoyaltyEarnCommand") <
      action.indexOf("scheduleBusinessGoogleSheetsSync(result.integrationJobId)"),
  );
});
