import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { loyaltyProgramSchema } from "@/lib/business/domain-validation";
import {
  STANDARD_CARD_UNIT_LABEL_MAX_LENGTH,
  boundedStandardCardUnitLabel,
  standardCardGraphemeLength,
  standardCardValueFontSize,
} from "@/lib/cards/standard-card-text";
import { getLoyaltyCardMetrics } from "@/lib/cards/standard-card";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("Standard Card unit labels use one 20-grapheme input and display contract", () => {
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

test("new loyalty rules preserve valid full unit names and reject only values above 20 graphemes", () => {
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

test("wizard unit-name inputs share the canonical Standard Card grapheme validation without truncating input", () => {
  const sharedInput = source("components/unit-label-input.tsx");
  assert.match(
    sharedInput,
    /STANDARD_CARD_UNIT_LABEL_MAX_LENGTH,[\s\S]*standardCardGraphemeLength,[\s\S]*from "@\/lib\/cards\/standard-card-text"/,
  );
  assert.doesNotMatch(sharedInput, /truncateStandardCardUnitLabel/);
  assert.doesNotMatch(sharedInput, /maxLength=/);
  assert.match(sharedInput, /data-unit-label-over-limit/);
  assert.match(sharedInput, /\{count\}\/\{STANDARD_CARD_UNIT_LABEL_MAX_LENGTH\}/);

  for (const wizard of [
    source("components/owner-onboarding-wizard.tsx"),
    source("components/business-setup-wizard.tsx"),
    source("components/program-rules-form.tsx"),
  ]) {
    assert.match(
      wizard,
      /import \{ UnitLabelInput \} from "@\/components\/unit-label-input"/,
    );
    assert.match(wizard, /<UnitLabelInput/);
    assert.doesNotMatch(
      wizard,
      /name="unitName"[\s\S]{0,240}?maxLength=\{30\}/,
    );
  }
});

test("long supported units stay semantic and use adaptive type instead of abbreviations", () => {
  const metrics = getLoyaltyCardMetrics({
    balance: 4,
    loyaltyMode: "POINTS",
    unitName: "RECOMMENDATIONS",
    rewardThreshold: 5,
    language: "EN",
  });

  assert.equal(metrics.fullUnit, "RECOMMENDATIONS");
  assert.equal(metrics.currentText, "4 RECOMMENDATIONS");
  assert.equal(metrics.ratioText, "4 / 5 RECOMMENDATIONS");
  assert.equal(metrics.remainingText, "1 RECOMMENDATION TO NEXT REWARD");
  assert.equal(metrics.semanticCurrentText, "4 RECOMMENDATIONS");
  assert.equal(metrics.semanticRatioText, "4 RECOMMENDATIONS / 5 RECOMMENDATIONS");
  assert.ok(
    standardCardValueFontSize("4 RECOMMENDATIONS") <
      standardCardValueFontSize("4 PTS"),
  );
});
