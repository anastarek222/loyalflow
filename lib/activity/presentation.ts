import type { ActivityType, UserRole } from "@/generated/prisma/client";
import type { AppLanguage } from "@/lib/i18n";
import { STRUCTURED_ACTIVITY_PRESENTATION_VERSION } from "@/lib/activity/business-activity";

export const activityTypes = [
  "CUSTOMER_CREATED", "CUSTOMER_UPDATED", "CUSTOMER_DEACTIVATED", "CUSTOMER_REACTIVATED", "CUSTOMER_TAG_ASSIGNED", "CUSTOMER_TAG_REMOVED", "CUSTOMER_NOTE_CREATED", "CUSTOMER_NOTE_UPDATED", "LOYALTY_EARNED", "REWARD_REDEEMED", "REWARD_UNLOCKED", "REWARD_EXPIRED", "REWARD_REDEMPTION_BLOCKED", "REFERRAL_RECORDED", "BALANCE_ADJUSTED", "BUSINESS_SETTINGS_UPDATED", "USER_CREATED", "USER_STATUS_CHANGED", "USER_PASSWORD_CHANGED", "USER_EXPERIENCE_ACCESS_UPDATED", "REWARD_CREATED", "REWARD_UPDATED", "REWARD_STATUS_CHANGED", "OFFER_CREATED", "OFFER_UPDATED", "OFFER_STATUS_CHANGED", "BRANCH_CREATED", "BRANCH_UPDATED", "BRANCH_ACTIVATED", "BRANCH_DEACTIVATED", "BRANCH_STAFF_ASSIGNED", "BRANCH_STAFF_REMOVED",
] as const satisfies readonly ActivityType[];

const activityLabelCatalog: Record<AppLanguage, Record<ActivityType, string>> = {
  AR: {
    CUSTOMER_CREATED: "إنشاء عميل", CUSTOMER_UPDATED: "تحديث بيانات عميل", CUSTOMER_DEACTIVATED: "إيقاف عميل", CUSTOMER_REACTIVATED: "إعادة تفعيل عميل", CUSTOMER_TAG_ASSIGNED: "إضافة وسم للعميل", CUSTOMER_TAG_REMOVED: "إزالة وسم من العميل", CUSTOMER_NOTE_CREATED: "إضافة ملاحظة للعميل", CUSTOMER_NOTE_UPDATED: "تحديث ملاحظة العميل", LOYALTY_EARNED: "إضافة رصيد ولاء", REWARD_REDEEMED: "استبدال مكافأة", REWARD_UNLOCKED: "فتح مكافأة", REWARD_EXPIRED: "انتهاء صلاحية مكافأة", REWARD_REDEMPTION_BLOCKED: "تعذر استبدال مكافأة", REFERRAL_RECORDED: "تسجيل إحالة", BALANCE_ADJUSTED: "تعديل رصيد", BUSINESS_SETTINGS_UPDATED: "تحديث إعدادات النشاط", USER_CREATED: "إنشاء مستخدم", USER_STATUS_CHANGED: "تغيير حالة مستخدم", USER_PASSWORD_CHANGED: "تغيير كلمة المرور", USER_EXPERIENCE_ACCESS_UPDATED: "تحديث وصول الواجهة", REWARD_CREATED: "إنشاء مكافأة", REWARD_UPDATED: "تحديث مكافأة", REWARD_STATUS_CHANGED: "تغيير حالة مكافأة", OFFER_CREATED: "إنشاء عرض", OFFER_UPDATED: "تحديث عرض", OFFER_STATUS_CHANGED: "تغيير حالة عرض", BRANCH_CREATED: "إنشاء فرع", BRANCH_UPDATED: "تحديث فرع", BRANCH_ACTIVATED: "تفعيل فرع", BRANCH_DEACTIVATED: "إيقاف فرع", BRANCH_STAFF_ASSIGNED: "إسناد موظف إلى فرع", BRANCH_STAFF_REMOVED: "إزالة إسناد موظف من فرع",
  },
  EN: {
    CUSTOMER_CREATED: "Customer created", CUSTOMER_UPDATED: "Customer updated", CUSTOMER_DEACTIVATED: "Customer deactivated", CUSTOMER_REACTIVATED: "Customer reactivated", CUSTOMER_TAG_ASSIGNED: "Customer tag added", CUSTOMER_TAG_REMOVED: "Customer tag removed", CUSTOMER_NOTE_CREATED: "Customer note added", CUSTOMER_NOTE_UPDATED: "Customer note updated", LOYALTY_EARNED: "Loyalty credit added", REWARD_REDEEMED: "Reward redeemed", REWARD_UNLOCKED: "Reward unlocked", REWARD_EXPIRED: "Reward expired", REWARD_REDEMPTION_BLOCKED: "Reward redemption blocked", REFERRAL_RECORDED: "Referral recorded", BALANCE_ADJUSTED: "Balance adjusted", BUSINESS_SETTINGS_UPDATED: "Business settings updated", USER_CREATED: "User created", USER_STATUS_CHANGED: "User status changed", USER_PASSWORD_CHANGED: "Password changed", USER_EXPERIENCE_ACCESS_UPDATED: "Experience access updated", REWARD_CREATED: "Reward created", REWARD_UPDATED: "Reward updated", REWARD_STATUS_CHANGED: "Reward status changed", OFFER_CREATED: "Offer created", OFFER_UPDATED: "Offer updated", OFFER_STATUS_CHANGED: "Offer status changed", BRANCH_CREATED: "Branch created", BRANCH_UPDATED: "Branch updated", BRANCH_ACTIVATED: "Branch activated", BRANCH_DEACTIVATED: "Branch deactivated", BRANCH_STAFF_ASSIGNED: "Staff assigned to branch", BRANCH_STAFF_REMOVED: "Staff removed from branch",
  },
};

