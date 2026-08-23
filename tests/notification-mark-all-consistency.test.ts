import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const dialogSource = fs.readFileSync(
  path.join(process.cwd(), "components/business-notifications-dialog-client.tsx"),
  "utf8",
);
const itemButtonSource = fs.readFileSync(
  path.join(process.cwd(), "components/notification-read-button.tsx"),
  "utf8",
);
const actionSource = fs.readFileSync(
  path.join(process.cwd(), "app/businesses/[slug]/notification-actions.ts"),
  "utf8",
);

test("mark-all keeps unread state server-canonical without a nested client refresh transition", () => {
  assert.match(dialogSource, /const visibleUnreadCount = unreadCount;/);
  assert.doesNotMatch(dialogSource, /useOptimistic/);
  assert.doesNotMatch(dialogSource, /setVisibleUnreadCount\(/);
  assert.match(dialogSource, /await markBusinessNotificationsReadAction\(slug\);[\s\S]*setStatus\("success"\);/);
  assert.doesNotMatch(dialogSource, /router\.refresh\(\)/);
  assert.doesNotMatch(dialogSource, /useRouter/);
});

test("notification read actions own revalidation so item and mark-all clients do not stack refreshes", () => {
  assert.match(actionSource, /markBusinessNotificationsReadAction[\s\S]*revalidatePath\(`\/businesses\/\$\{business\.slug\}`\)/);
  assert.match(actionSource, /markBusinessNotificationItemReadAction[\s\S]*revalidatePath\(`\/businesses\/\$\{business\.slug\}`\)/);
  assert.match(itemButtonSource, /await markBusinessNotificationItemReadAction\(slug, notificationKey\);[\s\S]*setStatus\("read"\);/);
  assert.doesNotMatch(itemButtonSource, /router\.refresh\(\)/);
  assert.doesNotMatch(itemButtonSource, /useRouter/);
});
