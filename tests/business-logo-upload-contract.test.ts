import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  BUSINESS_LOGO_ALLOWED_MIME_TYPES,
  BUSINESS_LOGO_INPUT_MAX_BYTES,
  BUSINESS_LOGO_OUTPUT_MIME_TYPE,
  BUSINESS_LOGO_OUTPUT_SIZE_PX,
  isBusinessLogoUploadAllowed,
} from "../lib/branding/logo-upload-contract";

const source = (file: string) =>
  readFileSync(join(process.cwd(), file), "utf8");

test("Business logo upload contract has one bounded square output", () => {
  assert.equal(BUSINESS_LOGO_INPUT_MAX_BYTES, 500 * 1024);
  assert.equal(BUSINESS_LOGO_OUTPUT_SIZE_PX, 512);
  assert.equal(BUSINESS_LOGO_OUTPUT_MIME_TYPE, "image/webp");
  assert.deepEqual(BUSINESS_LOGO_ALLOWED_MIME_TYPES, [
    "image/png",
    "image/jpeg",
    "image/webp",
  ]);
  assert.equal(
    isBusinessLogoUploadAllowed({ size: 500 * 1024, type: "image/png" }),
    true,
  );
  assert.equal(
    isBusinessLogoUploadAllowed({ size: 500 * 1024 + 1, type: "image/png" }),
    false,
  );
  assert.equal(
    isBusinessLogoUploadAllowed({ size: 100, type: "image/svg+xml" }),
    false,
  );
});

test("Business logo crop field center-crops and requires explicit confirmation", () => {
  const crop = source("components/business-logo-crop-field.tsx");
  assert.match(crop, /Math\.min\(image\.naturalWidth, image\.naturalHeight\)/);
  assert.match(crop, /canvas\.width = BUSINESS_LOGO_OUTPUT_SIZE_PX/);
  assert.match(crop, /canvas\.height = BUSINESS_LOGO_OUTPUT_SIZE_PX/);
  assert.match(crop, /context\.drawImage\(/);
  assert.match(crop, /data-logo-crop-pending="true"/);
  assert.match(crop, /onChange\(pendingCrop\)/);
  assert.match(crop, /name="logoCropConfirmed"/);
});

test("Super Admin Add Business blocks review while a new logo crop is pending", () => {
  const wizard = source("components/business-setup-wizard.tsx");
  assert.match(wizard, /BusinessLogoCropField/);
  assert.match(wizard, /logoCropPending/);
  assert.match(wizard, /step === 4 && logoCropPending/);
  assert.doesNotMatch(wizard, /new FileReader\(\)/);
});
