import assert from "node:assert/strict";
import test from "node:test";

import {
  TRIAL_DURATION_DAYS,
  TRIAL_DURATION_MS,
  createTrialWindow,
  getTrialDaysRemaining,
  getTrialState,
} from "@/packages/domain/src/billing/trial-core";

test("trial-core creates a fourteen-day trial window", () => {
  const startedAt = new Date("2026-08-31T12:00:00.000Z");
  const trial = createTrialWindow(startedAt);

  assert.equal(TRIAL_DURATION_DAYS, 14);
  assert.equal(trial.trialStartedAt.toISOString(), "2026-08-31T12:00:00.000Z");
  assert.equal(trial.trialEndsAt.toISOString(), "2026-09-14T12:00:00.000Z");
  assert.equal(
    trial.trialEndsAt.getTime() - trial.trialStartedAt.getTime(),
    TRIAL_DURATION_MS,
  );
});

test("trial-core calculates whole days remaining without dropping partial days", () => {
  const trialEndsAt = new Date("2026-09-14T12:00:00.000Z");

  assert.equal(
    getTrialDaysRemaining({
      now: new Date("2026-09-01T12:00:00.000Z"),
      trialEndsAt,
    }),
    13,
  );
  assert.equal(
    getTrialDaysRemaining({
      now: new Date("2026-09-14T11:00:00.000Z"),
      trialEndsAt,
    }),
    1,
  );
  assert.equal(
    getTrialDaysRemaining({
      now: new Date("2026-09-14T12:00:00.000Z"),
      trialEndsAt,
    }),
    0,
  );
});

test("trial-core marks only the final trial day for reminder UX", () => {
  const trialEndsAt = new Date("2026-09-14T12:00:00.000Z");

  assert.deepEqual(
    getTrialState({
      now: new Date("2026-09-13T12:00:00.000Z"),
      trialEndsAt,
    }),
    {
      isTrialActive: true,
      isTrialExpired: false,
      isFinalDay: true,
      daysRemaining: 1,
    },
  );
  assert.equal(
    getTrialState({
      now: new Date("2026-09-13T11:59:59.999Z"),
      trialEndsAt,
    }).isFinalDay,
    false,
  );
});
