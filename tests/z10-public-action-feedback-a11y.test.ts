import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Z10 public card actions announce copy success and failure feedback", () => {
  const actions = source(
    "components/customer-experience/public-card-actions.tsx",
  );

  assert.match(actions, /setNotice\(copy\.copied\)/);
  assert.match(actions, /setNotice\(copy\.shareFailed\)/);
  assert.match(actions, /\{notice \? \(/);
  assert.match(actions, /role="status"/);
  assert.match(actions, /aria-live="polite"/);
  assert.match(actions, /notice === copy\.copied[\s\S]*?"sr-only"/);
  assert.doesNotMatch(actions, /notice && notice !== copy\.copied/);
});

test("Z10 public action feedback does not change share, install, or card destinations", () => {
  const actions = source(
    "components/customer-experience/public-card-actions.tsx",
  );

  assert.match(actions, /navigator\.clipboard\.writeText\(cardUrl\)/);
  assert.match(actions, /navigator\.share/);
  assert.match(actions, /url:\s*cardUrl/);
  assert.match(actions, /beforeinstallprompt/);
  assert.match(actions, /appinstalled/);
  assert.match(actions, /installPrompt\.prompt\(\)/);
});
