import assert from "node:assert/strict";
import test from "node:test";

import { buildCustomerTimeline } from "../lib/customers/timeline";

test("builds one chronological timeline without duplicating transaction activities", () => {
  const timeline = buildCustomerTimeline(
    [
      {
        id: "earn-1",
        type: "EARN",
        amount: 2,
        balanceAfter: 7,
        note: "زيارة مسجلة",
        createdAt: new Date("2026-07-20T11:00:00.000Z"),
        createdBy: { firstName: "Mona", lastName: null },
      },
      {
        id: "redeem-1",
        type: "REDEEM",
        amount: -5,
        balanceAfter: 2,
        note: "Free coffee",
        createdAt: new Date("2026-07-20T12:00:00.000Z"),
        createdBy: null,
      },
    ],
    [
      {
        id: "joined-1",
        type: "CUSTOMER_CREATED",
        description: "انضم العميل عبر التسجيل الذاتي",
        createdAt: new Date("2026-07-20T10:00:00.000Z"),
        createdBy: null,
      },
    ]
  );

  assert.deepEqual(
    timeline.map((item) => item.id),
    ["transaction:redeem-1", "transaction:earn-1", "activity:joined-1"]
  );
  assert.equal(timeline[0]?.actorName, "النظام");
  assert.equal(timeline[0]?.balanceAfter, 2);
  assert.equal(timeline[2]?.title, "انضم العميل");
});

test("builds understandable English customer timeline labels without duplicating activities", () => {
  const timeline = buildCustomerTimeline(
    [{ id: "earn", type: "EARN", amount: 1, balanceAfter: 1, note: null, createdAt: new Date(), createdBy: null }],
    [{ id: "joined", type: "CUSTOMER_CREATED", description: "", createdAt: new Date(), createdBy: null }],
    "EN",
  );
  assert.equal(timeline[0]?.actorName, "System");
  assert.equal(timeline.some((item) => item.title === "Loyalty balance added"), true);
  assert.equal(timeline.some((item) => item.title === "Customer joined"), true);
});
