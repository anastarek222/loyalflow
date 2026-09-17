import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const finalUat = source("tests/browser/final-uat-u13.spec.ts");
const ownerUat = source("tests/browser/owner-onboarding-mobile.spec.ts");
const config = source("playwright.config.ts");
const workflow = source(".github/workflows/staging-pr-validation.yml");

test("pre-Stitch browser receipts select every required non-WhatsApp role across desktop/mobile functional scopes", () => {
  assert.match(
    finalUat,
    /manager and viewer remain within their authoritative capabilities @desktop @mobile/,
  );
  assert.match(
    finalUat,
    /super admin has explicit global and business context @desktop @tablet/,
  );
  assert.match(
    finalUat,
    /staff operates Scan on desktop with branch context and no reports access @desktop/,
  );
  assert.match(
    finalUat,
    /staff operates Scan in Arabic on mobile with branch context and no reports access @mobile/,
  );
  assert.match(
    finalUat,
    /customer can join and use the public card on desktop @desktop/,
  );
  assert.match(
    finalUat,
    /public enrollment and English\/Arabic public cards are responsive and private @mobile/,
  );
});

test("Owner Trial acquisition has isolated mobile and desktop project selection", () => {
  assert.match(ownerUat, /14-day Trial @owner-onboarding-desktop/);
  assert.match(config, /name: "owner-onboarding-chromium"/);
  assert.match(config, /grep: \/@owner-onboarding\//);
  assert.match(config, /grepInvert: \/@owner-onboarding-desktop\//);
  assert.match(config, /name: "owner-onboarding-desktop"/);
  assert.match(config, /grep: \/@owner-onboarding-desktop\//);
});

test("staging PR validation persists auditable runtime receipts for the required role/device matrix", () => {
  for (const receipt of [
    "owner-mobile.xml",
    "owner-desktop.xml",
    "roles-desktop.xml",
    "roles-mobile.xml",
    "super-admin-tablet.xml",
  ]) {
    assert.match(
      workflow,
      new RegExp(
        `PLAYWRIGHT_JUNIT_OUTPUT_FILE=test-results/browser-matrix/${receipt.replace(".", "\\.")}`,
      ),
    );
  }
  assert.match(workflow, /--project=tablet-chromium --reporter=list,junit/);
  assert.match(workflow, /- name: Verify browser runtime receipts/);
  assert.match(workflow, /\[\[ ! -s "\$receipt" \]\]/);
  assert.match(workflow, /grep -Eq '<testcase\[ >\]' "\$receipt"/);
  assert.match(workflow, /uses: actions\/upload-artifact@v4/);
  assert.match(
    workflow,
    /if: always\(\) && steps\.browser-smoke\.outputs\.run == 'true'/,
  );
  assert.match(workflow, /path: test-results\/browser-matrix\/\*\.xml/);
  assert.match(workflow, /if-no-files-found: error/);
});