import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const source = fs.readFileSync(
  path.join(process.cwd(), "tests/browser/pre-final-admin-security.spec.ts"),
  "utf8",
);

test("pre-final browser matrix covers administration, customer, notifications, session security, and custom card surfaces", () => {
  for (const marker of [
    "/settings",
    "/program",
    "/branches",
    "/users",
    "/customers/${fixture.activeCustomer.id}",
    "?notifications=1",
    "/account/security",
    "Log out everywhere",
    "Front artwork",
    "Back artwork",
    "Upload new draft version",
    'data-testid=\\"loyalty-card-flip\\"',
  ]) {
    assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("pre-final browser matrix preserves disposable fixture lifecycle and unexpected-error gate", () => {
  assert.match(source, /prepareBrowserUat/);
  assert.match(source, /cleanupBrowserUat/);
  assert.match(source, /pageerror/);
  assert.match(source, /message\.type\(\) === "error"/);
  assert.match(source, /preFinalErrors/);
});
