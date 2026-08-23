import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const plansPage = readFileSync(
  new URL("../app/plans/page.tsx", import.meta.url),
  "utf8",
);

const plansAction = readFileSync(
  new URL("../app/plans/actions.ts", import.meta.url),
  "utf8",
);

test("Plans feedback uses the validated plan query context", () => {
  assert.match(plansPage, /isLoyalFlowPlan/);
  assert.match(plansPage, /params\.plan && isLoyalFlowPlan\(params\.plan\)/);
  assert.match(plansPage, /const feedbackPlanName = feedbackPlan/);
  assert.match(plansPage, /planCatalog\[feedbackPlan\]\.name/);
  assert.match(plansPage, /feedbackPlanName/);
});

test("Plan limit write behavior and redirect context remain authoritative", () => {
  assert.match(plansAction, /updatePlanLimitsAction/);
  assert.match(plansAction, /planConfiguration\.upsert/);
  assert.match(plansAction, /redirect\(`\/plans\?success=updated&plan=\$\{plan\}`\)/);
  assert.match(plansAction, /redirect\(`\/plans\?error=invalid-limits&plan=\$\{plan\}`\)/);
});
