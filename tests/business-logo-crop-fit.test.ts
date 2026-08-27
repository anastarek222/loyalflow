import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  BUSINESS_LOGO_MAX_BYTES,
  BUSINESS_LOGO_OUTPUT_MIME_TYPE,
  BUSINESS_LOGO_OUTPUT_SIZE_PX,
  isBusinessLogoUploadAllowed,
} from "@/lib/branding/image-policy";

const source = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

test("Business logo crop output reuses the canonical upload policy", () => {
  assert.equal(BUSINESS_LOGO_MAX_BYTES, 500 * 1024);
  assert.equal(BUSINESS_LOGO_OUTPUT_SIZE_PX, 512);
  assert.equal(BUSINESS_LOGO_OUTPUT_MIME_TYPE, "image/webp");
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

test("Business logo field offers Fit and Fill with a confirmed square output", () => {
  const crop = source("components/business-logo-crop-field.tsx");

  assert.match(crop, /BUSINESS_LOGO_OUTPUT_SIZE_PX/);
  assert.match(crop, /Math\.min\(/);
  assert.match(crop, /Math\.max\(/);
  assert.match(crop, /context\.drawImage\(/);
  assert.match(crop, /BUSINESS_LOGO_OUTPUT_QUALITY_STEPS/);
  assert.match(crop, /blob\.size <= BUSINESS_LOGO_MAX_BYTES/);
  assert.match(crop, /data-logo-fit-mode="FIT"/);
  assert.match(crop, /data-logo-fit-mode="FILL"/);
  assert.match(crop, /data-logo-crop-pending="true"/);
  assert.match(crop, /name="logoCropConfirmed"/);
  assert.match(crop, /onChange\(pendingPreview\)/);
});

test("Add Business cannot review or submit an unconfirmed logo crop", () => {
  const wizard = source("components/business-setup-wizard.tsx");
  const action = source("app/businesses/actions.ts");

  assert.match(wizard, /BusinessLogoCropField/);
  assert.match(wizard, /logoCropPending/);
  assert.match(wizard, /step === 4 && logoCropPending/);
  assert.match(wizard, /onPendingChange=\{setLogoCropPending\}/);
  assert.doesNotMatch(wizard, /new FileReader\(\)/);

  assert.match(action, /formData\.get\("logoCropConfirmed"\)/);
  assert.match(action, /submittedLogoDataUrl && logoCropConfirmed !== "true"/);
});
