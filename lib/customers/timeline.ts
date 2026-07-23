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

function getActorName(actor: Actor, language: AppLanguage) {
  if (!actor) {
    return language === "AR" ? "النظام" : "System";
  }

  return [actor.firstName, actor.lastName]
    .filter(Boolean)
    .join(" ");
}

function getTransactionTitle(type: TimelineTransaction["type"], language: AppLanguage) {
  if (language === "EN") {
    switch (type) {
      case "EARN": return "Loyalty balance added";
      case "REDEEM": return "Reward redeemed";
      case "ADJUSTMENT": return "Balance adjusted manually";
    }
  }
  switch (type) {
    case "EARN":
      return "تمت إضافة رصيد ولاء";
    case "REDEEM":
      return "تم استبدال مكافأة";
    case "ADJUSTMENT":
      return "تم تعديل الرصيد يدويًا";
  }
}

function getLifecycleTitle(type: string, language: AppLanguage) {
  if (language === "EN") {
    const labels: Record<string, string> = {
      CUSTOMER_CREATED: "Customer joined", CUSTOMER_UPDATED: "Customer details updated", CUSTOMER_DEACTIVATED: "Customer account deactivated", CUSTOMER_REACTIVATED: "Customer account reactivated", CUSTOMER_TAG_ASSIGNED: "Customer tag added", CUSTOMER_TAG_REMOVED: "Customer tag removed", CUSTOMER_NOTE_CREATED: "Internal note added", CUSTOMER_NOTE_UPDATED: "Internal note updated", REFERRAL_RECORDED: "Customer referral recorded",
    };
    return labels[type] ?? "Customer updated";
  }
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
  activities: readonly TimelineActivity[],
  language: AppLanguage = "AR",
): CustomerTimelineItem[] {
  const transactionItems = transactions.map((transaction) => ({
    id: `transaction:${transaction.id}`,
    kind: "transaction" as const,
    title: getTransactionTitle(transaction.type, language),
    description: transaction.note,
    createdAt: transaction.createdAt,
    actorName: getActorName(transaction.createdBy, language),
    amount: transaction.amount,
    balanceAfter: transaction.balanceAfter,
    transactionType: transaction.type,
  }));

  const lifecycleItems = activities.map((activity) => ({
    id: `activity:${activity.id}`,
    kind: "lifecycle" as const,
    title: getLifecycleTitle(activity.type, language),
    description: activity.description,
    createdAt: activity.createdAt,
    actorName: getActorName(activity.createdBy, language),
  }));

  return [...transactionItems, ...lifecycleItems].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
  );
}
import type { AppLanguage } from "@/lib/i18n";
