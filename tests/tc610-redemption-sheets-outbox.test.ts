import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const command = source("lib/server/business/loyalty-redemption-command.ts");
const action = source(
  "app/businesses/[slug]/customers/[customerId]/redemption-actions.ts",
);

test("TC6.10 atomically couples a successful redemption with one durable Sheets job", () => {
  assert.match(command, /recordRewardRedemption\(transaction/);
  assert.match(command, /enqueueIntegrationJob\(transaction/);
  assert.match(command, /loyalty-redemption:\$\{input\.idempotencyKey\}/);
  assert.ok(
    command.indexOf("recordRewardRedemption(transaction") <
      command.indexOf("enqueueIntegrationJob(transaction"),
  );
  assert.match(command, /integrationJobId: sheetsJob\.id/);
  assert.match(command, /integrationJobIds,/);
  assert.doesNotMatch(
    command,
    /@vercel\/queue|publishIntegrationJob|scheduleBusinessGoogleSheetsSync|syncBusinessToGoogleSheetSafely|process\.env|googleapis/i,
  );
});

test("TC6.10 does not enqueue blocked or insufficient-balance redemptions", () => {
  const expiredReturn = command.indexOf('return { ok: false, reason: "REWARD_EXPIRED" }');
  const redemption = command.indexOf("recordRewardRedemption(transaction");
  const insufficientReturn = command.indexOf('return { ok: false, reason: "INSUFFICIENT_BALANCE" }');
  const enqueue = command.indexOf("enqueueIntegrationJob(transaction");
  assert.ok(expiredReturn >= 0 && expiredReturn < redemption);
  assert.ok(insufficientReturn > redemption && insufficientReturn < enqueue);
});

test("TC6.10 schedules transport only after a committed successful redemption", () => {
  assert.match(action, /scheduleIntegrationJobs\(result\.integrationJobIds\)/);
  assert.doesNotMatch(action, /syncBusinessToGoogleSheetSafely/);
  assert.ok(
    action.indexOf("await redeemLoyaltyRewardCommand") <
      action.indexOf("scheduleIntegrationJobs(result.integrationJobIds)"),
  );
});
