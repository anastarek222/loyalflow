import assert from "node:assert/strict";
import test from "node:test";

import {
  getActivityDescription,
  STRUCTURED_ACTIVITY_PRESENTATION_VERSION,
} from "@/lib/activity/presentation";

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
