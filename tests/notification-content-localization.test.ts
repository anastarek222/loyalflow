import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { getBusinessNotificationPresentation } from "@/lib/notification-presentation";

test("Stage 13 Notifications localizes verified Arabic stored content for English sessions", () => {
  assert.deepEqual(
    getBusinessNotificationPresentation(
      {
        type: "REWARD_UNLOCKED",
        title: "تم فتح مكافأة جديدة",
        message: "تم فتح Free Coffee للعميل",
      },
      "EN",
    ),
    {
      title: "New reward unlocked",
      message: "Unlocked Free Coffee for the customer",
    },
  );

  assert.deepEqual(
    getBusinessNotificationPresentation(
      {
        type: "USER_CREATED",
        title: "تم إنشاء حساب فريق جديد",
        message: "تم إنشاء حساب مدير للبريد manager@example.com",
      },
      "EN",
    ),
    {
      title: "New team account created",
      message: "Created team account (Manager) for manager@example.com",
    },
  );
});

test("Stage 13 Notifications preserves Arabic and unknown stored content", () => {
  const reward = {
    type: "REWARD_UNLOCKED",
    title: "تم فتح مكافأة جديدة",
    message: "تم فتح قهوة مجانية للعميل",
  };
  assert.deepEqual(getBusinessNotificationPresentation(reward, "AR"), {
    title: reward.title,
    message: reward.message,
  });

  const unknown = {
    type: "LEGACY_EVENT",
    title: "Legacy title",
    message: "Legacy message",
  };
  assert.deepEqual(getBusinessNotificationPresentation(unknown, "EN"), {
    title: unknown.title,
    message: unknown.message,
  });
});

test("Stage 13 Notifications presentation remains aligned with current writers and UI", () => {
  const root = process.cwd();
  const loyaltyEarn = readFileSync(
    join(root, "lib/server/business/loyalty-earn-command.ts"),
    "utf8",
  );
  const teamProvisioning = readFileSync(
    join(root, "lib/server/business/team-provisioning-command.ts"),
    "utf8",
  );
  const notificationsUi = readFileSync(
    join(root, "components/business-notifications-content.tsx"),
    "utf8",
  );

  assert.match(loyaltyEarn, /type: "REWARD_UNLOCKED"/);
  assert.match(loyaltyEarn, /title: "تم فتح مكافأة جديدة"/);
  assert.match(loyaltyEarn, /message: `تم فتح \$\{reward\.name\} للعميل`/);
  assert.match(teamProvisioning, /type: "USER_CREATED"/);
  assert.match(teamProvisioning, /title: "تم إنشاء حساب فريق جديد"/);
  assert.match(
    teamProvisioning,
    /message: `تم إنشاء حساب \$\{label\} للبريد \$\{normalizedEmail\}`/,
  );
  assert.match(
    notificationsUi,
    /getBusinessNotificationPresentation\(notification, language\)/,
  );
  assert.match(notificationsUi, /\{presentation\.title\}/);
  assert.match(notificationsUi, /\{presentation\.message\}/);
});
