import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const actions = source("app/businesses/[slug]/rewards/actions.ts");
const command = source("lib/server/business/reward-write-command.ts");

test("TC5 Reward actions keep presentation preflight and delegate persisted writes", () => {
  assert.match(actions, /canPerformSubscriptionOperation/);
  assert.match(actions, /hasFeatureEntitlement/);
  assert.match(actions, /isWithinPlanLimit/);
  assert.match(actions, /createRewardCommand/);
  assert.match(actions, /updateRewardCommand/);
  assert.match(actions, /setRewardStatusCommand/);
  assert.doesNotMatch(actions, /prisma\.\$transaction/);
  assert.doesNotMatch(actions, /transaction\.reward\.(create|update)/);
  assert.doesNotMatch(actions, /businessActivity\.create/);
});

test("TC5 Reward creation rechecks persisted lifecycle, plan feature and limit before write", () => {
  const entitlement = command.indexOf("await canBusinessPerformSubscriptionOperation");
  const businessRead = command.indexOf("transaction.business.findUnique");
  const feature = command.indexOf("hasFeatureEntitlement(business.plan");
  const limit = command.indexOf("isWithinPlanLimit(");
  const create = command.indexOf("transaction.reward.create");

  for (const position of [entitlement, businessRead, feature, limit, create]) {
    assert.ok(position >= 0);
  }
  assert.ok(entitlement < businessRead);
  assert.ok(businessRead < feature);
  assert.ok(feature < create);
  assert.ok(limit < create);
  assert.match(command, /transaction\.planConfiguration\.findUnique/);
  assert.match(command, /transaction\.reward\.count/);
  assert.match(command, /"PLAN_FEATURE"/);
  assert.match(command, /"PLAN_LIMIT"/);
});

test("TC5 Reward update and status writes preserve tenant ownership inside the transaction", () => {
  const updateStart = command.indexOf("export async function updateRewardCommand");
  const statusStart = command.indexOf("export async function setRewardStatusCommand");
  assert.ok(updateStart >= 0 && statusStart > updateStart);

  for (const slice of [
    command.slice(updateStart, statusStart),
    command.slice(statusStart),
  ]) {
    assert.match(slice, /canBusinessPerformSubscriptionOperation/);
    assert.match(slice, /"OPERATE"/);
    assert.match(
      slice,
      /where: \{ id: input\.rewardId, businessId: input\.businessId \}/,
    );
    assert.match(slice, /"TARGET_NOT_FOUND"/);
    assert.ok(
      slice.indexOf("transaction.reward.findFirst") <
        slice.indexOf("transaction.reward.update"),
    );
  }
});

test("TC5 Reward commands keep the domain write and audit atomic", () => {
  assert.match(command, /prisma\.\$transaction/);
  assert.match(command, /type: "REWARD_CREATED"/);
  assert.match(command, /type: "REWARD_UPDATED"/);
  assert.match(command, /type: "REWARD_STATUS_CHANGED"/);
  assert.match(command, /transaction\.businessActivity\.create/);
  assert.doesNotMatch(command, /stripe|checkout|webhook|process\.env/i);
});
