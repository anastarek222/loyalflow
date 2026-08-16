import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function action(sourceText: string, name: string, nextName?: string) {
  const start = sourceText.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const end = nextName
    ? sourceText.indexOf(`export async function ${nextName}`, start)
    : sourceText.length;
  assert.ok(end > start, `${name} must have a bounded source slice`);
  return sourceText.slice(start, end);
}

const branchActions = source("app/businesses/[slug]/branches/actions.ts");
const branchStaffCommand = source("lib/server/business/branch-staff-assignment-command.ts");
const userActions = source("app/businesses/[slug]/users/actions.ts");
const branchPage = source("app/businesses/[slug]/branches/page.tsx");
const userPage = source("app/businesses/[slug]/users/page.tsx");

test("TC4.9 guards workforce topology writes as OPERATE", () => {
  for (const branchAction of [
    action(
      branchActions,
      "assignStaffToBranchAction",
      "removeStaffAssignmentAction",
    ),
    action(branchActions, "removeStaffAssignmentAction"),
  ]) {
    assert.match(branchAction, /canPerformSubscriptionOperation\(/);
    assert.match(branchAction, /"OPERATE"/);
    assert.match(branchAction, /subscription-restricted/);
  }
  assert.match(branchActions, /assignStaffToBranchCommand/);
  assert.match(branchActions, /removeStaffAssignmentCommand/);
  assert.match(branchStaffCommand, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(branchStaffCommand, /"OPERATE"/);
  assert.ok(
    branchStaffCommand.indexOf("await canBusinessPerformSubscriptionOperation") <
      branchStaffCommand.indexOf("transaction.branchStaffAssignment.create"),
  );
  assert.ok(
    branchStaffCommand.indexOf("await canBusinessPerformSubscriptionOperation") <
      branchStaffCommand.indexOf("transaction.branchStaffAssignment.delete"),
  );

  const userAction = action(
    userActions,
    "updateBusinessUserExperienceAccessAction",
    "setBusinessUserStatusAction",
  );
  assert.match(userAction, /canPerformSubscriptionOperation\(/);
  assert.match(userAction, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(userAction, /"OPERATE"/);
  assert.match(userAction, /subscription-restricted/);
  assert.ok(
    userAction.indexOf("await canBusinessPerformSubscriptionOperation") <
      userAction.indexOf("transaction.user.update"),
  );
});

test("TC4.9 intentionally preserves account status and password security controls", () => {
  const statusAction = action(
    userActions,
    "setBusinessUserStatusAction",
    "resetBusinessUserPasswordAction",
  );
  const passwordAction = action(userActions, "resetBusinessUserPasswordAction");

  for (const sourceText of [statusAction, passwordAction]) {
    assert.doesNotMatch(sourceText, /canPerformSubscriptionOperation/);
    assert.doesNotMatch(sourceText, /canBusinessPerformSubscriptionOperation/);
  }
  assert.match(statusAction, /isActive: parsedStatus\.data/);
  assert.match(passwordAction, /authVersion/);
});

test("TC4.9 exposes bounded feedback without provider or schema behavior", () => {
  assert.match(branchPage, /query\.error === "subscription-restricted"/);
  assert.match(userPage, /query\.error === "subscription-restricted"/);
  assert.match(userPage, /security controls remain accessible/);
  assert.doesNotMatch(
    `${branchActions}\n${branchStaffCommand}\n${userActions}`,
    /stripe|checkout|webhook|process\.env/i,
  );
});
