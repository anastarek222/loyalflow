import assert from "node:assert/strict";
import test from "node:test";

import { createDailyTrend } from "../lib/analytics/trends";

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
      to
    ),
    [
      { date: "2026-07-01", value: 5 },
      { date: "2026-07-02", value: 0 },
      { date: "2026-07-03", value: 1 },
    ]
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
      to
    ),
    [
      { date: "2026-07-01", value: 0 },
      { date: "2026-07-02", value: 1 },
      { date: "2026-07-03", value: 0 },
    ]
  );
});
