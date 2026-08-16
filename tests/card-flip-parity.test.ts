import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("canonical loyalty card owns the front/back 3D flip contract", () => {
  const card = source("components/loyalty-card.tsx");

  assert.match(card, /data-testid="loyalty-card-flip"/);
  assert.match(card, /\[perspective:1200px\]/);
  assert.match(card, /\[transform-style:preserve-3d\]/);
  assert.match(card, /rotateY\(180deg\)/);
  assert.match(card, /\[backface-visibility:hidden\]/);
  assert.match(card, /motion-reduce:transition-none/);

  assert.match(card, /<LoyaltyCardFace side="front"/);
  assert.match(card, /<LoyaltyCardFace side="back"/);
});

test("public and admin preview viewers preserve the canonical flip instance", () => {
  const publicViewer = source(
    "components/customer-experience/public-loyalty-card-viewer.tsx",
  );
  const preview = source("components/loyalty-card-preview.tsx");

  for (const viewer of [publicViewer, preview]) {
    assert.match(viewer, /<LoyaltyCard/);
    assert.doesNotMatch(viewer, /key=\{side\}/);
    assert.doesNotMatch(viewer, /lf-card-reveal/);
  }
});
