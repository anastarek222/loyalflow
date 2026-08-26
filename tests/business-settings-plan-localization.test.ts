import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("Stage 13 business settings localizes visible plan names", () => {
  const page = source("app/businesses/[slug]/settings/page.tsx");

  assert.match(page, /const planName = language === "AR"/);
  assert.match(page, /FREE: "مجانية"/);
  assert.match(page, /STARTER: "أساسية"/);
  assert.match(page, /PRO: "احترافية"/);
  assert.match(page, /BUSINESS: "أعمال"/);
  assert.match(page, /: planCatalog\[business\.plan\]\.name;/);
  assert.equal((page.match(/\{planName\}/g) ?? []).length, 2);
  assert.doesNotMatch(page, /\{planCatalog\[business\.plan\]\.name\}/);
});

test("Stage 13 settings plan localization preserves entitlement authority", () => {
  const page = source("app/businesses/[slug]/settings/page.tsx");

  assert.match(page, /getPlanUsage\(/);
  assert.match(page, /getEffectivePlanLimits\(business\.plan\)/);
  assert.match(page, /planCatalog\[business\.plan\]\.name/);
});
