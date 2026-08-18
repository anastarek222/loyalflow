import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storage = readFileSync("lib/cards/custom-card-storage.ts", "utf8");
const actions = readFileSync(
  "app/businesses/[slug]/settings/actions.ts",
  "utf8",
);
const manager = readFileSync(
  "components/custom-card-artwork-manager.tsx",
  "utf8",
);
const publicArtwork = readFileSync(
  "app/api/card-artwork/[token]/[side]/route.ts",
  "utf8",
);
const adminArtwork = readFileSync(
  "app/api/businesses/[slug]/custom-card-artwork/[version]/[side]/route.ts",
  "utf8",
);

test("TC3.3 stores bounded custom artwork as immutable private Blob versions", () => {
  assert.match(storage, /CUSTOM_CARD_MAX_FILE_BYTES = 4 \* 1024 \* 1024/);
  assert.match(storage, /"image\/png"/);
  assert.match(storage, /"image\/jpeg"/);
  assert.match(storage, /"image\/webp"/);
  assert.match(storage, /access: "private"/);
  assert.match(storage, /addRandomSuffix: false/);
  assert.match(storage, /allowOverwrite: false/);
  assert.match(storage, /custom-card\/\$\{businessId\}\/\$\{version\}\//);
  assert.doesNotMatch(storage, /\bdel\s*\(/);
});

test("TC3.3 upload and publish remain Super Admin only and fail closed", () => {
  assert.match(actions, /uploadCustomCardArtworkAction/);
  assert.match(actions, /publishCustomCardArtworkAction/);
  assert.match(actions, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(actions, /validateCustomCardArtwork\(front\)/);
  assert.match(actions, /validateCustomCardArtwork\(back\)/);
  assert.match(actions, /findCustomCardArtworkVersion\(business\.id, version\)/);
  assert.match(actions, /cardDesignMode: "CUSTOM"/);
  assert.match(actions, /customCardArtworkEnabled: true/);
});

test("TC3.3 separates upload, preview and explicit publish", () => {
  assert.match(manager, /Upload new draft version/);
  assert.match(manager, /Draft preview/);
  assert.match(manager, /Publish this version/);
  assert.match(manager, /Retained versions/);
  assert.match(manager, /currently\s+published card is unchanged until Publish/);
});

test("TC3.3 private artwork routes derive access from trusted state", () => {
  assert.match(adminArtwork, /const session = await auth\(\)/);
  assert.match(adminArtwork, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(adminArtwork, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(publicArtwork, /isPublicCardToken\(token\)/);
  assert.match(publicArtwork, /where: \{ publicToken: token \}/);
  assert.match(publicArtwork, /customer\.business\.cardDesignMode !== "CUSTOM"/);
  assert.match(publicArtwork, /customCardArtworkEnabled/);
  assert.match(publicArtwork, /rateLimit\(/);
  assert.doesNotMatch(publicArtwork, /tenantId|businessId.*searchParams/);
});

test("TC3.3 does not introduce schema, deletion or production behavior", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  assert.doesNotMatch(storage + actions, /vercel\s+--prod|deploy\s+--prod/);
  assert.doesNotMatch(storage + actions, /prisma\.\$executeRaw|prisma\.\$queryRaw/);
  assert.match(schema, /customCardFrontArtworkUrl\s+String\?/);
  assert.match(schema, /customCardBackArtworkUrl\s+String\?/);
});
