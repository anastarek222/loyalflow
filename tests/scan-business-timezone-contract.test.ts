import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = fs.readFileSync(
  path.join(
    root,
    "app/businesses/[slug]/scan/customer/[customerId]/page.tsx",
  ),
  "utf8",
);

test("scan customer activity formats timestamps in the business timezone", () => {
  assert.match(source, /timezone:\s*true/);
  assert.match(source, /timeZone:\s*business\.timezone/);
});
