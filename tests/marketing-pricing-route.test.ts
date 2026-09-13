import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("Pricing keeps the supplied Stitch structure while using shared Marketing authorities", () => {
  const page = source("app/pricing/page.tsx");

  assert.match(page, /getMarketingPricingCopy/);
  assert.match(page, /pricing\.plans\.map/);
  assert.match(page, /lg:grid-cols-3/);
  assert.match(page, /href="\/get-started"/);
  assert.match(page, /<MarketingHeader/);
  assert.match(page, /<MarketingFooter/);
  assert.match(page, /<details/);
  assert.match(page, /rtl:-scale-x-100/);
});

test("Official Pricing authority preserves Stitch plans and prices with product-truth overrides", () => {
  const pricing = source("lib/marketing/pricing.ts");

  for (const value of [
    'name: "Starter"',
    'name: "Growth"',
    'name: "Scale"',
    'name: "الأساسية"',
    'name: "الاحترافية"',
    'name: "المتقدمة"',
    'price: "899"',
    'price: "1,599"',
    'price: "2,799"',
    'currency: "EGP"',
    'currency: "جنيهًا مصريًا"',
    'popularLabel: "MOST POPULAR"',
    'popularLabel: "الأكثر اختيارًا"',
  ]) {
    assert.match(pricing, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(pricing, /MARKETING_PRICING_TRIAL_DAYS = 14/);
  assert.match(pricing, /14 days free/);
  assert.match(pricing, /14 يومًا مجانًا/);
  assert.doesNotMatch(pricing, /7-day free trial|7 days free|7 أيام مجانًا/);
  assert.doesNotMatch(pricing, /under 7 minutes|أقل من 7 دقائق/);
});

test("Shared Marketing header owns its light/dark theme scope", () => {
  const header = source("components/marketing/marketing-header.tsx");

  assert.match(
    header,
    /"lf-marketing-surface sticky top-0 z-40 border-b/,
  );
  assert.match(
    header,
    /className="lf-marketing-surface fixed inset-y-0 end-0 z-\[90\]/,
  );
});
