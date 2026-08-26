import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

test("Standard and Custom cards share the same outer silhouette and flip authority", () => {
  const standard = source("components/standard-loyalty-card.tsx");
  const loyalty = source("components/loyalty-card.tsx");

  assert.match(standard, /rounded-\[5\.2%\]/);
  assert.match(loyalty, /rounded-\[5\.2%\]/);
  assert.doesNotMatch(loyalty, /rounded-\[5\.2cqw\]/);
  assert.match(loyalty, /aspectRatio: String\(STANDARD_CARD_ASPECT_RATIO\)/);
  assert.match(loyalty, /data-testid="loyalty-card-flip"/);
  assert.match(loyalty, /rotateY\(180deg\)/);
});

test("Customer ID stays on the Standard Card as quiet technical information", () => {
  const standard = source("components/standard-loyalty-card.tsx");

  assert.match(standard, /id: "LOYALTY ID"/);
  assert.match(standard, /\{labels\.id\}/);
  assert.match(standard, /\{boundedText\(props\.customerId, 24\)\}/);
  assert.match(
    standard,
    /data-emphasis="low"[\s\S]*?fontSize="8"[\s\S]*?\{labels\.id\}/,
  );
  assert.match(
    standard,
    /data-emphasis="low"[\s\S]*?fontSize="10"[\s\S]*?opacity="0\.72"[\s\S]*?\{boundedText\(props\.customerId, 24\)\}/,
  );
});
