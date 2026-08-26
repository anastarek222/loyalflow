import assert from "node:assert/strict";
import test from "node:test";

import { loyaltyProgramSchema } from "@/lib/business/domain-validation";
import {
  STANDARD_CARD_UNIT_LABEL_MAX_LENGTH,
  boundedStandardCardUnitLabel,
  standardCardGraphemeLength,
  standardCardValueFontSize,
} from "@/lib/cards/standard-card-text";
import { getLoyaltyCardMetrics } from "@/lib/cards/standard-card";

test("Standard Card unit labels use a 20-grapheme display contract", () => {
  assert.equal(STANDARD_CARD_UNIT_LABEL_MAX_LENGTH, 20);
  assert.equal(standardCardGraphemeLength("RECOMMENDATIONS"), 15);
  assert.equal(boundedStandardCardUnitLabel("RECOMMENDATIONS"), "RECOMMENDATIONS");
  assert.doesNotMatch(boundedStandardCardUnitLabel("RECOMMENDATIONS"), /RECS/);

  const combining = `A\u0301${"B".repeat(19)}`;
  assert.equal(standardCardGraphemeLength(combining), 20);
  assert.equal(boundedStandardCardUnitLabel(combining), combining);

  const legacyTooLong = "CUSTOMER RECOMMENDATION";
  const legacyFallback = boundedStandardCardUnitLabel(legacyTooLong);
  assert.equal(standardCardGraphemeLength(legacyFallback), 20);
  assert.match(legacyFallback, /…$/);
});

test("new loyalty rules reject unit labels that cannot fit the card contract", () => {
  const base = {
    loyaltyMode: "POINTS" as const,
    unitName: "RECOMMENDATIONS",
    earnAmount: 1,
    rewardThreshold: 10,
    rewardName: "Free item",
  };

  assert.equal(loyaltyProgramSchema.safeParse(base).success, true);
  assert.equal(
    loyaltyProgramSchema.safeParse({
      ...base,
      unitName: "ABCDEFGHIJKLMNOPQRST",
    }).success,
    true,
  );
  assert.equal(
    loyaltyProgramSchema.safeParse({
      ...base,
      unitName: "ABCDEFGHIJKLMNOPQRSTU",
    }).success,
    false,
  );
});

test("long supported units stay semantic and use adaptive type instead of abbreviations", () => {
  const metrics = getLoyaltyCardMetrics({
    balance: 4,
    loyaltyMode: "POINTS",
    unitName: "RECOMMENDATIONS",
    rewardThreshold: 5,
    language: "EN",
  });

  assert.equal(metrics.currentText, "4 RECOMMENDATIONS");
  assert.equal(metrics.ratioText, "4 / 5 RECOMMENDATIONS");
  assert.equal(metrics.remainingText, "1 RECOMMENDATION TO NEXT REWARD");
  assert.ok(
    standardCardValueFontSize("4 RECOMMENDATIONS") <
      standardCardValueFontSize("4 PTS"),
  );
});
