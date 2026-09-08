import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const page = readFileSync(
  join(root, "app/businesses/[slug]/customers/[customerId]/page.tsx"),
  "utf8",
);

function quickActionsSource() {
  const start = page.indexOf("data-customer-quick-actions");
  const end = page.indexOf("</nav>", start);
  assert.ok(start >= 0 && end > start, "customer quick actions must remain present");
  return page.slice(start, end);
}

test("customer mobile quick actions prioritize permitted daily loyalty work", () => {
  const quickActions = quickActionsSource();
  const loyaltyGate = quickActions.indexOf("canEarnLoyalty || canRedeemLoyalty");
  const manageFallback = quickActions.indexOf(": canManageCustomer ?");

  assert.ok(loyaltyGate >= 0, "loyalty quick action must be capability-gated");
  assert.ok(
    manageFallback > loyaltyGate,
    "customer management must remain a fallback after daily loyalty work",
  );
  assert.match(quickActions, /href="#daily-loyalty"/);
  assert.match(quickActions, /href="#customer-details"/);
});

test("customer mobile quick actions do not offer loyalty work to read-only users", () => {
  const quickActions = quickActionsSource();
  assert.doesNotMatch(
    quickActions,
    /canManageCustomer\s*\?\s*\([\s\S]*?href="#customer-details"[\s\S]*?\)\s*:\s*\([\s\S]*?href="#daily-loyalty"/,
  );
});
