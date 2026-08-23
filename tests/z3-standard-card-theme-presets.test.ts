import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const presetSource = readFileSync(
  new URL("../lib/cards/standard-card.ts", import.meta.url),
  "utf8",
);
const rendererSource = readFileSync(
  new URL("../components/standard-loyalty-card.tsx", import.meta.url),
  "utf8",
);
const setupSource = readFileSync(
  new URL("../components/standard-card-setup.tsx", import.meta.url),
  "utf8",
);

test("Z3 defines a bounded Standard Card theme contract", () => {
  assert.match(
    presetSource,
    /STANDARD_CARD_THEME_PRESETS = \["DEFAULT", "DARK"\] as const/,
  );
  assert.match(presetSource, /standardCardThemePreset\(/);
  assert.match(presetSource, /: "DEFAULT";/);
});

test("Z3 exposes approved professional colour presets", () => {
  for (const preset of ["GOLD", "BLUE", "EMERALD", "VIOLET", "ROSE", "SLATE"]) {
    assert.match(presetSource, new RegExp(`id: "${preset}"`));
  }
  assert.match(
    presetSource,
    /DEFAULT_STANDARD_CARD_COLOR_PRESET: StandardCardColorPreset = "GOLD"/,
  );
  assert.match(presetSource, /standardCardColorPreset\(/);
  assert.match(presetSource, /standardCardPresetColor\(/);
  assert.match(presetSource, /standardCardPresetForColor\(/);
});

test("Z3 presets carry separate Light and Dark safe accents", () => {
  const paletteRows = [
    ...presetSource.matchAll(
      /\{ id: "([A-Z]+)", light: "(#[0-9A-F]{6})", dark: "(#[0-9A-F]{6})" \}/g,
    ),
  ];
  assert.equal(paletteRows.length, 6);
  for (const [, , light, dark] of paletteRows) {
    assert.notEqual(light, dark);
  }
});

test("Z3 Standard Card setup keeps approved presets alongside bounded free-form colour editing", () => {
  assert.match(setupSource, /STANDARD_CARD_COLOR_PRESETS\.map/);
  assert.match(setupSource, /STANDARD_CARD_THEME_PRESETS\.map/);
  assert.match(setupSource, /updateColorPreset\(preset\.id\)/);
  assert.match(setupSource, /updateThemePreset\(theme\)/);
  assert.match(setupSource, /type="color"/);
  assert.match(setupSource, /"HEX code"/);
  assert.match(setupSource, /const HEX_COLOR = \/\^#\[0-9a-fA-F\]\{6\}\$\//);
});

test("Z3 preserves a custom colour across theme changes until a preset is explicitly selected", () => {
  assert.match(setupSource, /standardCardPresetForColor\(initial\.primaryColor\) \?\?/);
  assert.match(
    setupSource,
    /\(initial\.primaryColor \? null : DEFAULT_STANDARD_CARD_COLOR_PRESET\)/,
  );
  assert.match(
    setupSource,
    /const primaryColor = colorPreset[\s\S]*?standardCardPresetColor\(colorPreset, theme\)\.toUpperCase\(\)[\s\S]*?: card\.primaryColor/,
  );
  assert.match(setupSource, /name="primaryColor"/);
});

test("Z3 preset foundation does not replace the canonical card geometry authority", () => {
  assert.match(
    rendererSource,
    /import \{[\s\S]*LOYALTY_CARD_CANVAS[\s\S]*\} from "@\/lib\/cards\/card-rendering-contract"/,
  );
  assert.match(
    rendererSource,
    /viewBox=\{`0 0 \$\{LOYALTY_CARD_CANVAS\.width\} \$\{LOYALTY_CARD_CANVAS\.height\}`\}/,
  );
  assert.doesNotMatch(presetSource, /LOYALTY_CARD_CANVAS\s*=/);
});
