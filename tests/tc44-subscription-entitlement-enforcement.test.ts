import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const runtime = readFileSync(
  new URL(
    "../lib/billing/subscription-entitlement-runtime.ts",
    import.meta.url,
  ),
  "utf8",
);
const loyalty = readFileSync(
  new URL("../lib/loyalty/transactions.ts", import.meta.url),
  "utf8",
);
const publicJoin = readFileSync(
  new URL("../app/join/[slug]/actions.ts", import.meta.url),
  "utf8",
);
const customerActions = readFileSync(
  new URL("../app/businesses/[slug]/customers/actions.ts", import.meta.url),
  "utf8",
);

test("TC4.4 reads the persisted lifecycle state and fails closed", () => {
  assert.match(runtime, /subscriptionLifecycleState: true/);
  assert.match(runtime, /canPerformSubscriptionOperation/);
  assert.match(runtime, /: false;/);
  assert.doesNotMatch(runtime, /stripe|checkout|webhook|fetch\(|process\.env/i);
});

test("TC4.4 guards every authoritative loyalty balance mutation", () => {
  assert.equal(
    loyalty.match(/canBusinessPerformSubscriptionOperation\(/g)?.length,
    3,
  );
  assert.equal(loyalty.match(/"OPERATE"/g)?.length, 3);

  const firstGuard = loyalty.indexOf(
    "await canBusinessPerformSubscriptionOperation",
  );
  const firstMutation = loyalty.indexOf("transaction.customer.updateMany");
  assert.ok(firstGuard > -1 && firstGuard < firstMutation);
});

test("TC4.4 blocks customer expansion in public and authenticated paths", () => {
  for (const source of [publicJoin, customerActions]) {
    assert.match(source, /subscriptionLifecycleState: true/);
    assert.match(source, /canPerformSubscriptionOperation\(/);
    assert.match(source, /"EXPAND"/);
    assert.match(source, /canBusinessPerformSubscriptionOperation\(/);
  }
  assert.match(publicJoin, /businessUnavailable/);
  assert.match(customerActions, /subscription-restricted/);
});
