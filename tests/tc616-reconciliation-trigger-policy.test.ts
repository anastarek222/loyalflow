import assert from "node:assert/strict";
import test from "node:test";

import {
  BETA_RECONCILIATION_TRIGGER_INTERVAL_MS,
  BETA_RECONCILIATION_TRIGGER_LIMIT,
  shouldStartBetaReconciliation,
} from "@/lib/server/integrations/reconciliation-trigger-policy";

test("TC6.16 keeps the beta trigger cadence and batch bounded", () => {
  assert.equal(BETA_RECONCILIATION_TRIGGER_INTERVAL_MS, 5 * 60 * 1000);
  assert.equal(BETA_RECONCILIATION_TRIGGER_LIMIT, 25);
});

test("TC6.16 allows first run and blocks runs inside the beta cadence", () => {
  const now = new Date("2026-08-17T12:00:00.000Z");
  assert.equal(shouldStartBetaReconciliation({ now, lastStartedAt: null }), true);
  assert.equal(
    shouldStartBetaReconciliation({
      now,
      lastStartedAt: new Date(now.getTime() - BETA_RECONCILIATION_TRIGGER_INTERVAL_MS + 1),
    }),
    false,
  );
  assert.equal(
    shouldStartBetaReconciliation({
      now,
      lastStartedAt: new Date(now.getTime() - BETA_RECONCILIATION_TRIGGER_INTERVAL_MS),
    }),
    true,
  );
});

test("TC6.16 rejects invalid temporal inputs", () => {
  const now = new Date("2026-08-17T12:00:00.000Z");
  assert.throws(() =>
    shouldStartBetaReconciliation({
      now,
      lastStartedAt: new Date(now.getTime() + 1),
    }),
  );
  assert.throws(() =>
    shouldStartBetaReconciliation({ now: new Date("invalid"), lastStartedAt: null }),
  );
});
