import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

test("card installation stays one-tap when available and teaches iOS and Android fallbacks", () => {
  const actions = source("components/customer-experience/public-card-actions.tsx");
  const copy = source("lib/customer-experience/public-copy.ts");

  assert.match(actions, /installPrompt\.prompt\(\)/);
  assert.match(actions, /const android = \/Android\/i\.test\(navigator\.userAgent\)/);
  assert.match(actions, /setCanShowInstall\(ios \|\| android\)/);
  assert.match(actions, /copy\.iosInstallSteps/);
  assert.match(actions, /copy\.androidInstallSteps/);
  assert.match(actions, /<ol className="mt-3 space-y-2/);
  assert.match(actions, /\{index \+ 1\}/);

  assert.match(copy, /افتح صفحة الكارت في Safari/);
  assert.match(copy, /اضغط قائمة ⋮ أعلى المتصفح/);
  assert.match(copy, /Open this card page in Chrome/);
  assert.match(copy, /Add to Home Screen/);
});
