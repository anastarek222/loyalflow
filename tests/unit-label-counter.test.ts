import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  STANDARD_CARD_UNIT_LABEL_MAX_LENGTH,
  standardCardGraphemeLength,
  truncateStandardCardUnitLabel,
} from "../lib/cards/standard-card-text";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("unit label authority remains 18 graphemes", () => {
  assert.equal(STANDARD_CARD_UNIT_LABEL_MAX_LENGTH, 18);
  assert.equal(standardCardGraphemeLength("👨‍👩‍👧‍👦"), 1);
});

test("unit label truncation preserves exactly 18 graphemes", () => {
  const family = "👨‍👩‍👧‍👦";
  const bounded = truncateStandardCardUnitLabel(family.repeat(19));

  assert.equal(standardCardGraphemeLength(bounded), 18);
  assert.equal(bounded, family.repeat(18));
});

test("shared unit label input exposes a live x/18 counter and grapheme-aware limit", () => {
  const input = source("components/unit-label-input.tsx");
  assert.match(input, /standardCardGraphemeLength/);
  assert.match(input, /truncateStandardCardUnitLabel/);
  assert.doesNotMatch(input, /maxLength=/);
  assert.match(input, /data-unit-label-counter/);
  assert.match(input, /\{count\}\/\{STANDARD_CARD_UNIT_LABEL_MAX_LENGTH\}/);
});

test("all editable unit-name surfaces consume the shared counter input", () => {
  for (const path of [
    "components/business-setup-wizard.tsx",
    "components/owner-onboarding-wizard.tsx",
    "components/program-rules-form.tsx",
  ]) {
    const content = source(path);
    assert.match(content, /import \{ UnitLabelInput \} from "@\/components\/unit-label-input"/);
    assert.match(content, /<UnitLabelInput/);
  }
});
