import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = fs.readFileSync(
  path.join(root, "app/card/[token]/page.tsx"),
  "utf8",
);

test("public card formats dated loyalty content in the business timezone", () => {
  assert.match(source, /timeZone:\s*business\.timezone/);
  assert.doesNotMatch(source, /timeZone:\s*["']Africa\/Cairo["']/);
});
