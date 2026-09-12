import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = fs.readFileSync(
  path.join(
    root,
    "components/customer-experience/public-card-actions.tsx",
  ),
  "utf8",
);

test("public card refreshes visible state after staff-side loyalty changes", () => {
  assert.match(source, /useRouter\(\)/);
  assert.match(source, /PUBLIC_CARD_REFRESH_INTERVAL_MS\s*=\s*20_000/);
  assert.match(source, /document\.visibilityState === "visible"/);
  assert.match(source, /router\.refresh\(\)/);
  assert.match(source, /window\.addEventListener\("focus", refreshIfVisible\)/);
  assert.match(
    source,
    /document\.addEventListener\("visibilitychange", refreshIfVisible\)/,
  );
  assert.match(source, /window\.setInterval\([\s\S]*refreshIfVisible/);
  assert.match(source, /window\.clearInterval\(intervalId\)/);
});
