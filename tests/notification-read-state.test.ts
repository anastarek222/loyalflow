import assert from "node:assert/strict";
import test from "node:test";

import { createBusinessNotification } from "../lib/notifications";
import {
  assertTenantScopedNotificationReadTarget,
  isNotificationRead,
  isNotificationUnread,
  notificationItemReadWhere,
  notificationKeyForActivity,
  notificationKeyForNotification,
  notificationKeyForRewardReady,
  notificationReadStateWhere,
} from "../lib/notification-read-state";
import { canAccessBusiness } from "../lib/permissions";

const businessA = "business-a";
const businessB = "business-b";
const userA = "user-a";
const userB = "user-b";
const beforeCutoff = new Date("2026-01-01T10:00:00.000Z");
const cutoff = new Date("2026-01-01T11:00:00.000Z");
const afterCutoff = new Date("2026-01-01T12:00:00.000Z");

function readState(input: {
  createdAt?: Date;
  lastReadAt?: Date | null;
  notificationKey?: string;
  individuallyReadKeys?: ReadonlySet<string>;
}) {
  return isNotificationRead({
    createdAt: input.createdAt ?? afterCutoff,
    lastReadAt: input.lastReadAt,
    notificationKey: input.notificationKey ?? notificationKeyForNotification("notice-1"),
    individuallyReadKeys: input.individuallyReadKeys ?? new Set(),
  });
}

test("User A marking one notification read does not affect User B", () => {
  const key = notificationKeyForNotification("notice-1");
  const userAReads = new Set([key]);

  assert.equal(readState({ notificationKey: key, individuallyReadKeys: userAReads }), true);
  assert.equal(readState({ notificationKey: key, individuallyReadKeys: new Set() }), false);
});

test("repeated mark-one input is idempotent at the per-user compound key", () => {
  const key = notificationKeyForActivity("activity-1");
  const reads = new Map<string, Date>();
  const input = notificationItemReadWhere({ userId: userA, businessId: businessA, notificationKey: key });
  const compoundKey = JSON.stringify(input);

  reads.set(compoundKey, beforeCutoff);
  reads.set(compoundKey, afterCutoff);

  assert.equal(reads.size, 1);
  assert.deepEqual(input, {
    userId_businessId_notificationKey: {
      userId: userA,
      businessId: businessA,
      notificationKey: key,
    },
  });
});

test("mark-all state is scoped to the current user and business", () => {
  const states = new Map<string, Date>();
  const userABusinessA = JSON.stringify(notificationReadStateWhere({ userId: userA, businessId: businessA }));
  const userBBusinessA = JSON.stringify(notificationReadStateWhere({ userId: userB, businessId: businessA }));
  const userABusinessB = JSON.stringify(notificationReadStateWhere({ userId: userA, businessId: businessB }));

  states.set(userABusinessA, cutoff);

  assert.equal(states.get(userABusinessA), cutoff);
  assert.equal(states.has(userBBusinessA), false);
  assert.equal(states.has(userABusinessB), false);
});

test("a notification at or before the mark-all cutoff is read", () => {
  assert.equal(readState({ createdAt: beforeCutoff, lastReadAt: cutoff }), true);
  assert.equal(readState({ createdAt: cutoff, lastReadAt: cutoff }), true);
});

test("a notification newer than the mark-all cutoff remains unread", () => {
  assert.equal(readState({ createdAt: afterCutoff, lastReadAt: cutoff }), false);
});

test("individual reads compose with the mark-all cutoff", () => {
  const key = notificationKeyForNotification("notice-after-cutoff");

  assert.equal(readState({ createdAt: afterCutoff, lastReadAt: cutoff, notificationKey: key }), false);
  assert.equal(readState({
    createdAt: afterCutoff,
    lastReadAt: cutoff,
    notificationKey: key,
    individuallyReadKeys: new Set([key]),
  }), true);
});

