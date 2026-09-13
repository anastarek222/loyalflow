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

const managementActions = [
  "createBusinessUserAction",
  "updateBusinessUserExperienceAccessAction",
  "setBusinessUserStatusAction",
  "resetBusinessUserPasswordAction",
] as const;

test("team management actions share the authoritative STAFF_MANAGE gate", () => {
  assert.match(
    actionsSource,
    /canPerform\(session\.user,\s*business\.id,\s*"STAFF_MANAGE"\)/,
  );

  for (const action of managementActions) {
    assert.match(actionsSource, new RegExp(`export async function ${action}\\(`));
  }

  const managementContextCalls = actionsSource.match(
    /await getManagementContext\(slug\)/g,
  );
  assert.equal(managementContextCalls?.length, managementActions.length);
});

test("team target lookups are tenant-scoped and owner management stays protected", () => {
  assert.match(
    actionsSource,
    /findFirst\(\{\s*where:\s*\{\s*id:\s*userId,\s*businessId,/s,
  );
  assert.match(
    actionsSource,
    /!isSuperAdmin\s*&&\s*targetUser\.role\s*===\s*"OWNER"/s,
  );
});

test("role policy does not grant STAFF_MANAGE to manager, staff, or viewer", () => {
  const managerBlock = permissionsSource.match(
    /MANAGER:\s*\[([\s\S]*?)\],\s*STAFF:/,
  )?.[1];
  const staffBlock = permissionsSource.match(
    /STAFF:\s*\[([\s\S]*?)\],\s*VIEWER:/,
  )?.[1];
  const viewerBlock = permissionsSource.match(
    /VIEWER:\s*\[([\s\S]*?)\],\s*\};/,
  )?.[1];

  assert.ok(managerBlock);
  assert.ok(staffBlock);
  assert.ok(viewerBlock);
  assert.doesNotMatch(managerBlock, /STAFF_MANAGE/);
  assert.doesNotMatch(staffBlock, /STAFF_MANAGE/);
  assert.doesNotMatch(viewerBlock, /STAFF_MANAGE/);
});