/** Compatibility export for legacy Arabic-only callers. */
export const activityLabels: Record<ActivityType, string> = activityLabelCatalog.AR;

export function getActivityLabel(type: ActivityType, language: AppLanguage) {
  return activityLabelCatalog[language][type];
}

export function getActivityBadgeClass(type: ActivityType) {
  switch (type) {
    case "CUSTOMER_CREATED": case "CUSTOMER_REACTIVATED": case "CUSTOMER_TAG_ASSIGNED": case "CUSTOMER_NOTE_CREATED": case "LOYALTY_EARNED": case "REWARD_UNLOCKED": case "REFERRAL_RECORDED": case "BRANCH_CREATED": case "BRANCH_ACTIVATED": case "BRANCH_STAFF_ASSIGNED": case "REWARD_CREATED": case "OFFER_CREATED": return "bg-emerald-100 text-emerald-700";
    case "CUSTOMER_DEACTIVATED": case "CUSTOMER_TAG_REMOVED": case "REWARD_EXPIRED": case "REWARD_REDEMPTION_BLOCKED": case "BRANCH_DEACTIVATED": return "bg-red-100 text-red-700";
    case "CUSTOMER_UPDATED": case "CUSTOMER_NOTE_UPDATED": case "REWARD_REDEEMED": case "BALANCE_ADJUSTED": case "BRANCH_UPDATED": case "BRANCH_STAFF_REMOVED": case "REWARD_UPDATED": case "REWARD_STATUS_CHANGED": case "OFFER_UPDATED": case "OFFER_STATUS_CHANGED": return "bg-amber-100 text-amber-700";
    case "BUSINESS_SETTINGS_UPDATED": case "USER_CREATED": case "USER_STATUS_CHANGED": case "USER_PASSWORD_CHANGED": case "USER_EXPERIENCE_ACCESS_UPDATED": return "bg-violet-100 text-violet-700";
  }
}

export function getActivityMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

