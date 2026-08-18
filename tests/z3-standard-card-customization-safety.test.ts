import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const setupSource = readFileSync(
  new URL("../components/standard-card-setup.tsx", import.meta.url),
  "utf8",
);

test("Z3 keeps Standard Card customization business-owner controlled but bounded", () => {
  assert.match(setupSource, /name="primaryColor"/);
  assert.match(setupSource, /name="themePreset"/);
  assert.match(setupSource, /STANDARD_CARD_ARTWORK_CATEGORIES\.map/);
  assert.match(setupSource, /name="standardCardArtworkEnabled"/);
  assert.match(setupSource, /Loyalty system · read only/);
});

test("Z3 never exposes functional card geometry or QR movement as customization inputs", () => {
  assert.doesNotMatch(setupSource, /name="(?:qr|qrX|qrY|qrSize|customerNameX|customerNameY)"/i);
  assert.doesNotMatch(setupSource, /draggable=\{?true\}?/);
  assert.doesNotMatch(setupSource, /contentEditable/);
});

test("Z3 keeps Provider Custom Card controls outside Business Owner customization", () => {
  assert.match(setupSource, /const customReadOnly = !allowCustom && initial\.designMode === "CUSTOM"/);
  assert.match(setupSource, /Custom artwork · read only/);
  assert.match(setupSource, /Super Admin only/);
});
