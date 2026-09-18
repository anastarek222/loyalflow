import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("notification centre uses semantic surfaces across modal, cards, and read actions", () => {
  const dialog = source("components/business-notifications-dialog-client.tsx");
  const content = source("components/business-notifications-content.tsx");
  const readButton = source("components/notification-read-button.tsx");

  for (const file of [dialog, content, readButton]) {
    assert.doesNotMatch(file, /\bbg-white(?:\/\d+)?\b/);
    assert.doesNotMatch(file, /\btext-white(?:\/\d+)?\b/);
  }

  assert.match(dialog, /data-testid="business-notifications-dialog"/);
  assert.match(dialog, /data-testid="business-notifications-panel"/);
  assert.match(dialog, /bg-surface/);
  assert.match(dialog, /bg-canvas/);
  assert.match(dialog, /text-primary-foreground/);
  assert.match(readButton, /bg-surface/);
  assert.match(content, /bg-surface/);
});

test("shared feedback and modal primitives remain theme-aware", () => {
  const feedback = source("components/ui/feedback.tsx");
  const dialog = source("components/ui/dialog.tsx");
  const badge = source("components/ui/badge.tsx");

  assert.match(feedback, /toastClassNames/);
  assert.match(feedback, /--lf-success-subtle/);
  assert.match(feedback, /--lf-danger-subtle/);
  assert.match(dialog, /bg-surface/);
  assert.match(dialog, /--lf-shadow-overlay/);
  assert.match(badge, /--lf-primary-soft/);
});
