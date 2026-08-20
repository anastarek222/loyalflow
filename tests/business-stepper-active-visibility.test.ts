import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("Add Business keeps the current horizontal step visible", () => {
  const layout = read("app/businesses/new/layout.tsx");
  const visibility = read("components/business-setup-stepper-visibility.tsx");
  const wizard = read("components/business-setup-wizard.tsx");

  assert.match(layout, /data-business-setup-route="true"/);
  assert.match(layout, /BusinessSetupStepperVisibility/);

  assert.match(visibility, /MutationObserver/);
  assert.match(visibility, /attributeFilter: \["disabled"\]/);
  assert.match(visibility, /find\(\(button\) => !button\.disabled\)/);
  assert.match(visibility, /scrollIntoView/);
  assert.match(visibility, /inline: "nearest"/);

  assert.match(wizard, /overflow-x-auto/);
  assert.match(wizard, /disabled=\{index > step\}/);
  assert.match(wizard, /whitespace-nowrap/);
});
