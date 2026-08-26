import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { standardCardPresetColor } from "@/lib/cards/standard-card";

const source = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

test("Standard Card exposes independent primary and secondary preset palettes", () => {
  const setup = source("components/standard-card-setup.tsx");

  assert.match(setup, /data-testid="primary-color-palette"/);
  assert.match(setup, /data-testid="secondary-color-palette"/);
  assert.match(setup, /updateSecondaryColorPreset/);
  assert.match(setup, /secondaryColorPreset === preset\.id/);
  assert.match(setup, /Choose \$\{colorPresetLabel\(preset\.id, language\)\} as secondary colour/);
});

test("manual Secondary HEX remains independent from preset selection", () => {
  const setup = source("components/standard-card-setup.tsx");

  assert.match(
    setup,
    /const updateSecondaryColor = \(value: string\)[\s\S]*?setSecondaryColorPreset\(null\)[\s\S]*?setSecondaryDraft\(secondaryColor\)/,
  );
  assert.match(setup, /name="secondaryColor"/);
  assert.match(setup, /value=\{secondaryDraft\}/);
  assert.match(setup, /aria-invalid=\{!HEX_COLOR\.test\(secondaryDraft\)\}/);
});

test("theme changes follow selected presets but preserve manual colours", () => {
  const setup = source("components/standard-card-setup.tsx");

  assert.match(
    setup,
    /const secondaryColor = secondaryColorPreset[\s\S]*?standardCardPresetColor\(secondaryColorPreset, theme\)[\s\S]*?: card\.secondaryColor/,
  );
  assert.match(setup, /setSecondaryDraft\(secondaryColor\.toUpperCase\(\)\)/);

  assert.equal(standardCardPresetColor("BLUE", "DEFAULT"), "#1D4ED8");
  assert.equal(standardCardPresetColor("BLUE", "DARK"), "#93C5FD");
});
