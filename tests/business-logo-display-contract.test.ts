import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("Business logos use one non-cropping shared display contract", () => {
  const logoImage = source("components/business-logo-image.tsx");

  assert.match(logoImage, /size-full object-contain object-center/);
  assert.doesNotMatch(logoImage, /\bobject-cover\b/);
});

test("Business Setup uses the shared Business logo renderer for the live logo presentation", () => {
  const wizard = source("components/business-setup-wizard.tsx");

  assert.match(wizard, /import \{ BusinessLogoImage \} from "@\/components\/business-logo-image"/);
  assert.match(wizard, /<BusinessLogoImage[\s\S]*?src=\{logoPreview\}/);
});
