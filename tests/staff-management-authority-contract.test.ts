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

test("staff management actions keep authenticated capability and tenant authority", () => {
  assert.match(actionsSource, /const session = await auth\(\)/);
  assert.match(
    actionsSource,
    /canPerform\(session\.user,\s*business\.id,\s*"STAFF_MANAGE"\)/,
  );
  assert.match(
    actionsSource,
    /async function getTargetUser[\s\S]*?where:\s*\{\s*id:\s*userId,\s*businessId,\s*\}/,
  );
  assert.match(
    actionsSource,
    /!isSuperAdmin\s*&&\s*targetUser\.role\s*===\s*"OWNER"/,
  );
});

test("non-owner business roles do not receive STAFF_MANAGE", () => {
  assert.match(permissionsSource, /OWNER:\s*capabilities/);

  for (const role of ["MANAGER", "STAFF", "VIEWER"] as const) {
    const match = permissionsSource.match(
      new RegExp(`${role}:\\s*\\[([\\s\\S]*?)\\],`),
    );
    assert.ok(match, `${role} capability list must remain explicit`);
    assert.doesNotMatch(match[1], /"STAFF_MANAGE"/);
  }
});
