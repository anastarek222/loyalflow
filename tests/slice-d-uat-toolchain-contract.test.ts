import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
) as { packageManager?: string };
const workflow = readFileSync(
  join(root, ".github/workflows/slice-d-exact-sha-uat.yml"),
  "utf8",
);

test("Slice D exact-SHA runtime UAT uses the canonical pnpm authority", () => {
  assert.equal(packageJson.packageManager, "pnpm@11.17.0");
  assert.match(
    workflow,
    /uses: pnpm\/action-setup@v4[\s\S]*?version: 11\.17\.0/,
  );
  assert.doesNotMatch(
    workflow,
    /uses: pnpm\/action-setup@v4[\s\S]{0,120}?version: 10(?:\s|$)/,
  );
});
