import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const actionsSource = fs.readFileSync(
  path.join(root, "app/businesses/[slug]/users/actions.ts"),
  "utf8",
);
const permissionsSource = fs.readFileSync(
  path.join(root, "lib/permissions.ts"),
  "utf8",
);

const exportedTeamMutations = [
  "createBusinessUserAction",
  "updateBusinessUserExperienceAccessAction",
  "setBusinessUserStatusAction",
  "resetBusinessUserPasswordAction",
] as const;

test("team management requires tenant-scoped STAFF_MANAGE authority", () => {
  assert.match(
    actionsSource,
    /canPerform\(session\.user,\s*business\.id,\s*"STAFF_MANAGE"\)/,
  );
  assert.match(
    actionsSource,
    /where:\s*\{\s*id:\s*userId,\s*businessId,\s*\}/,
  );

  for (const actionName of exportedTeamMutations) {
    const actionStart = actionsSource.indexOf(`export async function ${actionName}`);
    assert.notEqual(actionStart, -1, `${actionName} must remain exported`);

    const nextExport = actionsSource.indexOf("export async function", actionStart + 1);
    const actionBody = actionsSource.slice(
      actionStart,
      nextExport === -1 ? actionsSource.length : nextExport,
    );
    assert.match(
      actionBody,
      /getManagementContext\(slug\)/,
      `${actionName} must pass through management authorization`,
    );
  }
});

test("manager, staff and viewer roles cannot manage team accounts", () => {
  const managerCapabilities = permissionsSource.match(/MANAGER:\s*\[([\s\S]*?)\],/);
  const staffCapabilities = permissionsSource.match(/STAFF:\s*\[([\s\S]*?)\],/);
  const viewerCapabilities = permissionsSource.match(/VIEWER:\s*\[([\s\S]*?)\],/);

  assert.ok(managerCapabilities);
  assert.ok(staffCapabilities);
  assert.ok(viewerCapabilities);

  assert.doesNotMatch(managerCapabilities[1], /STAFF_MANAGE/);
  assert.doesNotMatch(staffCapabilities[1], /STAFF_MANAGE/);
  assert.doesNotMatch(viewerCapabilities[1], /STAFF_MANAGE/);
  assert.match(permissionsSource, /OWNER:\s*capabilities/);
});

test("owner-target protections stay enforced for destructive team operations", () => {
  assert.match(actionsSource, /targetUser\.role\s*===\s*"OWNER"/);
  assert.match(actionsSource, /targetUser\.id\s*===\s*session\.user\.id/);
  assert.match(actionsSource, /error=permission/);
});
