import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const finalUat = source("tests/browser/final-uat-u13.spec.ts");
const ownerUat = source("tests/browser/owner-onboarding-mobile.spec.ts");
const config = source("playwright.config.ts");

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

test("Owner Trial acquisition has an explicit desktop receipt in addition to the mobile onboarding receipt", () => {
  assert.match(ownerUat, /14-day Trial @owner-onboarding-desktop/);
  assert.match(config, /name: "owner-onboarding-desktop"/);
  assert.match(config, /grep: \/@owner-onboarding-desktop\//);
});
