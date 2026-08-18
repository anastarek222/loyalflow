import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settingsPage = readFileSync(
  new URL("../app/businesses/[slug]/settings/page.tsx", import.meta.url),
  "utf8",
);

test("Settings localizes plan usage resource labels in Arabic", () => {
  assert.match(settingsPage, /function planUsageResourceLabel/);
  assert.match(settingsPage, /CUSTOMERS: "العملاء"/);
  assert.match(settingsPage, /USERS: "الفريق"/);
  assert.match(settingsPage, /BRANCHES: "الفروع"/);
  assert.match(settingsPage, /OFFERS: "العروض"/);
  assert.match(settingsPage, /REWARDS: "المكافآت"/);
  assert.match(settingsPage, /planUsageResourceLabel\(item\.resource, language === "AR"\)/);
});

test("Settings keeps authoritative plan usage calculation unchanged", () => {
  assert.match(settingsPage, /getPlanUsage\(/);
  assert.match(settingsPage, /getEffectivePlanLimits\(business\.plan\)/);
  assert.match(settingsPage, /item\.used/);
  assert.match(settingsPage, /item\.limit \?\? "∞"/);
});
