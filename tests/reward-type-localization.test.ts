import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("Stage 13 reward type options follow the authenticated AR/EN locale in create and edit forms", () => {
  const rewards = source("app/businesses/[slug]/rewards/page.tsx");

  assert.match(rewards, /GIFT: language === "AR" \? "هدية" : "Gift"/);
  assert.match(rewards, /PROMO_CODE: language === "AR" \? "كود ترويجي" : "Promo code"/);
  assert.match(rewards, /DISCOUNT: language === "AR" \? "خصم" : "Discount"/);
  assert.match(rewards, /CUSTOM: language === "AR" \? "مكافأة مخصصة" : "Custom reward"/);

  for (const type of ["GIFT", "PROMO_CODE", "DISCOUNT", "CUSTOM"] as const) {
    const localizedOptions = rewards.match(
      new RegExp(`<option value="${type}">\\{rewardType\\("${type}", language\\)\\}<\\/option>`, "g"),
    );
    assert.equal(localizedOptions?.length, 2, `${type} should be localized in create and edit forms`);
  }
});

test("Stage 13 reward type localization preserves reward values and action boundaries", () => {
  const rewards = source("app/businesses/[slug]/rewards/page.tsx");

  assert.match(rewards, /createRewardAction\.bind\(null, business\.slug\)/);
  assert.match(rewards, /updateRewardAction\.bind\(/);
  assert.match(rewards, /toggleRewardStatusAction\.bind\(/);
  assert.match(rewards, /defaultValue="GIFT"/);
  assert.match(rewards, /defaultValue=\{reward\.type\}/);
  assert.doesNotMatch(rewards, /<option value="GIFT">Gift<\/option>/);
  assert.doesNotMatch(rewards, /<option value="PROMO_CODE">Promo code<\/option>/);
});
