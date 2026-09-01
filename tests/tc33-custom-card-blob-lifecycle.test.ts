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
  assert.match(manager, /Create Front \+ Back draft/);
  assert.match(manager, /name="customCardFrontFile"/);
  assert.match(manager, /name="customCardBackFile"/);
  assert.match(manager, /Draft preview/);
  assert.match(manager, /Publish this Front \+ Back pair/);
  assert.match(manager, /ConfirmedSubmitButton/);
  assert.match(manager, /data-testid="custom-card-retained-library"/);
  assert.match(manager, /Every saved Front \+ Back pair remains reusable/);
  assert.match(
    manager,
    /currently published customer card does not change[\s\S]*?publishing is confirmed/i,
  );
  assert.doesNotMatch(manager, /Safe generated Back|optional Back|uploadCustomBack/);
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

test("TC3.3 does not introduce schema, deletion or production behavior", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  assert.doesNotMatch(storage + actions, /vercel\s+--prod|deploy\s+--prod/);
  assert.doesNotMatch(storage + actions, /prisma\.\$executeRaw|prisma\.\$queryRaw/);
  assert.match(schema, /customCardFrontArtworkUrl\s+String\?/);
  assert.match(schema, /customCardBackArtworkUrl\s+String\?/);
});
