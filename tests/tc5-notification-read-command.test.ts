import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const actions = source("app/businesses/[slug]/notification-actions.ts");
const command = source("lib/server/business/notification-read-command.ts");

test("TC5 Notification actions keep auth and tenant access while delegating read-state persistence", () => {
  assert.match(actions, /auth\(\)/);
  assert.match(actions, /canAccessBusiness\(session\.user, business\.id\)/);
  assert.match(actions, /markBusinessNotificationsReadCommand/);
  assert.match(actions, /markBusinessNotificationItemReadCommand/);
  assert.match(actions, /revalidatePath/);
  assert.doesNotMatch(actions, /notificationReadState\.upsert/);
  assert.doesNotMatch(actions, /notificationItemRead\.(?:upsert|deleteMany)/);
  assert.doesNotMatch(actions, /prisma\.\$transaction/);
});

test("TC5 Mark-all command atomically advances the user cutoff and clears individual markers in one tenant", () => {
  const transaction = command.indexOf("await prisma.$transaction([");
  const state = command.indexOf("prisma.notificationReadState.upsert");
  const items = command.indexOf("prisma.notificationItemRead.deleteMany");
  assert.ok(transaction >= 0 && state > transaction && items > state);
  assert.match(command, /userId: input\.userId/);
  assert.match(command, /businessId: input\.businessId/);
  assert.match(command, /lastReadAt: readAt/);
});

test("TC5 Mark-one command validates the authoritative target and writes its marker in the same transaction", () => {
  const transaction = command.indexOf(
    "await prisma.$transaction(async (transaction) =>",
  );
  const business = command.indexOf("transaction.business.findUnique", transaction);
  const target = command.indexOf(
    "await assertTenantScopedNotificationReadTarget",
    business,
  );
  const upsert = command.indexOf("transaction.notificationItemRead.upsert", target);
  assert.ok(transaction >= 0 && business > transaction && target > business && upsert > target);
  assert.match(command, /rewardThreshold: business\.rewardThreshold/);
  assert.match(command, /transaction\.notification\.findUnique/);
  assert.match(command, /transaction\.businessActivity\.findUnique/);
  assert.match(command, /transaction\.customer\.findFirst/);
  assert.match(command, /notificationKey: input\.notificationKey/);
});

test("TC5 Notification read-state intentionally remains available outside subscription lifecycle enforcement", () => {
  assert.doesNotMatch(
    command,
    /canBusinessPerformSubscriptionOperation|canPerformSubscriptionOperation/,
  );
  assert.doesNotMatch(command, /stripe|checkout|webhook|process\.env/i);
});
