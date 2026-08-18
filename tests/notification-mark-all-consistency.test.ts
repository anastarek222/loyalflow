import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/business-notifications-dialog-client.tsx"),
  "utf8",
);

test("mark-all keeps the displayed unread count canonical until the refreshed server state arrives", () => {
  assert.match(source, /const visibleUnreadCount = unreadCount;/);
  assert.doesNotMatch(source, /useOptimistic/);
  assert.doesNotMatch(source, /setVisibleUnreadCount\(/);
  assert.match(source, /await markBusinessNotificationsReadAction\(slug\);[\s\S]*router\.refresh\(\);/);
});
