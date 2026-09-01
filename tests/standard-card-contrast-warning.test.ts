import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  STANDARD_CARD_TEXT_CONTRAST_TARGET,
  colorContrastRatio,
  getStandardCardPrimaryContrast,
} from "@/lib/cards/standard-card-contrast";

const source = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

test("Standard Card contrast authority follows WCAG small-text target", () => {
  assert.equal(STANDARD_CARD_TEXT_CONTRAST_TARGET, 4.5);
  assert.ok(colorContrastRatio("#111827", "#F8FAFC") > 10);
  assert.equal(colorContrastRatio("invalid", "#F8FAFC"), 0);

  const lowLight = getStandardCardPrimaryContrast("#F8FAFC", "DEFAULT");
  assert.equal(lowLight.background, "#F8FAFC");
  assert.equal(lowLight.passes, false);

  const readableLight = getStandardCardPrimaryContrast("#1D4ED8", "DEFAULT");
  assert.equal(readableLight.passes, true);

  const readableDark = getStandardCardPrimaryContrast("#E6C27A", "DARK");
  assert.equal(readableDark.background, "#07101C");
  assert.equal(readableDark.passes, true);
});

test("Standard Card editor warns only for low-contrast manual primary colours", () => {
  const setup = source("components/standard-card-setup.tsx");

  assert.match(setup, /getStandardCardPrimaryContrast/);
  assert.match(setup, /colorPreset === null && !primaryContrast\.passes/);
  assert.match(setup, /data-testid="primary-color-contrast-warning"/);
  assert.match(setup, /role="status"/);
  assert.match(setup, /Aim for at least 4\.5:1/);
  assert.doesNotMatch(setup, /disabled=\{showPrimaryContrastWarning\}/);
});
