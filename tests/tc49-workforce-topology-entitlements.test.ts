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
const userActions = source("app/businesses/[slug]/users/actions.ts");
const branchPage = source("app/businesses/[slug]/branches/page.tsx");
const userPage = source("app/businesses/[slug]/users/page.tsx");

test("TC4.9 guards workforce topology writes as OPERATE", () => {
  const guardedActions = [
    [
      action(
        branchActions,
        "assignStaffToBranchAction",
        "removeStaffAssignmentAction",
      ),
      "transaction.branchStaffAssignment.create",
    ],
    [
      action(branchActions, "removeStaffAssignmentAction"),
      "transaction.branchStaffAssignment.delete",
    ],
    [
      action(
        userActions,
        "updateBusinessUserExperienceAccessAction",
        "setBusinessUserStatusAction",
      ),
      "transaction.user.update",
    ],
  ] as const;

  for (const [sourceText, mutation] of guardedActions) {
    assert.match(sourceText, /canPerformSubscriptionOperation\(/);
    assert.match(sourceText, /canBusinessPerformSubscriptionOperation\(/);
    assert.match(sourceText, /"OPERATE"/);
    assert.match(sourceText, /subscription-restricted/);
    assert.ok(
      sourceText.indexOf("await canBusinessPerformSubscriptionOperation") <
        sourceText.indexOf(mutation),
    );
  }
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
    `${branchActions}\n${userActions}`,
    /stripe|checkout|webhook|process\.env/i,
  );
});
