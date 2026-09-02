import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  STANDARD_CARD_UNIT_LABEL_MAX_LENGTH,
  standardCardGraphemeLength,
} from "../lib/cards/standard-card-text";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("unit label authority remains 20 graphemes", () => {
  assert.equal(STANDARD_CARD_UNIT_LABEL_MAX_LENGTH, 20);
  assert.equal(standardCardGraphemeLength("👨‍👩‍👧‍👦"), 1);
  assert.equal(standardCardGraphemeLength("RECOMMENDATIONS"), 15);
});

test("shared unit label input exposes a live x/20 counter without silently truncating", () => {
  const input = source("components/unit-label-input.tsx");
  assert.match(input, /standardCardGraphemeLength/);
  assert.doesNotMatch(input, /truncateStandardCardUnitLabel/);
  assert.doesNotMatch(input, /maxLength=/);
  assert.match(input, /data-unit-label-counter/);
  assert.match(input, /data-unit-label-over-limit/);
  assert.match(input, /overLimit/);
  assert.match(input, /aria-invalid=\{overLimit \|\| ariaInvalid \|\| undefined\}/);
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