export function getActivityMetadataNumber(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function localizeStoredActivityDescription(
  value: string,
  language: AppLanguage,
) {
  if (language === "AR") {
    return value
      .replace(/^Created customer /, "تم إنشاء العميل ")
      .replace(/^Customer (.+) joined via self-registration$/, "انضم العميل $1 عبر التسجيل الذاتي")
      .replace(/^Updated customer information for /, "تم تحديث بيانات العميل ")
      .replace(/^Reactivated customer account$/, "تم إعادة تفعيل حساب العميل")
      .replace(/^Deactivated customer account$/, "تم إيقاف حساب العميل")
      .replace(/^Reactivated customer via bulk operation$/, "تمت إعادة تفعيل العميل عبر عملية جماعية")
      .replace(/^Deactivated customer via bulk operation$/, "تم إيقاف العميل عبر عملية جماعية")
      .replace(/^Added customer tag: (.+)$/, "تمت إضافة وسم العميل: $1")
      .replace(/^Removed customer tag: (.+)$/, "تمت إزالة وسم العميل: $1")
      .replace(/^Added customer tag via bulk operation: (.+)$/, "تمت إضافة وسم العميل عبر عملية جماعية: $1")
      .replace(/^Removed customer tag via bulk operation: (.+)$/, "تمت إزالة وسم العميل عبر عملية جماعية: $1")
      .replace(/^Added a customer note$/, "تمت إضافة ملاحظة للعميل")
      .replace(/^Updated the customer note$/, "تم تعديل ملاحظة العميل")
      .replace(/^Added (\d+) loyalty credit$/, "تمت إضافة $1 إلى رصيد الولاء")
      .replace(/^Redeemed (.+) for (\d+)$/, "تم استبدال $1 مقابل $2")
      .replace(/^Unlocked (.+) until (.+)$/, "تم فتح $1 حتى $2")
      .replace(/^Reward (.+) expired$/, "انتهت صلاحية $1")
      .replace(/^Blocked redemption of (.+) because it expired$/, "تم رفض استبدال $1 لانتهاء الصلاحية")
      .replace(/^Recorded a new customer referral$/, "تم تسجيل إحالة عميل جديد")
      .replace(/^Adjusted balance by ([+-]?\d+)\. Reason: (.+)$/, "تم تعديل الرصيد بمقدار $1. السبب: $2")
      .replace(/^Updated business settings$/, "تم تحديث إعدادات النشاط")
      .replace(/^Updated business profile$/, "تم تحديث الملف التعريفي للنشاط")
      .replace(/^Updated loyalty program rules$/, "تم تحديث قواعد برنامج الولاء")
      .replace(/^Updated customer message templates$/, "تم تحديث قوالب رسائل العملاء")
      .replace(/^Updated operating settings$/, "تم تحديث إعدادات التشغيل")
      .replace(/^Updated loyalty card design$/, "تم تحديث تصميم بطاقة الولاء")
      .replace(/^Published a new loyalty card design version \((.+)\)$/, "تم نشر نسخة جديدة من تصميم بطاقة الولاء ($1)")
      .replace(/^Updated digital card contact details and terms$/, "تم تحديث بيانات التواصل وشروط الكارت الرقمي")
      .replace(/^Enabled data export for the business owner$/, "تم السماح لمالك النشاط بتصدير البيانات")
      .replace(/^Disabled data export for the business owner$/, "تم إيقاف صلاحية تصدير البيانات عن مالك النشاط")
      .replace(/^Created owner account for (.+)$/, "تم إنشاء حساب مالك لـ $1")
      .replace(/^Created staff account for (.+)$/, "تم إنشاء حساب موظف لـ $1")
      .replace(/^Reactivated account (.+)$/, "تم إعادة تفعيل الحساب $1")
      .replace(/^Deactivated account (.+)$/, "تم إيقاف الحساب $1")
      .replace(/^Changed password for (.+)$/, "تم تغيير كلمة المرور للحساب $1")
      .replace(/^Created reward (.+)$/, "تم إنشاء المكافأة $1")
      .replace(/^Updated reward (.+)$/, "تم تحديث المكافأة $1")
      .replace(/^Activated reward (.+)$/, "تم تفعيل المكافأة $1")
      .replace(/^Deactivated reward (.+)$/, "تم إيقاف المكافأة $1")
      .replace(/^Created offer (.+)$/, "تم إنشاء العرض $1")
      .replace(/^Updated offer (.+)$/, "تم تحديث العرض $1")
      .replace(/^Activated offer (.+)$/, "تم تفعيل العرض $1")
      .replace(/^Deactivated offer (.+)$/, "تم إيقاف العرض $1");
  }

  return value
    .replace(/^تم إنشاء العميل (.+)$/, "Created customer $1")
    .replace(/^انضم العميل (.+) عبر التسجيل الذاتي$/, "Customer $1 joined via self-registration")
    .replace(/^تم تحديث بيانات العميل (.+)$/, "Updated customer information for $1")
    .replace(/^تم إعادة تفعيل حساب العميل$/, "Reactivated customer account")
    .replace(/^تم إيقاف حساب العميل$/, "Deactivated customer account")
    .replace(/^تمت إعادة تفعيل العميل عبر عملية جماعية$/, "Reactivated customer via bulk operation")
    .replace(/^تم إيقاف العميل عبر عملية جماعية$/, "Deactivated customer via bulk operation")
    .replace(/^تمت إضافة وسم العميل: (.+)$/, "Added customer tag: $1")
    .replace(/^تمت إزالة وسم العميل: (.+)$/, "Removed customer tag: $1")
    .replace(/^تمت إضافة وسم العميل عبر عملية جماعية: (.+)$/, "Added customer tag via bulk operation: $1")
    .replace(/^تمت إزالة وسم العميل عبر عملية جماعية: (.+)$/, "Removed customer tag via bulk operation: $1")
    .replace(/^تمت إضافة ملاحظة للعميل$/, "Added a customer note")
    .replace(/^تم تعديل ملاحظة العميل$/, "Updated the customer note")
    .replace(/^تم فتح (.+) حتى (.+)$/, "Unlocked $1 until $2")
    .replace(/^انتهت صلاحية (.+)$/, "Reward $1 expired")
    .replace(/^تم رفض استبدال (.+) لانتهاء الصلاحية$/, "Blocked redemption of $1 because it expired")
    .replace(/^تم تسجيل إحالة عميل جديد$/, "Recorded a new customer referral")
    .replace(/^تم تحديث الملف التعريفي للنشاط$/, "Updated business profile")
    .replace(/^تم تحديث قواعد برنامج الولاء$/, "Updated loyalty program rules")
    .replace(/^تم تحديث قوالب رسائل العملاء$/, "Updated customer message templates")
    .replace(/^تم تحديث إعدادات التشغيل$/, "Updated operating settings")
    .replace(/^تم تحديث تصميم بطاقة الولاء$/, "Updated loyalty card design")
    .replace(/^تم نشر نسخة جديدة من تصميم بطاقة الولاء \((.+)\)$/, "Published a new loyalty card design version ($1)")
    .replace(/^تم تحديث بيانات التواصل وشروط الكارت الرقمي$/, "Updated digital card contact details and terms")
    .replace(/^تم السماح لمالك النشاط بتصدير البيانات$/, "Enabled data export for the business owner")
    .replace(/^تم إيقاف صلاحية تصدير البيانات عن مالك النشاط$/, "Disabled data export for the business owner")
    .replace(/^تم إنشاء المكافأة (.+)$/, "Created reward $1")
    .replace(/^تم تحديث المكافأة (.+)$/, "Updated reward $1")
    .replace(/^تم تفعيل المكافأة (.+)$/, "Activated reward $1")
    .replace(/^تم إيقاف المكافأة (.+)$/, "Deactivated reward $1")
    .replace(/^تم إنشاء العرض (.+)$/, "Created offer $1")
    .replace(/^تم تحديث العرض (.+)$/, "Updated offer $1")
    .replace(/^تم تفعيل العرض (.+)$/, "Activated offer $1")
    .replace(/^تم إيقاف العرض (.+)$/, "Deactivated offer $1");
}

function getRoleLabel(role: string | undefined, language: AppLanguage) {
  const labels: Record<UserRole, Record<AppLanguage, string>> = {
    OWNER: { AR: "مالك", EN: "Owner" },
    MANAGER: { AR: "مدير", EN: "Manager" },
    STAFF: { AR: "موظف", EN: "Staff" },
    VIEWER: { AR: "مشاهد", EN: "Viewer" },
    SUPER_ADMIN: { AR: "مدير النظام", EN: "System administrator" },
  };
  return role && role in labels
    ? labels[role as UserRole][language]
    : language === "AR"
      ? "مستخدم"
      : "user";
}

export function getActivityDescription(
  activity: Readonly<{
    type: ActivityType;
    description: string;
    metadata?: unknown;
  }>,
  language: AppLanguage,
) {
  const fallbackDescription = localizeStoredActivityDescription(
    activity.description,
    language,
  );
  const version = getActivityMetadataString(
    activity.metadata,
    "presentationVersion",
  );
  if (version !== STRUCTURED_ACTIVITY_PRESENTATION_VERSION) {
    return fallbackDescription;
  }

  const kind = getActivityMetadataString(activity.metadata, "presentationKind");
  const operation = getActivityMetadataString(activity.metadata, "operation");

  if (kind === "BRANCH_AUDIT") {
    const branchName = getActivityMetadataString(activity.metadata, "branchName");
    if (!branchName) return fallbackDescription;
    const assignedUserEmail = getActivityMetadataString(
      activity.metadata,
      "assignedUserEmail",
    );

    if (language === "AR") {
      switch (operation) {
        case "CREATE": return `تم إنشاء الفرع ${branchName}`;
        case "UPDATE": return `تم تحديث بيانات الفرع ${branchName}`;
        case "ACTIVATE": return `تم تفعيل الفرع ${branchName}`;
        case "DEACTIVATE": return `تم إيقاف الفرع ${branchName}`;
        case "ASSIGN_STAFF": return `تم إسناد موظف إلى الفرع ${branchName}${assignedUserEmail ? ` للموظف ${assignedUserEmail}` : ""}`;
        case "REMOVE_STAFF": return `تمت إزالة إسناد موظف من الفرع ${branchName}${assignedUserEmail ? ` للموظف ${assignedUserEmail}` : ""}`;
      }
    } else {
      switch (operation) {
        case "CREATE": return `Created branch ${branchName}`;
        case "UPDATE": return `Updated branch ${branchName}`;
        case "ACTIVATE": return `Activated branch ${branchName}`;
        case "DEACTIVATE": return `Deactivated branch ${branchName}`;
        case "ASSIGN_STAFF": return `Assigned staff to branch ${branchName}${assignedUserEmail ? ` for ${assignedUserEmail}` : ""}`;
        case "REMOVE_STAFF": return `Removed staff assignment from branch ${branchName}${assignedUserEmail ? ` for ${assignedUserEmail}` : ""}`;
      }
    }
  }

  if (kind === "USER_AUDIT") {
    const targetUserEmail = getActivityMetadataString(
      activity.metadata,
      "targetUserEmail",
    );
    if (!targetUserEmail) return fallbackDescription;
    const targetUserRole = getActivityMetadataString(
      activity.metadata,
      "targetUserRole",
    );
    const roleLabel = getRoleLabel(targetUserRole, language);

    if (language === "AR") {
      switch (operation) {
        case "CREATE": return `تم إنشاء حساب ${roleLabel} للبريد ${targetUserEmail}`;
        case "ACTIVATE": return `تم إعادة تفعيل الحساب ${targetUserEmail}`;
        case "DEACTIVATE": return `تم إيقاف الحساب ${targetUserEmail}`;
        case "PASSWORD_CHANGE": return `تم تغيير كلمة المرور للحساب ${targetUserEmail}`;
        case "EXPERIENCE_ACCESS_UPDATE": return `تم تحديث وصول الواجهة للحساب ${targetUserEmail}`;
      }
    } else {
      switch (operation) {
        case "CREATE": return `Created ${roleLabel} account for ${targetUserEmail}`;
        case "ACTIVATE": return `Reactivated account ${targetUserEmail}`;
        case "DEACTIVATE": return `Deactivated account ${targetUserEmail}`;
        case "PASSWORD_CHANGE": return `Changed password for ${targetUserEmail}`;
        case "EXPERIENCE_ACCESS_UPDATE": return `Updated experience access for ${targetUserEmail}`;
      }
    }
  }

  if (kind === "FINANCIAL_ACTIVITY") {
    const financialType = getActivityMetadataString(
      activity.metadata,
      "financialType",
    );

    if (financialType === "LOYALTY_EARNED") {
      const amount = getActivityMetadataNumber(activity.metadata, "amount");
      const loyaltyMode = getActivityMetadataString(
        activity.metadata,
        "loyaltyMode",
      );
      const unitName = getActivityMetadataString(activity.metadata, "unitName");
      if (amount === undefined || !loyaltyMode || !unitName) {
        return fallbackDescription;
      }
      const saleAmount = getActivityMetadataNumber(activity.metadata, "saleAmount");
      const displayedAmount = saleAmount ?? amount;
      return loyaltyMode === "SALES_AMOUNT"
        ? language === "AR"
          ? `تم تسجيل مبلغ مبيعات ${displayedAmount} ${unitName}`
          : `Recorded sale amount ${displayedAmount} ${unitName}`
        : language === "AR"
          ? `تمت إضافة ${amount} إلى رصيد الولاء`
          : `Added ${amount} loyalty credit`;
    }

    if (financialType === "REWARD_REDEEMED") {
      const rewardName = getActivityMetadataString(activity.metadata, "rewardName");
      const cost = getActivityMetadataNumber(activity.metadata, "cost");
      if (!rewardName || cost === undefined) return fallbackDescription;
      return language === "AR"
        ? `تم استبدال ${rewardName} مقابل ${cost}`
        : `Redeemed ${rewardName} for ${cost}`;
    }

    if (financialType === "BALANCE_ADJUSTED") {
      const signedAmount = getActivityMetadataNumber(
        activity.metadata,
        "signedAmount",
      );
      const reason = getActivityMetadataString(activity.metadata, "reason");
      if (signedAmount === undefined || !reason) return fallbackDescription;
      const displayedAmount = `${signedAmount > 0 ? "+" : ""}${signedAmount}`;
      return language === "AR"
        ? `تم تعديل الرصيد بمقدار ${displayedAmount}. السبب: ${reason}`
        : `Adjusted balance by ${displayedAmount}. Reason: ${reason}`;
    }
  }

  return fallbackDescription;
}
