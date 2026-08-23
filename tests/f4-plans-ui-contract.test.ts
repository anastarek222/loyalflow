import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const plansPage = readFileSync(
  new URL("../app/plans/page.tsx", import.meta.url),
  "utf8",
);

test("Plans management exposes semantic feedback and keyboard focus states", () => {
  assert.match(plansPage, /role="status"/);
  assert.match(plansPage, /role="alert"/);
  assert.match(plansPage, /focus-visible:ring-2 focus-visible:ring-primary/);
  assert.match(plansPage, /focus:ring-2 focus:ring-primary\/20/);
});

test("Plans management keeps authoritative limit boundaries unchanged", () => {
  assert.match(plansPage, /getEffectivePlanLimitsMap\(\)/);
  assert.match(plansPage, /updatePlanLimitsAction\.bind\(null, plan\)/);
  assert.match(plansPage, /defaultValue=\{limits\[field\.key\] \?\? ""\}/);
});
