import assert from "node:assert/strict";
import test from "node:test";

import { STRUCTURED_ACTIVITY_PRESENTATION_VERSION } from "@/lib/activity/business-activity";
import { getActivityDescription } from "@/lib/activity/presentation";

type ActivityDescriptionInput = Parameters<typeof getActivityDescription>[0];
type ActivityType = ActivityDescriptionInput["type"];

test("Stage 13 Activity localizes verified Arabic legacy descriptions for English sessions", () => {
  const cases = [
    ["CUSTOMER_CREATED", "تم إنشاء العميل Ahmed", "Created customer Ahmed"],
    [
      "CUSTOMER_CREATED",
      "انضم العميل Sara عبر التسجيل الذاتي",
      "Customer Sara joined through self-registration",
    ],
    [
      "CUSTOMER_UPDATED",
      "تم تحديث بيانات العميل Ahmed",
      "Updated customer information for Ahmed",
    ],
    [
      "CUSTOMER_REACTIVATED",
      "تم إعادة تفعيل حساب العميل",
      "Reactivated customer account",
    ],
    [
      "CUSTOMER_REACTIVATED",
      "تمت إعادة تفعيل العميل عبر عملية جماعية",
      "Reactivated customer through a bulk action",
    ],
    [
      "CUSTOMER_DEACTIVATED",
      "تم إيقاف حساب العميل",
      "Deactivated customer account",
    ],
    [
      "CUSTOMER_DEACTIVATED",
      "تم إيقاف العميل عبر عملية جماعية",
      "Deactivated customer through a bulk action",
    ],
    [
      "CUSTOMER_DEACTIVATED",
      "تم تعطيل حساب العميل",
      "Deactivated customer account",
    ],
    [
      "CUSTOMER_DEACTIVATED",
      "تم تعطيل العميل عبر عملية جماعية",
      "Deactivated customer through a bulk action",
    ],
    [
      "CUSTOMER_TAG_ASSIGNED",
      "تمت إضافة وسم العميل: VIP",
      "Added customer tag: VIP",
    ],
    [
      "CUSTOMER_TAG_ASSIGNED",
      "تمت إضافة وسم العميل عبر عملية جماعية: VIP",
      "Added customer tag through a bulk action: VIP",
    ],
    [
      "CUSTOMER_TAG_REMOVED",
      "تمت إزالة وسم العميل: VIP",
      "Removed customer tag: VIP",
    ],
    [
      "CUSTOMER_TAG_REMOVED",
      "تمت إزالة وسم العميل عبر عملية جماعية: VIP",
      "Removed customer tag through a bulk action: VIP",
    ],
    [
      "CUSTOMER_NOTE_CREATED",
      "تمت إضافة ملاحظة داخلية للعميل",
      "Added an internal customer note",
    ],
    [
      "CUSTOMER_NOTE_UPDATED",
      "تم تعديل ملاحظة داخلية للعميل",
      "Updated an internal customer note",
    ],
    [
      "REFERRAL_RECORDED",
      "تم تسجيل إحالة جديدة للعميل Ahmed",
      "Recorded a new referral for customer Ahmed",
    ],
    [
      "REFERRAL_RECORDED",
      "تم تسجيل إحالة عميل جديد",
      "Recorded a new customer referral",
    ],
    [
      "REWARD_UNLOCKED",
      "تم فتح Free Coffee حتى 2026-09-01T10:00:00.000Z",
      "Unlocked Free Coffee until 2026-09-01T10:00:00.000Z",
    ],
    ["REWARD_EXPIRED", "انتهت صلاحية Free Coffee", "Expired Free Coffee"],
    [
      "REWARD_REDEMPTION_BLOCKED",
      "تم رفض استبدال Free Coffee لانتهاء الصلاحية",
      "Blocked redemption of Free Coffee because it expired",
    ],
    ["REWARD_CREATED", "تم إنشاء المكافأة Free Coffee", "Created reward Free Coffee"],
    ["REWARD_UPDATED", "تم تحديث المكافأة Free Coffee", "Updated reward Free Coffee"],
    [
      "REWARD_STATUS_CHANGED",
      "تم تفعيل المكافأة Free Coffee",
      "Activated reward Free Coffee",
    ],
    [
      "REWARD_STATUS_CHANGED",
      "تم إيقاف المكافأة Free Coffee",
      "Deactivated reward Free Coffee",
    ],
    ["OFFER_CREATED", "تم إنشاء العرض Summer Deal", "Created offer Summer Deal"],
    ["OFFER_UPDATED", "تم تحديث العرض Summer Deal", "Updated offer Summer Deal"],
    ["OFFER_STATUS_CHANGED", "تم تفعيل العرض Summer Deal", "Activated offer Summer Deal"],
    ["OFFER_STATUS_CHANGED", "تم إيقاف العرض Summer Deal", "Deactivated offer Summer Deal"],
    [
      "BUSINESS_SETTINGS_UPDATED",
      "تم تحديث إعدادات النشاط",
      "Updated business settings",
    ],
    [
      "BUSINESS_SETTINGS_UPDATED",
      "تم تحديث الملف التعريفي للنشاط",
      "Updated business profile",
    ],
    [
      "BUSINESS_SETTINGS_UPDATED",
      "تم تحديث قواعد برنامج الولاء",
      "Updated loyalty program rules",
    ],
    [
      "BUSINESS_SETTINGS_UPDATED",
      "تم تحديث قوالب رسائل العملاء",
      "Updated customer message templates",
    ],
    [
      "BUSINESS_SETTINGS_UPDATED",
      "تم تحديث إعدادات التشغيل",
      "Updated operations settings",
    ],
    [
      "BUSINESS_SETTINGS_UPDATED",
      "تم تحديث تصميم بطاقة الولاء",
      "Updated loyalty card design",
    ],
    [
      "BUSINESS_SETTINGS_UPDATED",
      "تم تحديث بيانات التواصل وشروط الكارت الرقمي",
      "Updated digital card contact details and terms",
    ],
    [
      "BUSINESS_SETTINGS_UPDATED",
      "تم السماح لمالك النشاط بتصدير البيانات",
      "Allowed the business owner to export data",
    ],
    [
      "BUSINESS_SETTINGS_UPDATED",
      "تم إيقاف صلاحية تصدير البيانات عن مالك النشاط",
      "Revoked the business owner's data export permission",
    ],
    [
      "BUSINESS_SETTINGS_UPDATED",
      "تم نشر نسخة جديدة من تصميم بطاقة الولاء (v-123)",
      "Published a new loyalty card design version (v-123)",
    ],
  ] as const satisfies readonly (readonly [ActivityType, string, string])[];

  for (const [type, description, expected] of cases) {
    assert.equal(getActivityDescription({ type, description }, "EN"), expected);
  }
});

test("Stage 13 Activity preserves Arabic and unknown legacy descriptions", () => {
  assert.equal(
    getActivityDescription(
      { type: "CUSTOMER_NOTE_CREATED", description: "تمت إضافة ملاحظة داخلية للعميل" },
      "AR",
    ),
    "تمت إضافة ملاحظة داخلية للعميل",
  );
  assert.equal(
    getActivityDescription(
      { type: "CUSTOMER_UPDATED", description: "Legacy description from an unknown writer" },
      "EN",
    ),
    "Legacy description from an unknown writer",
  );
});

test("Stage 13 Activity leaves structured presentation authority unchanged", () => {
  assert.equal(
    getActivityDescription(
      {
        type: "BRANCH_CREATED",
        description: "legacy fallback",
        metadata: {
          presentationVersion: STRUCTURED_ACTIVITY_PRESENTATION_VERSION,
          presentationKind: "BRANCH_AUDIT",
          operation: "CREATE",
          branchName: "Downtown",
        },
      },
      "EN",
    ),
    "Created branch Downtown",
  );
});
