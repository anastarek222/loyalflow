import assert from "node:assert/strict";
import test from "node:test";

import {
  canConsumeInternalEvent,
  createInternalEvent,
  getInternalEventDeliveryDecision,
} from "../lib/events/foundation";

test("internal events get a deterministic tenant-scoped idempotency key", () => {
  const input = {
    type: "LOYALTY_BALANCE_CHANGED" as const,
    businessId: "business-a",
    customerId: "customer-a",
    sourceId: "transaction-a",
    occurredAt: new Date("2026-07-20T00:00:00.000Z"),
    payload: { balanceAfter: 8, rewardReady: true },
  };
  const first = createInternalEvent(input);
  const second = createInternalEvent(input);
  assert.equal(first?.idempotencyKey, "LOYALTY_BALANCE_CHANGED:business-a:customer-a:transaction-a");
  assert.equal(first?.idempotencyKey, second?.idempotencyKey);
});

test("events cannot cross tenant consumers or accept unsafe identifiers", () => {
  const event = createInternalEvent({
    type: "BUSINESS_PRESENTATION_CHANGED",
    businessId: "business-a",
    customerId: null,
    sourceId: "activity-a",
    occurredAt: new Date(),
    payload: { reason: "settings" },
  });
  assert.ok(event);
  assert.equal(canConsumeInternalEvent(event, "business-a"), true);
  assert.equal(canConsumeInternalEvent(event, "business-b"), false);
  assert.equal(createInternalEvent({ ...event, businessId: "business a" }), null);
});

test("the foundation has no webhook, provider, or network delivery", () => {
  assert.equal(getInternalEventDeliveryDecision(), "NOOP_DISABLED");
});
