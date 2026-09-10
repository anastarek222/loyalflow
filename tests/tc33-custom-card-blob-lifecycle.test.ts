import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storage = readFileSync("lib/cards/custom-card-storage.ts", "utf8");
const uploadValidation = readFileSync(
  "lib/cards/custom-card-upload-validation.ts",
  "utf8",
);
const actions = readFileSync(
  "app/businesses/[slug]/settings/actions.ts",
  "utf8",
);
const manager = readFileSync(
  "components/custom-card-artwork-manager.tsx",
  "utf8",
);
const uploadForm = readFileSync(
  "components/custom-card-upload-form.tsx",
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

test("TC3.3 stores bounded custom artwork as immutable private Blob pairs", () => {
  assert.match(uploadValidation, /CUSTOM_CARD_MAX_FILE_BYTES = 4 \* 1024 \* 1024/);
  assert.match(uploadValidation, /CUSTOM_CARD_MAX_PAIR_BYTES = 4 \* 1024 \* 1024/);
  assert.match(uploadValidation, /"image\/png"/);
  assert.match(uploadValidation, /"image\/jpeg"/);
  assert.match(uploadValidation, /"image\/webp"/);
  assert.match(storage, /CUSTOM_CARD_MAX_FILE_BYTES/);
  assert.match(storage, /access: "private"/);
  assert.match(storage, /addRandomSuffix: false/);
  assert.match(storage, /allowOverwrite: false/);
  assert.match(storage, /custom-card\/\$\{businessId\}\/\$\{version\}\//);
  assert.match(storage, /Boolean\(value\.frontUrl && value\.backUrl\)/);
  assert.doesNotMatch(storage, /\bdel\s*\(/);
});

test("TC3.3 legacy Settings flow remains Super Admin only and fail closed", () => {
  assert.match(actions, /uploadCustomCardArtworkAction/);
  assert.match(actions, /publishCustomCardArtworkAction/);
  assert.match(actions, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(actions, /findCustomCardArtworkVersion\(business\.id, version\)/);
  assert.match(actions, /cardDesignMode: "CUSTOM"/);
  assert.match(actions, /customCardArtworkEnabled: true/);
});

test("TC3.3 Program manager uploads, previews and confirms one Front + Back pair", () => {
  assert.match(manager, /CustomCardUploadForm/);
  assert.match(uploadForm, /Create Front \+ Back draft/);
  assert.match(uploadForm, /name="customCardFrontFile"/);
  assert.match(uploadForm, /name="customCardBackFile"/);
  assert.match(manager, /Draft preview/);
  assert.match(manager, /Publish this Front \+ Back pair/);
  assert.match(manager, /ConfirmedSubmitButton/);
  assert.match(manager, /data-testid="custom-card-retained-library"/);
  assert.match(manager, /Every saved Front \+ Back pair remains reusable/);
  assert.match(
    manager,
    /currently published customer card does not change[\s\S]*?publishing is confirmed/i,
  );
  assert.doesNotMatch(manager + uploadForm, /Safe generated Back|optional Back|uploadCustomBack/);
});

test("TC3.3 private artwork routes derive access from trusted state", () => {
  assert.match(adminArtwork, /const session = await auth\(\)/);
  assert.match(adminArtwork, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(adminArtwork, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(publicArtwork, /isPublicCardToken\(token\)/);
  assert.match(publicArtwork, /where: \{ publicToken: token \}/);
  assert.match(publicArtwork, /customer\.business\.cardDesignMode !== "CUSTOM"/);
  assert.match(publicArtwork, /customCardArtworkEnabled/);
  assert.match(publicArtwork, /distributedRateLimit\(/);
  assert.doesNotMatch(publicArtwork, /tenantId|businessId.*searchParams/);
});

test("TC3.3 retained custom card library paginates beyond the first 100 Blob objects", () => {
  const listing = storage.slice(
    storage.indexOf("async function listAllCustomCardBlobs"),
    storage.indexOf("export async function findCustomCardArtworkVersion"),
  );
  assert.match(listing, /let cursor: string \| undefined/);
  assert.match(listing, /list\(\{ prefix, limit: 100, cursor \}\)/);
  assert.match(listing, /result\.hasMore \? result\.cursor : undefined/);
  assert.match(listing, /while \(cursor\)/);
  assert.match(listing, /blobs\.push\(\.\.\.result\.blobs\)/);
});

test("TC3.3 missing, corrupt and unavailable private Blob reads stay distinct", () => {
  const readback = storage.slice(
    storage.indexOf("export type CustomCardArtworkReadResult"),
  );
  assert.match(readback, /status: "ok"/);
  assert.match(readback, /status: "not-found"/);
  assert.match(readback, /status: "corrupt"/);
  assert.match(readback, /status: "unavailable"/);
  assert.match(readback, /managedBlobExists\(url\)/);
  assert.match(readback, /if \(!\(await managedBlobExists\(url\)\)\) return \{ status: "not-found" \}/);
  assert.match(readback, /const result = await get\(url, \{ access: "private" \}\)/);
  assert.match(readback, /result\.statusCode !== 200/);
  assert.match(readback, /validateCustomCardArtworkFile\(file\)/);
  assert.match(readback, /validateCustomCardArtworkGeometry\(file\)/);
  assert.match(readback, /return \{ status: "corrupt" \}/);
  assert.match(readback, /catch \{/);
  assert.match(readback, /return \{ status: "unavailable" \}/);
});

test("TC3.3 artwork routes expose controlled 404, 502 and 503 outcomes", () => {
  for (const route of [adminArtwork, publicArtwork]) {
    assert.match(route, /const artwork = await readPrivateCustomCardArtwork\(/);
    assert.match(route, /artwork\.status === "not-found"/);
    assert.match(route, /status: 404/);
    assert.match(route, /artwork\.status === "corrupt"/);
    assert.match(route, /status: 502/);
    assert.match(route, /artwork\.status === "unavailable"/);
    assert.match(route, /status: 503/);
    assert.match(route, /"X-Content-Type-Options": "nosniff"/);
  }
});

test("TC3.3 admin artwork readback rejects invalid side, version, or metadata as not found", () => {
  assert.match(adminArtwork, /!\["front", "back"\]\.includes\(side\)/);
  assert.match(adminArtwork, /findCustomCardArtworkVersion\(business\.id, version\)/);
  assert.match(
    adminArtwork,
    /if \(!url \|\| !isManagedCustomCardArtworkUrl\(url, business\.id\)\) \{[\s\S]*?status: 404/,
  );
});

test("TC3.3 does not introduce schema, deletion or production behavior", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  assert.doesNotMatch(storage + actions, /vercel\s+--prod|deploy\s+--prod/);
  assert.doesNotMatch(storage + actions, /prisma\.\$executeRaw|prisma\.\$queryRaw/);
  assert.match(schema, /customCardFrontArtworkUrl\s+String\?/);
  assert.match(schema, /customCardBackArtworkUrl\s+String\?/);
});
