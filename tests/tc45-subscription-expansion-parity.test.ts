import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const branchActions = source("app/businesses/[slug]/branches/actions.ts");
const teamActions = source("app/businesses/[slug]/users/actions.ts");
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
  for (const [sourceText, mutation] of [
    [branchActions, "transaction.branch.create"],
    [teamActions, "transaction.user.create"],
  ] as const) {
    assert.match(sourceText, /subscriptionLifecycleState: true/);
    assert.match(sourceText, /canPerformSubscriptionOperation\(/);
    assert.match(sourceText, /canBusinessPerformSubscriptionOperation\(/);
    assert.match(sourceText, /"EXPAND"/);
    assert.ok(
      sourceText.indexOf("await canBusinessPerformSubscriptionOperation") <
        sourceText.indexOf(mutation),
    );
    assert.match(sourceText, /subscription-restricted/);
  }
});

test("TC4.5 exposes bounded restriction feedback without removing read access", () => {
  assert.match(branchPage, /subscription-restricted/);
  assert.match(teamPage, /subscription-restricted/);
  assert.match(teamPage, /language === "AR"/);
  assert.doesNotMatch(
    `${branchActions}\n${teamActions}`,
    /stripe|checkout|webhook|process\.env/i,
  );
});
