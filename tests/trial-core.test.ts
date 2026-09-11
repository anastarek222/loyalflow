import { describe, expect, it } from "vitest";

import {
  TRIAL_DURATION_DAYS,
  TRIAL_DURATION_MS,
  createTrialWindow,
  getTrialDaysRemaining,
  getTrialState,
} from "@/packages/domain/src/billing/trial-core";

describe("trial-core", () => {
  it("creates a fourteen-day trial window", () => {
    const startedAt = new Date("2026-08-31T12:00:00.000Z");
    const trial = createTrialWindow(startedAt);

    expect(TRIAL_DURATION_DAYS).toBe(14);
    expect(trial.trialStartedAt.toISOString()).toBe(
      "2026-08-31T12:00:00.000Z",
    );
    expect(trial.trialEndsAt.toISOString()).toBe("2026-09-14T12:00:00.000Z");
    expect(
      trial.trialEndsAt.getTime() - trial.trialStartedAt.getTime(),
    ).toBe(TRIAL_DURATION_MS);
  });

  it("calculates whole days remaining without dropping partial days", () => {
    const trialEndsAt = new Date("2026-09-14T12:00:00.000Z");

    expect(
      getTrialDaysRemaining({
        now: new Date("2026-09-01T12:00:00.000Z"),
        trialEndsAt,
      }),
    ).toBe(13);
    expect(
      getTrialDaysRemaining({
        now: new Date("2026-09-14T11:00:00.000Z"),
        trialEndsAt,
      }),
    ).toBe(1);
    expect(
      getTrialDaysRemaining({
        now: new Date("2026-09-14T12:00:00.000Z"),
        trialEndsAt,
      }),
    ).toBe(0);
  });

  it("marks only the final trial day for reminder UX", () => {
    const trialEndsAt = new Date("2026-09-14T12:00:00.000Z");

    expect(
      getTrialState({
        now: new Date("2026-09-13T12:00:00.000Z"),
        trialEndsAt,
      }),
    ).toMatchObject({
      isTrialActive: true,
      isTrialExpired: false,
      isFinalDay: true,
      daysRemaining: 1,
    });
    expect(
      getTrialState({
        now: new Date("2026-09-13T11:59:59.999Z"),
        trialEndsAt,
      }).isFinalDay,
    ).toBe(false);
  });
});
