import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const rootManifest = JSON.parse(readFileSync("package.json", "utf8"));
const workspace = readFileSync("pnpm-workspace.yaml", "utf8");

test("workspace skeleton keeps the root Next application as the only runtime", () => {
  assert.equal(rootManifest.scripts.dev, "next dev");
  assert.equal(
    rootManifest.scripts.build,
    "prisma generate && next build --webpack",
  );
  assert.equal(rootManifest.scripts.start, "next start");
  assert.match(workspace, /packages:\s*\n\s*- ['"]packages\/\*['"]/);
  assert.doesNotMatch(workspace, /apps\/\*/);
});

test("workspace packages expose only approved runtime code and satisfy the import graph", () => {
  const output = execFileSync(
    process.execPath,
    ["scripts/validate-workspace-boundaries.mjs"],
    {
      encoding: "utf8",
    },
  );

  assert.match(output, /4 packages, 16 approved runtime exports, no cycles/);
});
