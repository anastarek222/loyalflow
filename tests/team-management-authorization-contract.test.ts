import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const permissionsSource = fs.readFileSync(
  path.join(root, "lib/permissions.ts"),
  "utf8",
);
const actionsSource = fs.readFileSync(
  path.join(root, "app/businesses/[slug]/users/actions.ts"),
  "utf8",
);

test("team management stays behind the tenant-scoped STAFF_MANAGE capability", () => {
  assert.match(
    actionsSource,
    /canPerform\(session\.user, business\.id, "STAFF_MANAGE"\)/,
  );
  assert.match(
    actionsSource,
    /where:\s*\{\s*id:\s*userId,\s*businessId,\s*\}/,
  );

  const managerCapabilities = permissionsSource.match(
    /MANAGER:\s*\[(.*?)\],\s*STAFF:/s,
  )?.[1];
  const staffCapabilities = permissionsSource.match(
    /STAFF:\s*\[(.*?)\],\s*VIEWER:/s,
  )?.[1];
  const viewerCapabilities = permissionsSource.match(
    /VIEWER:\s*\[(.*?)\],\s*\};/s,
  )?.[1];

  assert.ok(managerCapabilities);
  assert.ok(staffCapabilities);
  assert.ok(viewerCapabilities);
  assert.doesNotMatch(managerCapabilities, /STAFF_MANAGE/);
  assert.doesNotMatch(staffCapabilities, /STAFF_MANAGE/);
  assert.doesNotMatch(viewerCapabilities, /STAFF_MANAGE/);
});

test("every team mutation resolves the management context before mutating", () => {
  const actionNames = [
    "createBusinessUserAction",
    "updateBusinessUserExperienceAccessAction",
    "setBusinessUserStatusAction",
    "resetBusinessUserPasswordAction",
  ] as const;

  for (const [index, actionName] of actionNames.entries()) {
    const start = actionsSource.indexOf(`export async function ${actionName}`);
    assert.notEqual(start, -1, `${actionName} must exist`);

    const nextActionName = actionNames[index + 1];
    const end = nextActionName
      ? actionsSource.indexOf(`export async function ${nextActionName}`, start)
      : actionsSource.length;
    const actionSource = actionsSource.slice(start, end);

    assert.match(
      actionSource,
      /await getManagementContext\(slug\)/,
      `${actionName} must enforce the management context`,
    );
  }
});
