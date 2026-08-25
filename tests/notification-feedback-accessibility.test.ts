import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("Stage 13 notification bulk-read feedback announces success and errors", () => {
  const dialog = source("components/business-notifications-dialog-client.tsx");

  assert.match(
    dialog,
    /status === "success" && \([\s\S]*?<span role="status" className=/,
  );
  assert.match(
    dialog,
    /status === "error" && \([\s\S]*?<span role="alert" className=/,
  );
});

test("Stage 13 notification item feedback keeps button semantics while announcing results", () => {
  const button = source("components/notification-read-button.tsx");

  assert.match(
    button,
    /if \(status === "read"\)[\s\S]*?<span role="status" className=/,
  );
  assert.match(
    button,
    /role=\{status === "error" \? "alert" : undefined\}[\s\S]*?<button[\s\S]*?onClick=\{markAsRead\}/,
  );
  assert.match(button, /markBusinessNotificationItemReadAction\(slug, notificationKey\)/);
});

test("Stage 13 notification feedback semantics preserve bulk-read behavior", () => {
  const dialog = source("components/business-notifications-dialog-client.tsx");

  assert.match(dialog, /markBusinessNotificationsReadAction\(slug\)/);
  assert.match(dialog, /setStatus\("success"\)/);
  assert.match(dialog, /setStatus\("error"\)/);
});
