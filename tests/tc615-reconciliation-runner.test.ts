import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("TC6.15 keeps the reconciliation runner internal and policy-thin", () => {
  const runner = source("lib/server/integrations/reconciliation-runner.ts");

  assert.match(runner, /import prisma from "@\/lib\/prisma"/);
  assert.match(runner, /reconcileStrandedIntegrationJobs\(prisma,/);
  assert.match(runner, /now: input\.now \?\? new Date\(\)/);
  assert.match(runner, /input\.limit === undefined/);
});

test("TC6.15 does not introduce scheduling, routes, auth, provider, or env wiring", () => {
  const runner = source("lib/server/integrations/reconciliation-runner.ts");

  assert.doesNotMatch(runner, /cron|schedule|setInterval|setTimeout/i);
  assert.doesNotMatch(runner, /NextRequest|NextResponse|route\(/);
  assert.doesNotMatch(
    runner,
    /from\s+["'][^"']*(?:auth|session|permission|role)[^"']*["']/i,
  );
  assert.doesNotMatch(runner, /syncBusinessToGoogleSheetSafely/);
  assert.doesNotMatch(runner, /process\.env/);
});
