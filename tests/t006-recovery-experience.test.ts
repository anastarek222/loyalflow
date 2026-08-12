import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

const recovery = source("app/businesses/[slug]/recovery/page.tsx");
const exportRoute = source("app/businesses/[slug]/recovery/export/route.ts");
const winBack = source("lib/campaigns/winback.ts");

test("T006 Recovery workspace preserves management and plan authorization", () => {
  assert.match(recovery, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(
    recovery,
    /hasFeatureEntitlement\(business\.plan, "CAMPAIGNS"\)/,
  );
  assert.match(recovery, /resolveExperienceMode\(/);
  assert.match(
    recovery,
    /canExportBusinessData\([\s\S]{0,120}session\.user,[\s\S]{0,80}business\.id,[\s\S]{0,100}business\.allowOwnerDataExport/,
  );
  assert.doesNotMatch(
    recovery,
    /prisma\.(?:customer|businessActivity)\.(?:create|update|delete)|prisma\.\$transaction/,
  );
});

test("T006 Recovery queue keeps deterministic tenant scope, ordering, and bounds", () => {
  assert.match(recovery, /winBackAudiences\.includes\(/);
  assert.match(recovery, /: "INACTIVE"/);
  assert.match(
    recovery,
    /businessId: business\.id,[\s\S]{0,120}getWinBackAudienceWhere\(audience/,
  );
  assert.match(
    recovery,
    /orderBy: \[\{ updatedAt: "asc" \}, \{ id: "asc" \}\]/,
  );
  assert.match(recovery, /take: 100/);
  assert.match(recovery, /getRewardAvailability\(/);
  assert.match(recovery, /getWinBackMessage\(/);
  assert.match(
    recovery,
    /cardLink: `\$\{baseUrl\}\/card\/\$\{customer\.publicToken\}`/,
  );
});

test("T006 Win-back engine remains a pure adapter over canonical segmentation and templates", () => {
  assert.match(
    winBack,
    /return getCustomerSegmentWhere\([\s\S]{0,160}audience,[\s\S]{0,80}input\.rewardThreshold,[\s\S]{0,80}input\.now,[\s\S]{0,80}input\.earnAmount/,
  );
  assert.match(winBack, /renderWhatsAppTemplate\(/);
  assert.match(winBack, /input\.template\?\.trim\(\) \|\| WIN_BACK_TEMPLATE/);
  assert.doesNotMatch(winBack, /prisma\.|fetch\(|sendMessage|deliveryStatus/);
});

test("T006 Recovery export retains permission, entitlement, tenant, and CSV-injection protections", () => {
  assert.match(exportRoute, /canExportBusinessData\(/);
  assert.match(
    exportRoute,
    /hasFeatureEntitlement\(business\.plan, "CAMPAIGNS"\)/,
  );
  assert.match(
    exportRoute,
    /businessId: business\.id,[\s\S]{0,120}getWinBackAudienceWhere\(audience/,
  );
  assert.match(exportRoute, /\/\^\[=\+\\-@\]\//);
  assert.match(exportRoute, /Content-Type": "text\/csv; charset=utf-8"/);
  assert.match(exportRoute, /Content-Disposition/);
});

test("T006 Recovery exposes the refreshed truthful manual-review workspace", () => {
  assert.match(recovery, /data-recovery-workspace="true"/);
  assert.match(recovery, /data-recovery-audience-picker="true"/);
  assert.match(recovery, /No campaign is saved, no message is sent/);
  assert.match(recovery, /Copy draft/);
  assert.match(recovery, /Open WhatsApp draft/);
  assert.match(recovery, /buildWhatsAppUrl\(customer\.phone, message\)/);
  assert.match(recovery, /target="_blank"/);
  assert.match(recovery, /rel="noreferrer"/);
  assert.doesNotMatch(
    recovery,
    /fetch\(|sendMessage|deliveryStatus|localStorage|sessionStorage/,
  );
});
