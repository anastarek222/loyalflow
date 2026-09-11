import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { isValidBusinessLogoStorageValue } from "@/lib/branding/image-data";
import {
  BUSINESS_LOGO_ACCEPT,
  BUSINESS_LOGO_MAX_BYTES,
  BUSINESS_LOGO_MAX_KB,
} from "@/lib/branding/image-policy";

const source = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

function pngDataUrl(byteLength: number) {
  assert.ok(byteLength >= 8);
  const bytes = Buffer.alloc(byteLength);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

test("Business logo persistence separates short remote URLs from bounded uploads", () => {
  assert.equal(
    isValidBusinessLogoStorageValue("https://example.com/logo.png", BUSINESS_LOGO_MAX_BYTES),
    true,
  );
  assert.equal(
    isValidBusinessLogoStorageValue(
      `https://example.com/${"a".repeat(490)}`,
      BUSINESS_LOGO_MAX_BYTES,
    ),
    false,
  );

  const uploadedLogo = pngDataUrl(600);
  assert.ok(uploadedLogo.length > 500);
  assert.equal(
    isValidBusinessLogoStorageValue(uploadedLogo, BUSINESS_LOGO_MAX_BYTES),
    true,
  );
  assert.equal(
    isValidBusinessLogoStorageValue(
      pngDataUrl(BUSINESS_LOGO_MAX_BYTES + 1),
      BUSINESS_LOGO_MAX_BYTES,
    ),
    false,
  );
});

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
  assert.match(
    ownerAction,
    /isValidBusinessLogoStorageValue\(data\.logoUrl, BUSINESS_LOGO_MAX_BYTES\)/,
  );
  assert.match(ownerAction, /imageFileToDataUrl\(logoFile, BUSINESS_LOGO_MAX_BYTES\)/);
  assert.doesNotMatch(ownerAction, /logoUrl: z\.string\(\)\.trim\(\)\.max\(500\)/);
  assert.doesNotMatch(ownerAction, /500 \* 1024/);

  const programPage = source("app/businesses/[slug]/program/page.tsx");
  assert.match(programPage, /accept=\{BUSINESS_LOGO_ACCEPT\}/);
  assert.match(programPage, /BUSINESS_LOGO_MAX_KB/);
  assert.match(programPage, /up to \$\{BUSINESS_LOGO_MAX_KB\}KB/);

  const programAction = source("app/businesses/[slug]/program/card-design-actions.ts");
  assert.match(programAction, /imageFileToDataUrl\(\s*logoFile,\s*BUSINESS_LOGO_MAX_BYTES/);
  assert.doesNotMatch(programAction, /500 \* 1024/);
});

test("Business logo presentation stays on the accepted full-frame contract", () => {
  const renderer = source("components/business-logo-image.tsx");
  assert.match(renderer, /size-full object-cover object-center/);
  assert.doesNotMatch(renderer, /object-contain/);
});
