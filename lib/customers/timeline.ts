type Actor = {
  firstName: string;
  lastName: string | null;
} | null;

type TimelineTransaction = {
  id: string;
  type: "EARN" | "REDEEM" | "ADJUSTMENT";
  amount: number;
  balanceAfter: number;
  note: string | null;
  createdAt: Date;
  createdBy: Actor;
};

type TimelineActivity = {
  id: string;
  type: string;
  description: string;
  createdAt: Date;
  createdBy: Actor;
};

export type CustomerTimelineItem = {
  id: string;
  kind: "transaction" | "lifecycle";
  title: string;
  description: string | null;
  createdAt: Date;
  actorName: string;
  amount?: number;
  balanceAfter?: number;
  transactionType?: TimelineTransaction["type"];
};

function getActorName(actor: Actor) {
  if (!actor) {
    return "النظام";
  }

  return [actor.firstName, actor.lastName]
    .filter(Boolean)
    .join(" ");
}

function getTransactionTitle(type: TimelineTransaction["type"]) {
  switch (type) {
    case "EARN":
      return "تمت إضافة رصيد ولاء";
    case "REDEEM":
      return "تم استبدال مكافأة";
    case "ADJUSTMENT":
      return "تم تعديل الرصيد يدويًا";
  }
}

function getLifecycleTitle(type: string) {
  switch (type) {
    case "CUSTOMER_CREATED":
      return "انضم العميل";
    case "CUSTOMER_UPDATED":
      return "تم تحديث بيانات العميل";
    case "CUSTOMER_DEACTIVATED":
      return "تم إيقاف حساب العميل";
    case "CUSTOMER_REACTIVATED":
      return "تمت إعادة تفعيل حساب العميل";
    case "CUSTOMER_TAG_ASSIGNED":
      return "تمت إضافة وسم العميل";
    case "CUSTOMER_TAG_REMOVED":
      return "تمت إزالة وسم العميل";
    case "CUSTOMER_NOTE_CREATED":
      return "تمت إضافة ملاحظة داخلية";
    case "CUSTOMER_NOTE_UPDATED":
      return "تم تعديل ملاحظة داخلية";
    case "REFERRAL_RECORDED":
      return "تم تسجيل إحالة العميل";
    default:
      return "تحديث العميل";
  }
}

// Transaction entries already carry the balance and audit note, so lifecycle
// activities are the only activity rows added here. This avoids duplicating a
// single earn/redemption/adjustment operation in the customer timeline.
export function buildCustomerTimeline(
  transactions: readonly TimelineTransaction[],
  activities: readonly TimelineActivity[]
): CustomerTimelineItem[] {
  const transactionItems = transactions.map((transaction) => ({
    id: `transaction:${transaction.id}`,
    kind: "transaction" as const,
    title: getTransactionTitle(transaction.type),
    description: transaction.note,
    createdAt: transaction.createdAt,
    actorName: getActorName(transaction.createdBy),
    amount: transaction.amount,
    balanceAfter: transaction.balanceAfter,
    transactionType: transaction.type,
  }));

  const lifecycleItems = activities.map((activity) => ({
    id: `activity:${activity.id}`,
    kind: "lifecycle" as const,
    title: getLifecycleTitle(activity.type),
    description: activity.description,
    createdAt: activity.createdAt,
    actorName: getActorName(activity.createdBy),
  }));

  return [...transactionItems, ...lifecycleItems].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
  );
}
