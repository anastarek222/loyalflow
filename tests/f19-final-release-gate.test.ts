import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function source(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("F19.6 release checkpoint requires a clean committed reproducible tree", () => {
  const verifier = source("scripts/verify-release-checkpoint.ts");

  assert.match(verifier, /runGit\(\["status", "--porcelain"\]\)/);
  assert.match(verifier, /rev-parse", "HEAD"/);
  assert.match(verifier, /pnpm-lock\.yaml/);
  assert.match(verifier, /\.env\.example/);
  assert.match(verifier, /manifest\.json/);
  assert.match(verifier, /manifest\.migrationCount !== names\.length/);
  assert.match(verifier, /migration === reviewed\[index\]/);
  assert.doesNotMatch(verifier, /migrations\.length === \d+/);
});

test("F19.6 release checkpoint detects tracked runtime env files without printing them", () => {
  const verifier = source("scripts/verify-release-checkpoint.ts");

  assert.match(verifier, /"ls-files"/);
  assert.match(verifier, /"\.env"/);
  assert.match(verifier, /"\.env\.local"/);
  assert.match(verifier, /"\.env\.production"/);
  assert.doesNotMatch(verifier, /readFileSync\([^)]*\.env/);
  assert.doesNotMatch(verifier, /DATABASE_URL|AUTH_SECRET/);
});

test("F19.6 final local gate is read-only and can include browser UAT", () => {
  const runner = source("scripts/run-final-release-gate.ts");

  assert.match(runner, /verify:release-checkpoint/);
  assert.match(runner, /release:check/);
  assert.match(runner, /test:browser-uat/);
  assert.match(runner, /--browser/);
  assert.doesNotMatch(
    runner,
    /migrate deploy|migrate dev|db push|migrate reset/,
  );
});

test("F19.6 release manifest contains only safe release identity", () => {
  const manifest = source("scripts/print-release-manifest.ts");

  assert.match(manifest, /gitSha/);
  assert.match(manifest, /migrationCount/);
  assert.match(manifest, /latestMigration/);
  assert.match(manifest, /getPublicReleaseMetadata/);
  assert.doesNotMatch(
    manifest,
    /DATABASE_URL|AUTH_SECRET|password|customerId|ipAddress/,
  );
});

test("F19.6 package exposes explicit local, browser and production read-only gates", () => {
  const packageJson = JSON.parse(source("package.json")) as {
    scripts: Record<string, string>;
  };

  assert.equal(
    packageJson.scripts["verify:release-checkpoint"],
    "tsx scripts/verify-release-checkpoint.ts",
  );
  assert.equal(
    packageJson.scripts["release:final"],
    "tsx scripts/run-final-release-gate.ts",
  );
  assert.match(
    packageJson.scripts["release:final:browser"],
    /run-final-release-gate\.ts --browser/,
  );
  assert.match(
    packageJson.scripts["release:final:production-readonly"],
    /release:production-preflight/,
  );
  assert.match(
    packageJson.scripts["release:final:production-readonly"],
    /verify:production-smoke/,
  );
  assert.match(
    packageJson.scripts["release:final:production-readonly"],
    /verify:operations/,
  );
});

test("F19.6 final gate documentation keeps production mutation explicitly separate", () => {
  const gate = source("F19_FINAL_PRODUCTION_RELEASE_GATE.md");

  assert.match(gate, /release:final:browser/);
  assert.match(gate, /release:production-preflight/);
  assert.match(gate, /verify:production-db/);
  assert.match(gate, /db:migrate:deploy/);
  assert.match(gate, /verify:production-smoke/);
  assert.match(gate, /verify:operations/);
  assert.match(gate, /Application rollback and database recovery are separate/);
});

test("F19.6 approval template captures exact release evidence without secrets", () => {
  const approval = source("F19_RELEASE_APPROVAL_TEMPLATE.md");

  assert.match(approval, /Git SHA:/);
  assert.match(approval, /release:final:browser/);
  assert.match(approval, /verify:production-db/);
  assert.match(approval, /verify:production-smoke/);
  assert.match(approval, /Scan exact-once earn\/redeem PASS/);
  assert.match(approval, /do not add secrets/i);
});

test("F19.6 production checklist points to the final gate and approval record", () => {
  const checklist = source("F19_PRODUCTION_RELEASE_CHECKLIST.md");

  assert.match(checklist, /verify:release-checkpoint/);
  assert.match(checklist, /release:final/);
