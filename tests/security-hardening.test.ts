import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { getSafeImageDataUrl } from "@/lib/branding/image-data";
import { isPublicCardToken } from "@/lib/cards/public-token";
import { actionBooleanSchema, opaqueIdSchema } from "@/lib/validation/action-input";

const root = process.cwd();

function source(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("rejects malformed public-card route tokens before database lookup", () => {
  assert.equal(isPublicCardToken("ckz9s0x2a0001abcde1234567"), true);
  assert.equal(isPublicCardToken("%2Fcustomer"), false);
  assert.equal(isPublicCardToken("../customer"), false);
  assert.equal(isPublicCardToken("short"), false);
});

test("accepts only bounded canonical uploaded image data", () => {
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
  ]).toString("base64");
  const value = `data:image/png;base64,${png}`;

  assert.equal(getSafeImageDataUrl(value, 32), value);
  assert.equal(getSafeImageDataUrl("data:image/svg+xml;base64,PHN2Zz4=", 32), null);
  assert.equal(getSafeImageDataUrl(`data:image/png;base64,${png}x`, 32), null);
  assert.equal(getSafeImageDataUrl(value, 8), null);
});

test("validates opaque action identifiers and action-bound booleans", () => {
  assert.equal(opaqueIdSchema.safeParse("ckz9s0x2a0001abcde1234567").success, true);
  assert.equal(opaqueIdSchema.safeParse("../../other-tenant").success, false);
  assert.equal(actionBooleanSchema.safeParse(true).success, true);
  assert.equal(actionBooleanSchema.safeParse("true").success, false);
});

test("sensitive APIs enforce capability checks and public APIs are no-store", () => {
  const analytics = source("app/api/analytics/route.ts");
  const historical = source("app/api/analytics/historical-trends/route.ts");
  const card = source("app/api/card/[token]/route.ts");
  const manifest = source("app/api/card-manifest/[token]/route.ts");
  const icon = source("app/api/card-icon/[token]/route.tsx");

  assert.match(analytics, /canPerform\(session\.user, businessId, "REPORTS_VIEW"\)/);
  assert.match(historical, /canPerform\(session\.user, businessId, "REPORTS_VIEW"\)/);
  assert.match(card, /isPublicCardToken\(token\)/);
  assert.match(card, /Cache-Control", "no-store, max-age=0"/);
  assert.doesNotMatch(card, /recentTransactions:[\s\S]*id: t\.id/);
  assert.doesNotMatch(card, /offers[\s\S]*\.map\([\s\S]*id: offer\.id/);
  assert.match(manifest, /isPublicCardToken\(token\)/);
  assert.match(icon, /getSafeImageDataUrl/);
  assert.doesNotMatch(icon, /fetch\(/);
});

test("public self-registration never discloses an existing card token", () => {
  const joinAction = source("app/join/[slug]/actions.ts");

  assert.match(joinAction, /if \(existingCustomer\) \{/);
  assert.doesNotMatch(joinAction, /redirect\(`\/card\/\$\{existingCustomer\.publicToken\}`\)/);
});

test("deployment configuration keeps incremental protective headers", () => {
  const config = source("next.config.ts");

  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /Referrer-Policy/);
  assert.match(config, /Permissions-Policy/);
  assert.match(config, /frame-ancestors 'none'/);
});
