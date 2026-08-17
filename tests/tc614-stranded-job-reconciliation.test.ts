import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { BETA_RECONCILIATION_BATCH_LIMIT } from "@/lib/server/integrations/reconciliation";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("TC6.14 keeps reconciliation bounded and durability-first", () => {
  assert.equal(BETA_RECONCILIATION_BATCH_LIMIT, 25);

  const reconciliation = source("lib/server/integrations/reconciliation.ts");
  assert.match(reconciliation, /status: \{ in: \["PENDING", "FAILED"\] \}/);
  assert.match(reconciliation, /status: "PROCESSING"/);
  assert.match(reconciliation, /leaseExpiresAt: \{ lte: input\.now \}/);
  assert.match(reconciliation, /availableAt: \{ lte: input\.now \}/);
  assert.match(reconciliation, /take: limit/);
  assert.match(reconciliation, /select: \{ id: true \}/);
});

test("TC6.14 only wakes the existing job-id transport and never owns provider execution", () => {
  const reconciliation = source("lib/server/integrations/reconciliation.ts");

  assert.match(reconciliation, /publisher\(\{ jobId: job\.id \}\)/);
  assert.doesNotMatch(reconciliation, /syncBusinessToGoogleSheetSafely/);
  assert.doesNotMatch(reconciliation, /claimIntegrationJob/);
  assert.doesNotMatch(reconciliation, /process\.env/);
  assert.doesNotMatch(reconciliation, /businessId|customerId|userId/);
});

test("TC6.14 leaves invocation scheduling outside the reconciliation core", () => {
  const reconciliation = source("lib/server/integrations/reconciliation.ts");
  assert.doesNotMatch(reconciliation, /cron|schedule|setInterval|setTimeout/i);
  assert.match(reconciliation, /failedJobIds/);
});
