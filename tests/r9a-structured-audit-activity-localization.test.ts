import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildBranchAuditActivity,
  buildUserAuditActivity,
  STRUCTURED_ACTIVITY_PRESENTATION_VERSION,
} from "@/lib/activity/business-activity";
import { getActivityDescription } from "@/lib/activity/presentation";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const hasArabic = (value: string) => /[\u0600-\u06FF]/.test(value);

const actor = {
  id: "actor-1",
  businessId: "business-1",
  email: "owner@example.com",
};

const activityContext = {
  deviceName: "Mac · Safari",
  ipAddress: "203.0.113.1",
};

test("R9A branch new writes persist neutral searchable prose and structured presentation metadata", () => {
  const activity = buildBranchAuditActivity({
    operation: "ASSIGN_STAFF",
    businessId: "business-1",
    actorId: actor.id,
    actorBusinessId: actor.businessId,
    actorEmail: actor.email,
    branch: { id: "branch-1", name: "Zurich" },
    assignedUser: { id: "user-1", email: "staff@example.com" },
    activityContext,
  });

  assert.equal(hasArabic(activity.description), false);
  assert.match(activity.description, /BRANCH_STAFF_ASSIGNED/);
  assert.match(activity.description, /branchName=Zurich/);
  assert.match(activity.description, /assignedUserEmail=staff@example\.com/);
  assert.deepEqual(activity.metadata, {
    presentationVersion: STRUCTURED_ACTIVITY_PRESENTATION_VERSION,
    presentationKind: "BRANCH_AUDIT",
    operation: "ASSIGN_STAFF",
    branchName: "Zurich",
    assignedUserId: "user-1",
    assignedUserEmail: "staff@example.com",
  });
  assert.equal(
    getActivityDescription(activity, "AR"),
    "تم إسناد موظف إلى الفرع Zurich للموظف staff@example.com",
  );
  assert.equal(
    getActivityDescription(activity, "EN"),
    "Assigned staff to branch Zurich for staff@example.com",
  );
});

test("R9A team new writes render the same structured record by active locale", () => {
  const activity = buildUserAuditActivity({
    operation: "CREATE",
    businessId: "business-1",
    actor,
    targetUser: {
      id: "user-2",
      email: "manager@example.com",
      role: "MANAGER",
    },
    activityContext,
  });

  assert.equal(hasArabic(activity.description), false);
  assert.match(activity.description, /USER_CREATED/);
  assert.match(activity.description, /targetUserEmail=manager@example\.com/);
  assert.equal(
    getActivityDescription(activity, "AR"),
    "تم إنشاء حساب مدير للبريد manager@example.com",
  );
  assert.equal(
    getActivityDescription(activity, "EN"),
    "Created Manager account for manager@example.com",
  );
});

test("R9A covers status, password, and experience-access team audit operations", () => {
  const cases = [
    ["ACTIVATE", "تم إعادة تفعيل الحساب staff@example.com", "Reactivated account staff@example.com"],
    ["DEACTIVATE", "تم إيقاف الحساب staff@example.com", "Deactivated account staff@example.com"],
    ["PASSWORD_CHANGE", "تم تغيير كلمة المرور للحساب staff@example.com", "Changed password for staff@example.com"],
    ["EXPERIENCE_ACCESS_UPDATE", "تم تحديث وصول الواجهة للحساب staff@example.com", "Updated experience access for staff@example.com"],
  ] as const;

  for (const [operation, ar, en] of cases) {
    const activity = buildUserAuditActivity({
      operation,
      businessId: "business-1",
      actor,
      targetUser: { id: "user-3", email: "staff@example.com", role: "STAFF" },
      activityContext,
      ...(operation === "EXPERIENCE_ACCESS_UPDATE"
        ? {
            previousExperienceAccess: "SIMPLE_ONLY" as const,
            nextExperienceAccess: "ADVANCED_ONLY" as const,
          }
        : {}),
    });
    assert.equal(hasArabic(activity.description), false);
    assert.equal(getActivityDescription(activity, "AR"), ar);
    assert.equal(getActivityDescription(activity, "EN"), en);
  }
});

test("R9A leaves legacy persisted descriptions untouched when structured metadata is absent", () => {
  const legacy = {
    type: "USER_CREATED" as const,
    description: "تم إنشاء حساب قديم",
    metadata: null,
  };
  assert.equal(getActivityDescription(legacy, "AR"), legacy.description);
  assert.equal(getActivityDescription(legacy, "EN"), legacy.description);
});

test("R9A routes Branch and Team new-write paths through structured builders", () => {
  const branchBuilder = source("lib/activity/business-activity.ts");
  const provisioning = source("lib/server/business/team-provisioning-command.ts");
  const experience = source("lib/server/business/team-experience-access-command.ts");
  const teamActions = source("app/businesses/[slug]/users/actions.ts");
  const activityPage = source("app/businesses/[slug]/activity/page.tsx");
  const overview = source("app/businesses/[slug]/page.tsx");

  assert.match(branchBuilder, /presentationKind: "BRANCH_AUDIT"/);
  assert.match(branchBuilder, /presentationKind: "USER_AUDIT"/);
  assert.match(provisioning, /data: buildUserAuditActivity\(\{/);
  assert.match(experience, /data: buildUserAuditActivity\(\{/);
  assert.equal((teamActions.match(/data: buildUserAuditActivity\(\{/g) ?? []).length, 2);
  assert.doesNotMatch(teamActions, /description:\s*parsedStatus\.data/);
  assert.doesNotMatch(teamActions, /تم تغيير كلمة المرور للحساب/);
  assert.match(activityPage, /getActivityDescription\(activity, language\)/);
  assert.match(overview, /metadata: true/);
  assert.ok((overview.match(/getActivityDescription\(activity, language\)/g) ?? []).length >= 2);
  assert.ok((overview.match(/getActivityLabel\(activity\.type, language\)/g) ?? []).length >= 2);
});
