import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("Pricing implements the supplied Stitch structure with current commercial truth", () => {
  const page = source("app/pricing/page.tsx");

  for (const key of [
    "marketing.pricing.proofTrial",
    "marketing.pricing.proofPayment",
    "marketing.pricing.proofSetup",
    "marketing.pricing.includedTitle",
    "marketing.pricing.faqTitle",
    "marketing.pricing.finalTitle",
  ]) {
    assert.match(page, new RegExp(key.replaceAll(".", "\\.")));
  }

  assert.match(page, /loyalFlowPlans\.map/);
  assert.match(page, /href="\/get-started"/);
  assert.match(page, /<MarketingHeader/);
  assert.match(page, /<MarketingFooter/);
  assert.match(page, /<details/);
  assert.match(page, /rtl:-scale-x-100/);
  assert.doesNotMatch(page, /899|1,599|2,799/);
  assert.doesNotMatch(page, /under 7 minutes|أقل من 7 دقائق/i);
});

test("Pricing copy preserves four real plans and rejects stale Stitch claims", () => {
  const english = source("lib/i18n/locales/en/marketing.ts");
  const arabic = source("lib/i18n/locales/ar/marketing.ts");

  for (const catalog of [english, arabic]) {
    for (const key of [
      "freePlanName",
      "starterPlanName",
      "proPlanName",
      "businessPlanName",
      "managedCommercial",
      "faqOneAnswer",
      "finalBody",
    ]) {
      assert.match(catalog, new RegExp(`marketing\\.pricing\\.${key}`));
    }

    assert.doesNotMatch(catalog, /899|1,599|2,799/);
  }

  assert.match(english, /14-day Trial/);
  assert.match(arabic, /14 يومًا/);
});
