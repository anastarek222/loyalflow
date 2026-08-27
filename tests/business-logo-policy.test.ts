import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  BUSINESS_LOGO_ACCEPTED_MIME_TYPES,
  BUSINESS_LOGO_ACCEPT_ATTRIBUTE,
  BUSINESS_LOGO_MAX_BYTES,
  isSupportedBusinessLogoMimeType,
} from "../lib/branding/business-logo-policy";

const source = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

test("Business logo upload policy has one bounded authority", () => {
  assert.equal(BUSINESS_LOGO_MAX_BYTES, 500 * 1024);
  assert.deepEqual(BUSINESS_LOGO_ACCEPTED_MIME_TYPES, [
    "image/png",
    "image/jpeg",
    "image/webp",
  ]);
  assert.equal(BUSINESS_LOGO_ACCEPT_ATTRIBUTE, "image/png,image/jpeg,image/webp");
  assert.equal(isSupportedBusinessLogoMimeType("image/png"), true);
  assert.equal(isSupportedBusinessLogoMimeType("image/svg+xml"), false);
  assert.equal(isSupportedBusinessLogoMimeType("image/gif"), false);
});

test("Business Setup and server creation consume the shared logo policy", () => {
  const wizard = source("components/business-setup-wizard.tsx");
  const actions = source("app/businesses/actions.ts");

  assert.match(wizard, /BUSINESS_LOGO_ACCEPT_ATTRIBUTE/);
  assert.match(wizard, /file\.size > BUSINESS_LOGO_MAX_BYTES/);
  assert.match(wizard, /!isSupportedBusinessLogoMimeType\(file\.type\)/);
  assert.doesNotMatch(wizard, /file\.size > 500 \* 1024/);

  assert.match(
    actions,
    /getSafeImageDataUrl\(submittedLogoDataUrl, BUSINESS_LOGO_MAX_BYTES\)/,
  );
  assert.doesNotMatch(
    actions,
    /getSafeImageDataUrl\(submittedLogoDataUrl, 500 \* 1024\)/,
  );
});

test("Canonical Business logo presentation remains the #412 full-frame contract", () => {
  const renderer = source("components/business-logo-image.tsx");

  assert.match(renderer, /Canonical full-frame square presentation/);
  assert.match(renderer, /size-full object-cover object-center/);
  assert.doesNotMatch(renderer, /object-contain/);
});
