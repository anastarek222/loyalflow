import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateAverageDaysBetweenVisits,
  calculateAverageDaysToFirstReward,
  countDistinctCustomers,
  calculateRepeatCustomerRate,
} from "@/lib/analytics/metrics";

test("calculates the average time from customer creation to first reward", () => {
  const average = calculateAverageDaysToFirstReward(
    [
      { id: "customer-1", createdAt: new Date("2026-07-01T00:00:00Z") },
      { id: "customer-2", createdAt: new Date("2026-07-02T00:00:00Z") },
    ],
    [
      { customerId: "customer-1", firstRewardAt: new Date("2026-07-05T00:00:00Z") },
      { customerId: "customer-2", firstRewardAt: new Date("2026-07-04T00:00:00Z") },
    ]
  );

  assert.equal(average, 3);
});

test("ignores missing and chronologically invalid reward records", () => {
  assert.equal(
    calculateAverageDaysToFirstReward(
      [{ id: "customer-1", createdAt: new Date("2026-07-05T00:00:00Z") }],
      [
        { customerId: "missing", firstRewardAt: new Date("2026-07-06T00:00:00Z") },
        { customerId: "customer-1", firstRewardAt: new Date("2026-07-04T00:00:00Z") },
      ]
    ),
    null
  );
});

test("calculates visit intervals within each customer only", () => {
  assert.equal(
    calculateAverageDaysBetweenVisits([
      { customerId: "customer-1", createdAt: new Date("2026-07-01T00:00:00Z") },
      { customerId: "customer-1", createdAt: new Date("2026-07-05T00:00:00Z") },
      { customerId: "customer-2", createdAt: new Date("2026-07-02T00:00:00Z") },
      { customerId: "customer-2", createdAt: new Date("2026-07-04T00:00:00Z") },
    ]),
    3
  );
  assert.equal(
    calculateAverageDaysBetweenVisits([
      { customerId: "customer-1", createdAt: new Date("2026-07-01T00:00:00Z") },
    ]),
    null
  );
});

test("calculates repeat customer rate without dividing by zero", () => {
  assert.equal(calculateRepeatCustomerRate(3, 4), 75);
  assert.equal(calculateRepeatCustomerRate(0, 0), 0);
});

test("counts each recovered customer once even with multiple recovery events", () => {
  assert.equal(
    countDistinctCustomers([
      { customerId: "customer-1" },
      { customerId: "customer-1" },
      { customerId: "customer-2" },
      { customerId: null },
    ]),
    2
  );
});