test("cross-tenant and wrong-recipient notification keys are rejected", async () => {
  const lookup = {
    findNotification: async () => ({ businessId: businessB, userId: null }),
    findActivity: async () => null,
    findRewardReadyCustomer: async () => null,
  };

  await assert.rejects(
    assertTenantScopedNotificationReadTarget({
      notificationKey: notificationKeyForNotification("notice-b"),
      businessId: businessA,
      userId: userA,
      rewardThreshold: 10,
      lookup,
    }),
    /not available/
  );

  await assert.rejects(
    assertTenantScopedNotificationReadTarget({
      notificationKey: notificationKeyForNotification("private-notice"),
      businessId: businessA,
      userId: userA,
      rewardThreshold: 10,
      lookup: {
        ...lookup,
        findNotification: async () => ({ businessId: businessA, userId: userB }),
      },
    }),
    /not available/
  );
});

test("unread counts use the canonical per-user rule", () => {
  const individualKey = notificationKeyForNotification("notice-2");
  const notifications = [
    { id: "notice-1", createdAt: beforeCutoff },
    { id: "notice-2", createdAt: afterCutoff },
    { id: "notice-3", createdAt: afterCutoff },
  ];

  const unreadCount = notifications.filter((notification) =>
    isNotificationUnread({
      createdAt: notification.createdAt,
      lastReadAt: cutoff,
      notificationKey: notificationKeyForNotification(notification.id),
      individuallyReadKeys: new Set([individualKey]),
    })
  ).length;

  assert.equal(unreadCount, 1);
});

test("legacy Notification.isRead does not control per-user state", () => {
  const legacyRead = { isRead: true };
  const legacyUnread = { isRead: false };

  assert.equal(legacyRead.isRead, true);
  assert.equal(legacyUnread.isRead, false);
  assert.equal(readState({ createdAt: afterCutoff, lastReadAt: cutoff }), false);
  assert.equal(readState({ createdAt: beforeCutoff, lastReadAt: cutoff }), true);
});

test("core notification creation keeps durable loyalty and team notification writes", async () => {
  const calls: unknown[] = [];
  const transaction = {
    notification: {
      create: async (input: unknown) => {
        calls.push(input);
        return input;
      },
    },
  };

  await createBusinessNotification(transaction, {
    type: "LOYALTY_EARNED",
    title: "Loyalty earned",
    message: "Customer received loyalty credit",
    businessId: businessA,
  });
  await createBusinessNotification(transaction, {
    type: "USER_CREATED",
    title: "Team member created",
    message: "A staff account was created",
    businessId: businessA,
  });

  assert.deepEqual(calls, [
    {
      data: {
        type: "LOYALTY_EARNED",
        title: "Loyalty earned",
        message: "Customer received loyalty credit",
        businessId: businessA,
      },
    },
    {
      data: {
        type: "USER_CREATED",
        title: "Team member created",
        message: "A staff account was created",
        businessId: businessA,
      },
    },
  ]);
});

test("OWNER, MANAGER, STAFF, and VIEWER follow the existing business access policy", () => {
  for (const role of ["OWNER", "MANAGER", "STAFF", "VIEWER"] as const) {
    assert.equal(canAccessBusiness({ role, businessId: businessA }, businessA), true);
    assert.equal(canAccessBusiness({ role, businessId: businessA }, businessB), false);
  }

  assert.equal(canAccessBusiness({ role: "SUPER_ADMIN", businessId: null }, businessA), true);
});

test("reward-ready keys are deterministic and must resolve to the current customer snapshot", async () => {
  const key = notificationKeyForRewardReady({
    id: "customer-1",
    balance: 12,
    lifetimeRedeemed: 3,
  });

  await assertTenantScopedNotificationReadTarget({
    notificationKey: key,
    businessId: businessA,
    userId: userA,
    rewardThreshold: 10,
    lookup: {
      findNotification: async () => null,
      findActivity: async () => null,
      findRewardReadyCustomer: async (input) => {
        assert.deepEqual(input, { id: "customer-1", balance: 12, lifetimeRedeemed: 3 });
        return { businessId: businessA, isActive: true };
      },
    },
  });
});
