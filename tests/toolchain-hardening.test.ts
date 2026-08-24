import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("repository pins the same pnpm release used by staging CI", () => {
  const packageJson = JSON.parse(source("package.json")) as {
    packageManager?: string;
  };
  const workflow = source(".github/workflows/staging-pr-validation.yml");

  assert.equal(packageJson.packageManager, "pnpm@11.17.0");
  assert.match(workflow, /Set up pnpm[\s\S]*?version:\s*11\.17\.0/);
});

test("pnpm workspace overrides the audited PostCSS and Undici versions", () => {
  const workspace = source("pnpm-workspace.yaml");

  assert.match(workspace, /['"]postcss@8\.5\.22['"]:\s*8\.5\.23/);
  assert.match(workspace, /['"]undici@7\.28\.0['"]:\s*7\.29\.0/);
});

test("lockfile resolves the hardened PostCSS and Undici releases", () => {
  const lockfile = source("pnpm-lock.yaml");

  assert.doesNotMatch(lockfile, /postcss@8\.5\.22/);
  assert.doesNotMatch(lockfile, /undici@7\.28\.0/);
  assert.match(lockfile, /postcss@8\.5\.23/);
  assert.match(lockfile, /undici@7\.29\.0/);
});
