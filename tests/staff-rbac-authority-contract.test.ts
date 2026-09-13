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

test("staff management remains owner/super-admin server-side authority", () => {
  assert.match(permissionsSource, /OWNER:\s*capabilities/);
  assert.doesNotMatch(permissionsSource, /MANAGER:\s*\[[^\]]*STAFF_MANAGE/s);
  assert.doesNotMatch(permissionsSource, /STAFF:\s*\[[^\]]*STAFF_MANAGE/s);
  assert.doesNotMatch(permissionsSource, /VIEWER:\s*\[[^\]]*STAFF_MANAGE/s);

  assert.match(
    actionsSource,
    /canPerform\(session\.user,\s*business\.id,\s*"STAFF_MANAGE"\)/,
  );
  assert.match(
    actionsSource,
    /where:\s*\{\s*id:\s*userId,\s*businessId,\s*\}/,
  );
  assert.match(
    actionsSource,
    /!isSuperAdmin\s*&&\s*targetUser\.role\s*===\s*"OWNER"/,
  );
  assert.match(
    actionsSource,
    /targetUser\.id\s*===\s*session\.user\.id/,
  );
});
