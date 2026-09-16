import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildCatalogAuditActivity } from "../lib/activity/business-activity";
import { getActivityDescription } from "../lib/activity/presentation";

const context = { deviceName: "Desk", ipAddress: "127.0.0.1" };
const actor = { id: "user-1", businessId: "business-1" };

for (const input of [
  {
    entity: "REWARD",
    operation: "CREATE",
    ar: "تم إنشاء المكافأة قهوة",
    en: "Created reward قهوة",
  },
  {
    entity: "REWARD",
    operation: "DEACTIVATE",
    ar: "تم إيقاف المكافأة قهوة",
    en: "Deactivated reward قهوة",
  },
  {
    entity: "OFFER",
    operation: "UPDATE",
    ar: "تم تحديث العرض قهوة",
    en: "Updated offer قهوة",
  },
  {
    entity: "OFFER",
    operation: "ACTIVATE",
    ar: "تم تفعيل العرض قهوة",
    en: "Activated offer قهوة",
  },
] as const) {
  test(`A4 presents ${input.entity} ${input.operation} as explicit business activity`, () => {
    const activity = buildCatalogAuditActivity({
      entity: input.entity,
      operation: input.operation,
      businessId: "business-1",
      actor,
      item: { id: "item-1", name: "قهوة" },
      activityContext: context,
    });

    assert.equal(getActivityDescription(activity, "AR"), input.ar);
    assert.equal(getActivityDescription(activity, "EN"), input.en);
    assert.equal(activity.metadata.presentationKind, "CATALOG_AUDIT");
    assert.equal(activity.metadata.itemId, "item-1");
  });
}

test("A4 Reward and Offer writes persist Business Activity only", () => {
  for (const path of [
    "lib/server/business/reward-write-command.ts",
    "lib/server/business/offer-write-command.ts",
  ]) {
    const command = readFileSync(
      new URL(`../${path}`, import.meta.url),
      "utf8",
    );
    assert.match(command, /transaction\.businessActivity\.create/);
    assert.match(command, /buildCatalogAuditActivity/);
    assert.doesNotMatch(
      command,
      /transaction\.notification\.(create|createMany)/,
    );
    assert.doesNotMatch(command, /createBusinessNotification/);
  }
});
