import assert from "node:assert/strict";
import test from "node:test";

import {
  getActivityDescription,
  localizeStoredActivityDescription,
} from "../lib/activity/presentation";

const currentArabicDescriptions: ReadonlyArray<readonly [string, string]> = [
  ["تم إنشاء العميل أحمد علي", "Created customer أحمد علي"],
  ["انضم العميل سارة محمد عبر التسجيل الذاتي", "Customer سارة محمد joined via self-registration"],
  ["تم تحديث بيانات العميل أحمد علي", "Updated customer information for أحمد علي"],
  ["تم إعادة تفعيل حساب العميل", "Reactivated customer account"],
  ["تم إيقاف حساب العميل", "Deactivated customer account"],
  ["تمت إعادة تفعيل العميل عبر عملية جماعية", "Reactivated customer via bulk operation"],
  ["تم إيقاف العميل عبر عملية جماعية", "Deactivated customer via bulk operation"],
  ["تمت إضافة وسم العميل: VIP", "Added customer tag: VIP"],
  ["تمت إزالة وسم العميل: VIP", "Removed customer tag: VIP"],
  ["تمت إضافة وسم العميل عبر عملية جماعية: VIP", "Added customer tag via bulk operation: VIP"],
  ["تمت إزالة وسم العميل عبر عملية جماعية: VIP", "Removed customer tag via bulk operation: VIP"],
  ["تمت إضافة ملاحظة للعميل", "Added a customer note"],
  ["تم تعديل ملاحظة العميل", "Updated the customer note"],
  ["تم تسجيل إحالة عميل جديد", "Recorded a new customer referral"],
  ["تم فتح خصم 10% حتى 2026-09-01T00:00:00.000Z", "Unlocked خصم 10% until 2026-09-01T00:00:00.000Z"],
  ["انتهت صلاحية خصم 10%", "Reward خصم 10% expired"],
  ["تم رفض استبدال خصم 10% لانتهاء الصلاحية", "Blocked redemption of خصم 10% because it expired"],
  ["تم إنشاء المكافأة قهوة مجانية", "Created reward قهوة مجانية"],
  ["تم تحديث المكافأة قهوة مجانية", "Updated reward قهوة مجانية"],
  ["تم تفعيل المكافأة قهوة مجانية", "Activated reward قهوة مجانية"],
  ["تم إيقاف المكافأة قهوة مجانية", "Deactivated reward قهوة مجانية"],
  ["تم إنشاء العرض عرض الصيف", "Created offer عرض الصيف"],
  ["تم تحديث العرض عرض الصيف", "Updated offer عرض الصيف"],
  ["تم تفعيل العرض عرض الصيف", "Activated offer عرض الصيف"],
  ["تم إيقاف العرض عرض الصيف", "Deactivated offer عرض الصيف"],
  ["تم تحديث الملف التعريفي للنشاط", "Updated business profile"],
  ["تم تحديث قواعد برنامج الولاء", "Updated loyalty program rules"],
  ["تم تحديث قوالب رسائل العملاء", "Updated customer message templates"],
  ["تم تحديث إعدادات التشغيل", "Updated operating settings"],
  ["تم تحديث تصميم بطاقة الولاء", "Updated loyalty card design"],
  ["تم نشر نسخة جديدة من تصميم بطاقة الولاء (version-123)", "Published a new loyalty card design version (version-123)"],
  ["تم تحديث بيانات التواصل وشروط الكارت الرقمي", "Updated digital card contact details and terms"],
  ["تم السماح لمالك النشاط بتصدير البيانات", "Enabled data export for the business owner"],
  ["تم إيقاف صلاحية تصدير البيانات عن مالك النشاط", "Disabled data export for the business owner"],
];

test("localizes verified current Arabic audit descriptions for English sessions", () => {
  for (const [stored, expected] of currentArabicDescriptions) {
    assert.equal(localizeStoredActivityDescription(stored, "EN"), expected);
  }
});

test("keeps reverse legacy localization available for Arabic sessions", () => {
  assert.equal(
    localizeStoredActivityDescription("Created customer Ahmed Ali", "AR"),
    "تم إنشاء العميل Ahmed Ali",
  );
  assert.equal(
    localizeStoredActivityDescription("Activated reward Free coffee", "AR"),
    "تم تفعيل المكافأة Free coffee",
  );
  assert.equal(
    localizeStoredActivityDescription("Updated business profile", "AR"),
    "تم تحديث الملف التعريفي للنشاط",
  );
});

test("preserves unknown stored descriptions", () => {
  const unknown = "CUSTOM_ACTIVITY payload=unchanged";
  assert.equal(localizeStoredActivityDescription(unknown, "EN"), unknown);
  assert.equal(localizeStoredActivityDescription(unknown, "AR"), unknown);
});

test("getActivityDescription localizes unstructured and structured fallbacks", () => {
  assert.equal(
    getActivityDescription(
      {
        type: "CUSTOMER_NOTE_CREATED",
        description: "تمت إضافة ملاحظة للعميل",
      },
      "EN",
    ),
    "Added a customer note",
  );

  assert.equal(
    getActivityDescription(
      {
        type: "BRANCH_UPDATED",
        description: "تم تحديث الملف التعريفي للنشاط",
        metadata: { presentationVersion: "R9_V1" },
      },
      "EN",
    ),
    "Updated business profile",
  );
});

test("structured activity presentation remains authoritative", () => {
  assert.equal(
    getActivityDescription(
      {
        type: "BRANCH_UPDATED",
        description: "legacy fallback",
        metadata: {
          presentationVersion: "R9_V1",
          presentationKind: "BRANCH_AUDIT",
          operation: "UPDATE",
          branchName: "Downtown",
        },
      },
      "EN",
    ),
    "Updated branch Downtown",
  );
});
