import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("Add Business keeps the current horizontal step visible", () => {
  const wizard = read("components/business-setup-wizard.tsx");

  assert.match(wizard, /stepButtonRefs\.current\[step\]\?\.scrollIntoView/);
  assert.match(wizard, /inline: "center"/);
  assert.match(wizard, /aria-current=\{index === step \? "step" : undefined\}/);
  assert.match(wizard, /\{step \+ 1\}\/\{copy\.steps\.length\}/);
  assert.match(wizard, /overflow-x-auto/);
  assert.match(wizard, /disabled=\{index > step\}/);
  assert.match(wizard, /whitespace-nowrap/);
  assert.doesNotMatch(wizard, /MutationObserver/);
});

test("Add Business shows the live card before mobile controls and updates it from canonical inputs", () => {
  const wizard = read("components/business-setup-wizard.tsx");
  const setup = read("components/standard-card-setup.tsx");

  assert.match(setup, /className="order-2 space-y-5 xl:order-1"/);
  assert.match(
    setup,
    /<aside className="order-1 min-w-0 xl:order-2 xl:sticky/,
  );
  assert.match(setup, /data-testid="standard-card-preview-container"/);
  assert.match(wizard, /onInput=\{\(event\) =>/);
  assert.match(wizard, /setCardPreview\(\(current\) =>/);
  assert.match(wizard, /preview=\{\{ \.\.\.cardPreview, logoUrl: logoPreview \}\}/);
  assert.match(wizard, /onPreviewChange=\{\(next\) =>/);
});
