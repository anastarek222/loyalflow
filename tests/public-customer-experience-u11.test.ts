import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { calculateRewardProgress } from "@/lib/loyalty/progress";
import { isPublicCardToken } from "@/lib/cards/public-token";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("U11 retains one canonical public card and validates opaque tokens before lookup", () => {
  const page = source("app/card/[token]/page.tsx");
  const api = source("app/api/card/[token]/route.ts");
  assert.match(page, /AutoFlipMembershipCard/);
  assert.equal(isPublicCardToken("../../customer"), false);
  assert.equal(isPublicCardToken("short"), false);
  assert.match(api, /isPublicCardToken\(token\)/);
  assert.match(api, /publicToken: token/);
  assert.match(api, /isActive/);
});

test("U11 public projections stay bounded and omit staff-only CRM data", () => {
  const page = source("app/card/[token]/page.tsx");
  const api = source("app/api/card/[token]/route.ts");
  assert.match(page, /take: 3/);
  assert.match(api, /take: 5/);
  assert.doesNotMatch(page, /tagAssignments|notes:/);
  assert.doesNotMatch(api, /tagAssignments|notes:/);
  assert.match(api, /Cache-Control", "no-store, max-age=0"/);
});

test("U11 uses the canonical reward helper and programme-safe progress", () => {
  const card = source("components/auto-flip-membership-card.tsx");
  assert.match(card, /calculateRewardProgress\(balance, rewardThreshold\)/);
  assert.deepEqual(calculateRewardProgress(0, 5), { progress: 0, remaining: 5, rewardAvailable: false });
  assert.deepEqual(calculateRewardProgress(Number.POSITIVE_INFINITY, 5), { progress: 100, remaining: 0, rewardAvailable: true });
});

test("U11 QR, sharing and install are truthful presentation-only controls", () => {
  const page = source("app/card/[token]/page.tsx");
  const actions = source("components/customer-experience/public-card-actions.tsx");
  assert.match(page, /QRCode\.toDataURL\(cardUrl/);
  assert.match(page, /Stored QR style is presentation-only/);
  assert.match(actions, /navigator\.share/);
  assert.match(actions, /AbortError/);
  assert.match(actions, /navigator\.clipboard/);
  assert.match(actions, /beforeinstallprompt/);
  assert.match(actions, /appinstalled/);
  assert.doesNotMatch(actions, /offline synchronization|offline sync/i);
});

test("U11 manifest, enrollment and responsive foundations stay safe", () => {
  const manifest = source("app/api/card-manifest/[token]/route.ts");
  const join = source("app/join/[slug]/actions.ts");
  const shell = source("components/customer-experience/public-page-shell.tsx");
  const copy = source("lib/customer-experience/public-copy.ts");
  assert.match(manifest, /start_url:\s*\n\s*`\/card\/\$\{token\}`/);
  assert.match(manifest, /no-store, max-age=0/);
  assert.doesNotMatch(manifest, /process\.env/);
  assert.match(join, /rateLimit\(/);
  assert.match(join, /parseCustomerRegistration/);
  assert.match(join, /if \(existingCustomer\)/);
  assert.doesNotMatch(join, /existingCustomer\.publicToken/);
  assert.match(shell, /overflow-x-hidden/);
  assert.match(shell, /safe-area-inset/);
  assert.match(copy, /مشاركة الكارت/);
  assert.match(copy, /Share card/);
});
