import assert from "node:assert/strict";
import test from "node:test";
import {
  createTrialIdempotencyKey,
  createTrialWindow,
  shouldSendTrialReminder,
  TRIAL_DURATION_MS,
  TRIAL_REMINDER_LEAD_MS,
} from "@loyalflow/domain/billing/trial-core";
import {
  isTerminalSubscriptionState,
  transitionSubscriptionLifecycle,
} from "@loyalflow/domain/billing/subscription-lifecycle";

const DAY_MS = 24 * 60 * 60 * 1000;

test("builds one deterministic identity key for the same trial tuple", () => {
  const identity = {
    ownerId: "owner-1",
    businessId: "business-1",
    invitationId: "invitation-1",
  };

  assert.equal(
    createTrialIdempotencyKey(identity),
    createTrialIdempotencyKey({ ...identity })
  );
  assert.notEqual(
    createTrialIdempotencyKey(identity),
    createTrialIdempotencyKey({ ...identity, invitationId: "invitation-2" })
  );
});

test("length-prefixes identity values so delimiter-like ids cannot collide", () => {
  assert.notEqual(
    createTrialIdempotencyKey({
      ownerId: "owner:a",
      businessId: "business",
      invitationId: "invite",
    }),
    createTrialIdempotencyKey({
      ownerId: "owner",
      businessId: "a:business",
      invitationId: "invite",
    })
  );
});

test("rejects an incomplete trial identity", () => {
  assert.throws(
    () =>
      createTrialIdempotencyKey({
        ownerId: "",
        businessId: "business-1",
        invitationId: "invitation-1",
      }),
    /ownerId must not be empty/
  );
});

test("creates an exact seven-day trial with one final-day reminder boundary", () => {
  const startedAt = new Date("2026-08-31T12:00:00.000Z");
  const window = createTrialWindow(startedAt);

  assert.equal(TRIAL_DURATION_MS, 7 * DAY_MS);
  assert.equal(TRIAL_REMINDER_LEAD_MS, DAY_MS);
  assert.equal(window.startedAt.toISOString(), "2026-08-31T12:00:00.000Z");
  assert.equal(window.reminderAt.toISOString(), "2026-09-06T12:00:00.000Z");
  assert.equal(window.expiresAt.toISOString(), "2026-09-07T12:00:00.000Z");
  assert.notEqual(window.startedAt, startedAt);
});

test("sends the reminder only inside the final-day window until recorded sent", () => {
  const { reminderAt, expiresAt } = createTrialWindow(
    new Date("2026-08-31T12:00:00.000Z")
  );

  assert.equal(
    shouldSendTrialReminder({
      now: new Date(reminderAt.getTime() - 1),
      reminderAt,
      expiresAt,
    }),
    false
  );
  assert.equal(
    shouldSendTrialReminder({ now: reminderAt, reminderAt, expiresAt }),
    true
  );
  assert.equal(
    shouldSendTrialReminder({
      now: new Date(expiresAt.getTime() - 1),
      reminderAt,
      expiresAt,
      reminderSentAt: null,
    }),
    true
  );
  assert.equal(
    shouldSendTrialReminder({ now: expiresAt, reminderAt, expiresAt }),
    false
  );
  assert.equal(
    shouldSendTrialReminder({
      now: reminderAt,
      reminderAt,
      expiresAt,
      reminderSentAt: reminderAt,
    }),
    false
  );
});

test("reuses the governed subscription lifecycle for conversion and terminal states", () => {
  assert.equal(
    transitionSubscriptionLifecycle("TRIALING", "ACTIVATE"),
    "ACTIVE"
  );
  assert.equal(
    transitionSubscriptionLifecycle("TRIALING", "TRIAL_EXPIRE"),
    "EXPIRED"
  );
  assert.equal(isTerminalSubscriptionState("EXPIRED"), true);
  assert.equal(isTerminalSubscriptionState("CANCELED"), true);
  assert.throws(
    () => transitionSubscriptionLifecycle("EXPIRED", "ACTIVATE"),
    /Invalid subscription lifecycle transition/
  );
  assert.throws(
    () => transitionSubscriptionLifecycle("CANCELED", "ACTIVATE"),
    /Invalid subscription lifecycle transition/
  );
});
