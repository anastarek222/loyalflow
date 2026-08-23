import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  isSupportedPublicAcquisitionPath,
  publicAcquisitionPolicy,
  PUBLIC_ACQUISITION_MODE,
} from "@/lib/acquisition/public-mode";
import { translate } from "@/lib/i18n/catalog";

const root = process.cwd();
const source = (file: string) => readFileSync(path.join(root, file), "utf8");

test("TC7.1 fixes public acquisition to invitation-only Beta", () => {
  assert.equal(PUBLIC_ACQUISITION_MODE, "BETA_INVITATION_ONLY");
  assert.equal(publicAcquisitionPolicy.selfServiceSignupEnabled, false);
  assert.equal(publicAcquisitionPolicy.paymentCheckoutEnabled, false);
  assert.equal(
    publicAcquisitionPolicy.realParticipantGateRequiredBeforeProduction,
    true,
  );
});

test("TC7.1 permits only existing accounts and owner invitations", () => {
  assert.equal(isSupportedPublicAcquisitionPath("EXISTING_ACCOUNT"), true);
  assert.equal(isSupportedPublicAcquisitionPath("OWNER_INVITATION"), true);
  assert.equal(isSupportedPublicAcquisitionPath("SELF_SERVICE_SIGNUP"), false);
  assert.equal(isSupportedPublicAcquisitionPath("PAYMENT_CHECKOUT"), false);
  assert.equal(isSupportedPublicAcquisitionPath("unknown"), false);
  assert.equal(isSupportedPublicAcquisitionPath(null), false);
});

test("TC7.1 publishes the Beta boundary in both locales", () => {
  assert.match(translate("en", "conversion.noSignup"), /Beta.*invitation-only/i);
  assert.match(translate("ar", "conversion.noSignup"), /التجريبية.*بالدعوة فقط/);
});

test("TC7.1 binds the public conversion page to the canonical mode", () => {
  const page = source("app/get-started/page.tsx");

  assert.match(page, /PUBLIC_ACQUISITION_MODE/);
  assert.match(page, /data-acquisition-mode=\{PUBLIC_ACQUISITION_MODE\}/);
  assert.doesNotMatch(page, /href=["']\/signup/);
  assert.doesNotMatch(page, /href=["']\/checkout/);
});
