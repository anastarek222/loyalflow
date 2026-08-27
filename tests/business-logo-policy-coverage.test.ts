import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  BUSINESS_LOGO_ACCEPT,
  BUSINESS_LOGO_MAX_BYTES,
  BUSINESS_LOGO_MAX_KB,
} from "@/lib/branding/image-policy";

const source = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

test("all active Business logo upload surfaces share the canonical policy", () => {
  assert.equal(BUSINESS_LOGO_MAX_KB, 500);
  assert.equal(BUSINESS_LOGO_MAX_BYTES, 500 * 1024);
  assert.equal(BUSINESS_LOGO_ACCEPT, "image/png,image/jpeg,image/webp");

  const ownerWizard = source("components/owner-onboarding-wizard.tsx");
  assert.match(ownerWizard, /accept=\{BUSINESS_LOGO_ACCEPT\}/);
  assert.match(ownerWizard, /file\.size > BUSINESS_LOGO_MAX_BYTES/);
  assert.match(ownerWizard, /!isBusinessLogoMimeType\(file\.type\)/);
  assert.doesNotMatch(ownerWizard, /file\.size > 500 \* 1024/);

  const ownerAction = source("app/onboarding/actions.ts");
  assert.match(ownerAction, /getSafeImageDataUrl\(data\.logoUrl, BUSINESS_LOGO_MAX_BYTES\)/);
  assert.match(ownerAction, /imageFileToDataUrl\(logoFile, BUSINESS_LOGO_MAX_BYTES\)/);
  assert.doesNotMatch(ownerAction, /500 \* 1024/);

  const programPage = source("app/businesses/[slug]/program/page.tsx");
  assert.match(programPage, /accept=\{BUSINESS_LOGO_ACCEPT\}/);
  assert.match(programPage, /BUSINESS_LOGO_MAX_KB/);
  assert.match(programPage, /up to \${BUSINESS_LOGO_MAX_KB}KB/);

  const programAction = source("app/businesses/[slug]/program/card-design-actions.ts");
  assert.match(programAction, /imageFileToDataUrl\(\s*logoFile,\s*BUSINESS_LOGO_MAX_BYTES/);
  assert.doesNotMatch(programAction, /500 \* 1024/);
});

test("Business logo presentation stays on the accepted full-frame contract", () => {
  const renderer = source("components/business-logo-image.tsx");
  assert.match(renderer, /size-full object-cover object-center/);
  assert.doesNotMatch(renderer, /object-contain/);
});
