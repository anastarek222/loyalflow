import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { projectPaymentStateToSubscriptionLifecycle } from "@/lib/billing/subscription-lifecycle-projection";

test("TC4.2 projects every current operational payment state", () => {
  assert.equal(projectPaymentStateToSubscriptionLifecycle("TRIAL"), "TRIALING");
  assert.equal(projectPaymentStateToSubscriptionLifecycle("PAID"), "ACTIVE");
  assert.equal(projectPaymentStateToSubscriptionLifecycle("DUE_SOON"), "ACTIVE");
  assert.equal(projectPaymentStateToSubscriptionLifecycle("DUE"), "ACTIVE");
  assert.equal(projectPaymentStateToSubscriptionLifecycle("OVERDUE"), "PAST_DUE");
  assert.equal(projectPaymentStateToSubscriptionLifecycle("SUSPENDED"), "SUSPENDED");
});

test("TC4.2 fails closed instead of inventing unsupported lifecycle state", () => {
  for (const value of ["PENDING", "CANCELED", "EXPIRED", "UNKNOWN", null, 1]) {
    assert.equal(projectPaymentStateToSubscriptionLifecycle(value), null);
  }
});

test("TC4.2 remains a read-only projection with no entitlement or persistence path", () => {
  const projection = readFileSync(
    new URL("../lib/billing/subscription-lifecycle-projection.ts", import.meta.url),
    "utf8",
  );
  const page = readFileSync(
    new URL("../app/operations/page.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(
    projection,
    /prisma|fetch\(|create\(|update\(|delete\(|upsert\(|transitionSubscriptionLifecycle|getSubscriptionAccessPolicy/i,
  );
  assert.match(page, /projectPaymentStateToSubscriptionLifecycle/);
  assert.doesNotMatch(page, /transitionSubscriptionLifecycle/);
});
