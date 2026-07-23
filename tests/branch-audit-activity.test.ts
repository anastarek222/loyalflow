import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBranchAuditActivity,
  branchActivityTypeValues,
} from "@/lib/activity/business-activity";
import {
  activityLabels,
  activityTypes,
  getActivityBadgeClass,
  getActivityMetadataString,
} from "@/lib/activity/presentation";
import { getBranchAssignmentEligibility } from "@/lib/branches/management";
import { parseActivityRequestContext } from "@/lib/activity/request-context";

const actor = {
  actorId: "actor-a",
  actorBusinessId: "business-a",
  actorEmail: "owner@example.test",
};

const branch = { id: "branch-a", name: "Downtown" };

function trustedRequestContext() {
  return parseActivityRequestContext({
    get(name: string) {
      return {
        "x-vercel-forwarded-for": "198.51.100.25",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/140.0.0.0 Safari/537.36",
      }[name] ?? null;
    },
  });
}

test("branch create, update, and status changes build durable canonical audit records", () => {
  const context = trustedRequestContext();
  const operations = [
    ["CREATE", "BRANCH_CREATED"],
    ["UPDATE", "BRANCH_UPDATED"],
    ["ACTIVATE", "BRANCH_ACTIVATED"],
    ["DEACTIVATE", "BRANCH_DEACTIVATED"],
  ] as const;

  for (const [operation, type] of operations) {
    const activity = buildBranchAuditActivity({
      operation,
      businessId: "business-a",
      ...actor,
      branch,
      activityContext: context,
    });
    assert.equal(activity.type, type);
    assert.equal(activity.businessId, "business-a");
    assert.equal(activity.branchId, branch.id);
    assert.equal(activity.createdById, actor.actorId);
    assert.equal(activity.ipAddress, "198.51.100.25");
    assert.equal(activity.deviceName, "Mac · Chrome");
  }
});

test("branch assignment and removal audit the canonical actor, branch, and assigned staff", () => {
  for (const operation of ["ASSIGN_STAFF", "REMOVE_STAFF"] as const) {
    const activity = buildBranchAuditActivity({
      operation,
      businessId: "business-a",
      ...actor,
      branch,
      assignedUser: { id: "staff-a", email: "staff@example.test" },
      activityContext: trustedRequestContext(),
    });
    assert.equal(activity.createdById, actor.actorId);
    assert.equal(activity.branchId, branch.id);
    assert.deepEqual(activity.metadata, {
      assignedUserId: "staff-a",
      assignedUserEmail: "staff@example.test",
    });
  }
});

test("cross-tenant branch assignment rejection occurs before any success audit payload is built", () => {
  const eligibility = getBranchAssignmentEligibility({
    businessId: "business-a",
    branch: { businessId: "business-b", isActive: true },
    user: { businessId: "business-a", isActive: true, role: "STAFF" },
  });
  assert.equal(eligibility, "CROSS_TENANT_BRANCH");
  assert.notEqual(eligibility, "ELIGIBLE");
});

test("global administrators retain their server-authenticated identity without breaking tenant actor relations", () => {
  const activity = buildBranchAuditActivity({
    operation: "CREATE",
    businessId: "business-a",
    actorId: "super-admin-a",
    actorBusinessId: null,
    actorEmail: "admin@example.test",
    branch,
    activityContext: trustedRequestContext(),
  });
  assert.equal(activity.createdById, undefined);
  assert.deepEqual(activity.metadata, {
    actorId: "super-admin-a",
    actorEmail: "admin@example.test",
  });
  assert.equal(getActivityMetadataString(activity.metadata, "actorEmail"), "admin@example.test");
});

test("new activity types have safe UI labels and badge mappings", () => {
  for (const type of branchActivityTypeValues) {
    assert.ok(activityTypes.includes(type));
    assert.ok(activityLabels[type].length > 0);
    assert.match(getActivityBadgeClass(type), /^bg-/);
  }
});
