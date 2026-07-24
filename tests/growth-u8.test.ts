import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { getWinBackAudienceWhere } from "../lib/campaigns/winback";
import { canPerform } from "../lib/permissions";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");
const growthNav = source("components/growth/growth-navigation.tsx");
const shell = source("components/growth/growth-shell.tsx");
const pages = ["rewards", "offers", "campaigns", "recovery"].map((area) => source(`app/businesses/[slug]/${area}/page.tsx`));

test("U8 has one accessible Growth navigation with distinct slug-preserving routes", () => {
  assert.match(growthNav, /data-growth-navigation/);
  for (const area of ["rewards", "offers", "campaigns", "recovery"]) {
    assert.match(growthNav, new RegExp(`area: "${area}"`));
  }
  assert.match(growthNav, /href=\{`\/businesses\/\$\{slug\}\/\$\{area\}`\}/);
  assert.match(growthNav, /aria-current/);
  assert.equal(new Set(pages).size, 4);
});

test("U8 experience mode remains presentation-only and keeps authorization authoritative", () => {
  for (const page of pages) {
    assert.match(page, /resolveExperienceMode/);
  }
  assert.match(shell, /data-experience-growth/);
  assert.match(source("app/businesses/[slug]/rewards/actions.ts"), /canManageBusiness/);
  assert.match(source("app/businesses/[slug]/offers/actions.ts"), /canManageBusiness/);
  assert.match(source("app/businesses/[slug]/campaigns/page.tsx"), /canManageBusiness/);
  assert.match(source("app/businesses/[slug]/recovery/export/route.ts"), /canExportBusinessData/);
  assert.doesNotMatch(source("lib/permissions.ts"), /ExperienceMode|experienceMode/);
  assert.equal(canPerform({ role: "VIEWER", businessId: "tenant-a" }, "tenant-a", "LOYALTY_REDEEM"), false);
});

test("U8 keeps tenant-scoped engines, Scan operations, deterministic recovery, and protected export", () => {
  assert.match(source("app/businesses/[slug]/rewards/actions.ts"), /businessId: business\.id/);
  assert.match(source("app/businesses/[slug]/offers/actions.ts"), /businessId: business\.id/);
  assert.match(source("app/businesses/[slug]/recovery/page.tsx"), /businessId: business\.id/);
  assert.match(source("app/businesses/[slug]/campaigns/page.tsx"), /businessId: business\.id/);
  assert.match(source("app/businesses/[slug]/recovery/page.tsx"), /getWinBackAudienceWhere/);
  const inactiveWhere = getWinBackAudienceWhere("INACTIVE", { rewardThreshold: 5, earnAmount: 1, now: new Date("2026-07-24") });
  assert.ok("OR" in inactiveWhere, "recovery audience is derived by the deterministic segment engine");
  assert.match(source("app/businesses/[slug]/scan/customer/[customerId]/page.tsx"), /redeemRewardAction/);
  assert.match(source("app/businesses/[slug]/scan/customer/[customerId]/page.tsx"), /operationOrigin" value="SCAN"/);
  assert.match(source("app/businesses/[slug]/recovery/export/route.ts"), /canExportBusinessData/);
});

test("U8 uses truthful campaign language and responsive bilingual accessible foundations", () => {
  const campaign = source("components/campaign-builder.tsx");
  assert.match(campaign, /No campaign is saved and no message is sent automatically/);
  assert.match(campaign, /WhatsApp draft/);
  assert.doesNotMatch(campaign, />[^<]*(Sent|Delivered)[^<]*</);
  assert.match(shell, /language === "AR" \? "rtl" : "ltr"/);
  assert.match(source("lib/growth/ui-copy.ts"), /AR:/);
  assert.match(source("lib/growth/ui-copy.ts"), /EN:/);
  assert.match(growthNav, /overflow-x-auto/);
  assert.match(shell, /focus-visible/);
  assert.match(source("app/businesses/[slug]/rewards/page.tsx"), /No rewards have been added yet/);
  assert.match(source("app/businesses/[slug]/offers/page.tsx"), /No offers yet/);
  assert.match(source("app/businesses/[slug]/recovery/page.tsx"), /There are no customers/);
});

test("U8 introduces no Prisma or migration dependency", () => {
  const changedForbidden = ["prisma/schema.prisma", "package.json"];
  for (const path of changedForbidden) assert.equal(source(path).includes("U8"), false);
  assert.doesNotMatch(source("app/businesses/[slug]/rewards/page.tsx"), /prisma\.\$transaction/);
  assert.match(source("app/businesses/[slug]/rewards/page.tsx"), /createRewardAction/);
  assert.match(source("app/businesses/[slug]/recovery/page.tsx"), /calculateRewardProgress/);
});
