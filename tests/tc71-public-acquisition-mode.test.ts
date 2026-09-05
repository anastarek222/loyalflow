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

test("TC7.1 makes Marketing the public Trial acquisition authority", () => {
  assert.equal(PUBLIC_ACQUISITION_MODE, "PUBLIC_TRIAL");
  assert.equal(publicAcquisitionPolicy.selfServiceSignupEnabled, true);
  assert.equal(publicAcquisitionPolicy.paymentCheckoutEnabled, false);
  assert.equal(
    publicAcquisitionPolicy.realParticipantGateRequiredBeforeProduction,
    true,
  );
});

test("TC7.1 exposes new-business intent and existing sign-in without an invitation product path", () => {
  assert.equal(isSupportedPublicAcquisitionPath("NEW_BUSINESS"), true);
  assert.equal(isSupportedPublicAcquisitionPath("EXISTING_ACCOUNT"), true);
  assert.equal(isSupportedPublicAcquisitionPath("OWNER_INVITATION"), false);
  assert.equal(isSupportedPublicAcquisitionPath("SELF_SERVICE_SIGNUP"), false);
  assert.equal(isSupportedPublicAcquisitionPath("PAYMENT_CHECKOUT"), false);
  assert.equal(isSupportedPublicAcquisitionPath("unknown"), false);
  assert.equal(isSupportedPublicAcquisitionPath(null), false);
});

test("TC7.1 publishes a truthful public Trial path without legacy invitation terminology", () => {
  assert.match(translate("en", "conversion.body"), /seven-day Trial/i);
  assert.match(translate("ar", "conversion.body"), /7 أيام/);
  assert.doesNotMatch(translate("en", "conversion.body"), /owner invitation/i);
  assert.doesNotMatch(translate("ar", "conversion.body"), /دعوة مالك/);
  assert.doesNotMatch(translate("en", "conversion.body"), /Beta/i);
  assert.doesNotMatch(translate("en", "conversion.noSignup"), /Beta/i);
  assert.doesNotMatch(translate("ar", "conversion.body"), /Beta|بيتا/);
  assert.doesNotMatch(translate("ar", "conversion.noSignup"), /Beta|بيتا/);
});

test("TC7.1 binds the public conversion page to the canonical mode", () => {
  const page = source("app/get-started/page.tsx");

  assert.match(page, /PUBLIC_ACQUISITION_MODE/);
  assert.match(page, /data-acquisition-mode=\{PUBLIC_ACQUISITION_MODE\}/);
  assert.match(page, /PublicTrialForm/);
  assert.match(page, /startPublicTrialAction/);
  assert.match(page, /data-secure-setup-continuation="email-only"/);
  assert.doesNotMatch(page, /href=["']\/signup/);
  assert.doesNotMatch(page, /href=["']\/checkout/);
  assert.doesNotMatch(page, /data-owner-invitation-requirement/);
});
