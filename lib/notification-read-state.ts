/**
 * Canonical per-user notification read state.
 *
 * `Notification.isRead` predates per-user read tracking and is deliberately
 * not consulted here. It remains a legacy compatibility column only.
 */

const notificationIdPattern = /^[A-Za-z0-9_-]{1,200}$/;
const integerPattern = /^-?\d+$/;

export type NotificationReadKey =
  | { kind: "notification"; notificationId: string }
  | { kind: "activity"; activityId: string }
  | {
      kind: "reward-ready";
      customerId: string;
      balance: number;
      lifetimeRedeemed: number;
    };

export function notificationKeyForNotification(notificationId: string) {
  return `notification:${notificationId}`;
}

export function notificationKeyForActivity(activityId: string) {
  return `activity:${activityId}`;
}

export function notificationKeyForRewardReady(customer: {
  id: string;
  balance: number;
  lifetimeRedeemed: number;
}) {
  return [
    "reward-ready",
    customer.id,
    customer.balance,
    customer.lifetimeRedeemed,
  ].join(":");
}

export function parseNotificationReadKey(
  notificationKey: string
): NotificationReadKey | null {
  const parts = notificationKey.split(":");

  if (
    parts.length === 2 &&
    parts[0] === "notification" &&
    notificationIdPattern.test(parts[1])
  ) {
    return { kind: "notification", notificationId: parts[1] };
  }

  if (
    parts.length === 2 &&
    parts[0] === "activity" &&
    notificationIdPattern.test(parts[1])
  ) {
    return { kind: "activity", activityId: parts[1] };
  }

  if (
    parts.length === 4 &&
    parts[0] === "reward-ready" &&
    notificationIdPattern.test(parts[1]) &&
    integerPattern.test(parts[2]) &&
    integerPattern.test(parts[3])
  ) {
    const balance = Number(parts[2]);
    const lifetimeRedeemed = Number(parts[3]);

    if (Number.isSafeInteger(balance) && Number.isSafeInteger(lifetimeRedeemed)) {
      return {
        kind: "reward-ready",
        customerId: parts[1],
        balance,
        lifetimeRedeemed,
      };
    }
  }

  return null;
}

export function isNotificationRead(input: {
  createdAt: Date;
  lastReadAt: Date | null | undefined;
  notificationKey: string;
  individuallyReadKeys: ReadonlySet<string>;
}) {
  return (
    input.individuallyReadKeys.has(input.notificationKey) ||
    (input.lastReadAt !== null &&
      input.lastReadAt !== undefined &&
      input.createdAt.getTime() <= input.lastReadAt.getTime())
  );
}

export function isNotificationUnread(
  input: Parameters<typeof isNotificationRead>[0]
) {
  return !isNotificationRead(input);
}

export function individuallyReadNotificationIds(keys: Iterable<string>) {
  const ids: string[] = [];

  for (const key of keys) {
    const parsed = parseNotificationReadKey(key);
    if (parsed?.kind === "notification") ids.push(parsed.notificationId);
  }

  return ids;
}

export function notificationItemReadWhere(input: {
  userId: string;
  businessId: string;
  notificationKey: string;
}) {
  return {
    userId_businessId_notificationKey: input,
  };
}

export function notificationReadStateWhere(input: {
  userId: string;
  businessId: string;
}) {
  return {
    userId_businessId: input,
  };
}

type NotificationReadTargetLookup = {
  findNotification: (id: string) => Promise<{
    businessId: string;
    userId: string | null;
  } | null>;
  findActivity: (id: string) => Promise<{
    businessId: string;
    type: string;
  } | null>;
  findRewardReadyCustomer: (input: {
    id: string;
    balance: number;
    lifetimeRedeemed: number;
  }) => Promise<{
    businessId: string;
    isActive: boolean;
  } | null>;
};

const notificationActivityTypes = new Set([
  "REWARD_REDEEMED",
  "BALANCE_ADJUSTED",
  "LOYALTY_EARNED",
]);

/**
 * Resolves a client-provided key against its authoritative business record
 * before it can be written as a per-user read state.
 */
export async function assertTenantScopedNotificationReadTarget(input: {
  notificationKey: string;
  businessId: string;
  userId: string;
  rewardThreshold: number;
  lookup: NotificationReadTargetLookup;
}) {
  const target = parseNotificationReadKey(input.notificationKey);
  if (!target) throw new Error("Invalid notification key");

  if (target.kind === "notification") {
    const notification = await input.lookup.findNotification(target.notificationId);
    if (
      !notification ||
      notification.businessId !== input.businessId ||
      (notification.userId !== null && notification.userId !== input.userId)
    ) {
      throw new Error("Notification is not available in this business");
    }
    return target;
  }

  if (target.kind === "activity") {
    const activity = await input.lookup.findActivity(target.activityId);
    if (
      !activity ||
      activity.businessId !== input.businessId ||
      !notificationActivityTypes.has(activity.type)
    ) {
      throw new Error("Notification is not available in this business");
    }
    return target;
  }

  const customer = await input.lookup.findRewardReadyCustomer({
    id: target.customerId,
    balance: target.balance,
    lifetimeRedeemed: target.lifetimeRedeemed,
  });
  if (
    !customer ||
    customer.businessId !== input.businessId ||
    !customer.isActive ||
    target.balance < input.rewardThreshold
  ) {
    throw new Error("Notification is not available in this business");
  }

  return target;
}
