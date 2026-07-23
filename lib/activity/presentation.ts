import type { ActivityType } from "@/generated/prisma/client";

export const activityTypes = [
  "CUSTOMER_CREATED", "CUSTOMER_UPDATED", "CUSTOMER_DEACTIVATED", "CUSTOMER_REACTIVATED", "CUSTOMER_TAG_ASSIGNED", "CUSTOMER_TAG_REMOVED", "CUSTOMER_NOTE_CREATED", "CUSTOMER_NOTE_UPDATED", "LOYALTY_EARNED", "REWARD_REDEEMED", "REWARD_UNLOCKED", "REWARD_EXPIRED", "REWARD_REDEMPTION_BLOCKED", "REFERRAL_RECORDED", "BALANCE_ADJUSTED", "BUSINESS_SETTINGS_UPDATED", "USER_CREATED", "USER_STATUS_CHANGED", "USER_PASSWORD_CHANGED", "REWARD_CREATED", "REWARD_UPDATED", "REWARD_STATUS_CHANGED", "OFFER_CREATED", "OFFER_UPDATED", "OFFER_STATUS_CHANGED", "BRANCH_CREATED", "BRANCH_UPDATED", "BRANCH_ACTIVATED", "BRANCH_DEACTIVATED", "BRANCH_STAFF_ASSIGNED", "BRANCH_STAFF_REMOVED",
] as const satisfies readonly ActivityType[];

export const activityLabels: Record<ActivityType, string> = {
  CUSTOMER_CREATED: "إنشاء عميل", CUSTOMER_UPDATED: "تحديث بيانات عميل", CUSTOMER_DEACTIVATED: "إيقاف عميل", CUSTOMER_REACTIVATED: "إعادة تفعيل عميل", CUSTOMER_TAG_ASSIGNED: "إضافة وسم للعميل", CUSTOMER_TAG_REMOVED: "إزالة وسم من العميل", CUSTOMER_NOTE_CREATED: "إضافة ملاحظة للعميل", CUSTOMER_NOTE_UPDATED: "تحديث ملاحظة العميل", LOYALTY_EARNED: "إضافة رصيد ولاء", REWARD_REDEEMED: "استبدال مكافأة", REWARD_UNLOCKED: "فتح مكافأة", REWARD_EXPIRED: "انتهاء صلاحية مكافأة", REWARD_REDEMPTION_BLOCKED: "تعذر استبدال مكافأة", REFERRAL_RECORDED: "تسجيل إحالة", BALANCE_ADJUSTED: "تعديل رصيد", BUSINESS_SETTINGS_UPDATED: "تحديث إعدادات النشاط", USER_CREATED: "إنشاء مستخدم", USER_STATUS_CHANGED: "تغيير حالة مستخدم", USER_PASSWORD_CHANGED: "تغيير كلمة المرور", REWARD_CREATED: "إنشاء مكافأة", REWARD_UPDATED: "تحديث مكافأة", REWARD_STATUS_CHANGED: "تغيير حالة مكافأة", OFFER_CREATED: "إنشاء عرض", OFFER_UPDATED: "تحديث عرض", OFFER_STATUS_CHANGED: "تغيير حالة عرض", BRANCH_CREATED: "إنشاء فرع", BRANCH_UPDATED: "تحديث فرع", BRANCH_ACTIVATED: "تفعيل فرع", BRANCH_DEACTIVATED: "إيقاف فرع", BRANCH_STAFF_ASSIGNED: "إسناد موظف إلى فرع", BRANCH_STAFF_REMOVED: "إزالة إسناد موظف من فرع",
};

export function getActivityBadgeClass(type: ActivityType) {
  switch (type) {
    case "CUSTOMER_CREATED": case "CUSTOMER_REACTIVATED": case "CUSTOMER_TAG_ASSIGNED": case "CUSTOMER_NOTE_CREATED": case "LOYALTY_EARNED": case "REWARD_UNLOCKED": case "REFERRAL_RECORDED": case "BRANCH_CREATED": case "BRANCH_ACTIVATED": case "BRANCH_STAFF_ASSIGNED": case "REWARD_CREATED": case "OFFER_CREATED": return "bg-emerald-100 text-emerald-700";
    case "CUSTOMER_DEACTIVATED": case "CUSTOMER_TAG_REMOVED": case "REWARD_EXPIRED": case "REWARD_REDEMPTION_BLOCKED": case "BRANCH_DEACTIVATED": return "bg-red-100 text-red-700";
    case "CUSTOMER_UPDATED": case "CUSTOMER_NOTE_UPDATED": case "REWARD_REDEEMED": case "BALANCE_ADJUSTED": case "BRANCH_UPDATED": case "BRANCH_STAFF_REMOVED": case "REWARD_UPDATED": case "REWARD_STATUS_CHANGED": case "OFFER_UPDATED": case "OFFER_STATUS_CHANGED": return "bg-amber-100 text-amber-700";
    case "BUSINESS_SETTINGS_UPDATED": case "USER_CREATED": case "USER_STATUS_CHANGED": case "USER_PASSWORD_CHANGED": return "bg-violet-100 text-violet-700";
  }
}

export function getActivityMetadataString(
  metadata: unknown,
  key: string,
) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}
