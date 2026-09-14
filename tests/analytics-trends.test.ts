import assert from "node:assert/strict";
import test from "node:test";

import {
  createDailyTrend,
  createHistoricalAnalyticsTrends,
} from "../lib/analytics/trends";

const from = new Date("2026-07-01T00:00:00.000Z");
const to = new Date("2026-07-03T23:59:59.999Z");

test("creates complete daily buckets and sums loyalty values", () => {
  assert.deepEqual(
    createDailyTrend(
      [
        {
          createdAt: new Date("2026-07-01T08:00:00.000Z"),
          value: 3,
        },
        {
          createdAt: new Date("2026-07-01T17:00:00.000Z"),
          value: 2,
        },
        {
          createdAt: new Date("2026-07-03T12:00:00.000Z"),
          value: 1,
        },
      ],
      from,
      to,
    ),
    [
      { date: "2026-07-01", value: 5 },
      { date: "2026-07-02", value: 0 },
      { date: "2026-07-03", value: 1 },
    ],
  );
});

test("counts events by default and ignores events outside the requested range", () => {
  assert.deepEqual(
    createDailyTrend(
      [
        { createdAt: new Date("2026-06-30T23:59:59.000Z") },
        { createdAt: new Date("2026-07-02T12:00:00.000Z") },
      ],
      from,
      to,
    ),
    [
      { date: "2026-07-01", value: 0 },
      { date: "2026-07-02", value: 1 },
      { date: "2026-07-03", value: 0 },
    ],
  );
});

test("builds historical analytics trends with complete daily buckets", () => {
  assert.deepEqual(
    createHistoricalAnalyticsTrends(
      {
        customers: [
          { createdAt: new Date("2026-07-01T09:00:00.000Z") },
          { createdAt: new Date("2026-07-01T15:00:00.000Z") },
        ],
        loyaltyEarned: [
          {
            createdAt: new Date("2026-07-01T10:00:00.000Z"),
            amount: 3,
          },
          {
            createdAt: new Date("2026-07-01T18:00:00.000Z"),
            amount: 7,
          },
          {
            createdAt: new Date("2026-07-03T11:00:00.000Z"),
            amount: 4,
          },
        ],
        rewardsRedeemed: [
          { createdAt: new Date("2026-07-02T12:00:00.000Z") },
        ],
      },
      from,
      to,
    ),
    {
      customers: [
        { date: "2026-07-01", value: 2 },
        { date: "2026-07-02", value: 0 },
        { date: "2026-07-03", value: 0 },
      ],
      loyaltyEarned: [
        { date: "2026-07-01", value: 10 },
        { date: "2026-07-02", value: 0 },
        { date: "2026-07-03", value: 4 },
      ],
      rewardsRedeemed: [
        { date: "2026-07-01", value: 0 },
        { date: "2026-07-02", value: 1 },
        { date: "2026-07-03", value: 0 },
      ],
    },
  );
});

test("buckets events by the business local date across UTC midnight", () => {
  const localFrom = new Date("2026-03-08T05:00:00.000Z");
  const localTo = new Date("2026-03-09T03:59:59.999Z");

  assert.deepEqual(
    createDailyTrend(
      [
        { createdAt: new Date("2026-03-08T04:30:00.000Z") },
        { createdAt: new Date("2026-03-08T05:30:00.000Z") },
        { createdAt: new Date("2026-03-09T03:30:00.000Z") },
      ],
      localFrom,
      localTo,
      "America/New_York",
    ),
    [{ date: "2026-03-08", value: 2 }],
  );
});

test("historical trend buckets use the same business timezone contract", () => {
  const localFrom = new Date("2026-11-01T04:00:00.000Z");
  const localTo = new Date("2026-11-02T04:59:59.999Z");

  assert.deepEqual(
    createHistoricalAnalyticsTrends(
      {
        customers: [
          { createdAt: new Date("2026-11-02T04:30:00.000Z") },
        ],
        loyaltyEarned: [],
        rewardsRedeemed: [],
      },
      localFrom,
      localTo,
      "America/New_York",
    ).customers,
    [{ date: "2026-11-01", value: 1 }],
  );
});
