import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const branchActions = source("app/businesses/[slug]/branches/actions.ts");
const teamActions = source("app/businesses/[slug]/users/actions.ts");
const teamCommand = source("lib/server/business/team-provisioning-command.ts");
const branchPage = source("app/businesses/[slug]/branches/page.tsx");
const teamPage = source("app/businesses/[slug]/users/page.tsx");
const runtime = source("lib/billing/subscription-entitlement-runtime.ts");

test("TC4.5 runtime reads persisted lifecycle state and fails closed", () => {
  assert.match(runtime, /subscriptionLifecycleState: true/);
  assert.match(runtime, /canPerformSubscriptionOperation/);
  assert.match(runtime, /: false;/);
  assert.doesNotMatch(runtime, /stripe|checkout|webhook|fetch\(|process\.env/i);
});

test("TC4.5 guards branch and team expansion before authoritative writes", () => {
  assert.match(branchActions, /subscriptionLifecycleState: true/);
  assert.match(branchActions, /canPerformSubscriptionOperation\(/);
  assert.match(branchActions, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(branchActions, /"EXPAND"/);
  assert.ok(
    branchActions.indexOf("await canBusinessPerformSubscriptionOperation") <
      branchActions.indexOf("transaction.branch.create"),
  );
  assert.match(branchActions, /subscription-restricted/);

  assert.match(teamActions, /subscriptionLifecycleState: true/);
  assert.match(teamActions, /canPerformSubscriptionOperation\(/);
  assert.match(teamActions, /provisionBusinessUserCommand/);
  assert.match(teamActions, /subscription-restricted/);

  assert.match(teamCommand, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(teamCommand, /"EXPAND"/);
  assert.ok(
    teamCommand.indexOf("await canBusinessPerformSubscriptionOperation") <
      teamCommand.indexOf("transaction.user.create"),
  );
});

test("TC4.5 exposes bounded restriction feedback without removing read access", () => {
  assert.match(branchPage, /subscription-restricted/);
  assert.match(teamPage, /subscription-restricted/);
  assert.match(teamPage, /language === "AR"/);
  assert.doesNotMatch(
    `${branchActions}\n${teamActions}\n${teamCommand}`,
    /stripe|checkout|webhook|process\.env/i,
  );
});
