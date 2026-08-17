import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("TC6 runtime proof trigger is staging-preview and commit gated", () => {
  const route = source("app/api/internal/beta/tc6-recovery-proof/route.ts");

  assert.match(route, /VERCEL_ENV/);
  assert.match(route, /environment === "preview"/);
  assert.match(route, /VERCEL_GIT_COMMIT_REF/);
  assert.match(route, /branch === "staging"/);
  assert.match(route, /VERCEL_GIT_COMMIT_SHA/);
  assert.match(route, /requestedCommit === commit/);
  assert.match(route, /status: 404/);
});

test("TC6 runtime proof trigger only seeds the internal recovery queue", () => {
  const route = source("app/api/internal/beta/tc6-recovery-proof/route.ts");

  assert.match(route, /INTEGRATION_RECOVERY_HEARTBEAT_TOPIC/);
  assert.match(route, /tc6-runtime-proof:/);
  assert.doesNotMatch(route, /processIntegrationJob|syncBusinessToGoogleSheetSafely/);
  assert.doesNotMatch(route, /DATABASE_URL|CRON_SECRET|GOOGLE_/);
  assert.doesNotMatch(route, /production/);
});
