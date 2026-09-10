import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  nextConfigSource,
  managerSource,
  uploadFormSource,
  confirmedSubmitSource,
  uploadActionSource,
  uploadCommandSource,
  backCommandSource,
  storageSource,
  uploadValidationSource,
] = await Promise.all([
  readFile("next.config.ts", "utf8"),
  readFile("components/custom-card-artwork-manager.tsx", "utf8"),
  readFile("components/custom-card-upload-form.tsx", "utf8"),
  readFile("components/confirmed-submit-button.tsx", "utf8"),
  readFile(
    "app/businesses/[slug]/program/custom-card-upload-action.ts",
    "utf8",
  ),
  readFile(
    "lib/server/business/custom-card-upload-command.ts",
    "utf8",
  ),
  readFile(
    "lib/server/business/custom-card-back-upload-command.ts",
    "utf8",
  ),
  readFile("lib/cards/custom-card-storage.ts", "utf8"),
  readFile("lib/cards/custom-card-upload-validation.ts", "utf8"),
]);

test("paired custom card Server Action stays below the hosting request ceiling", () => {
  assert.match(nextConfigSource, /bodySizeLimit:\s*["']4250kb["']/);
  assert.match(
    uploadValidationSource,
    /CUSTOM_CARD_MAX_PAIR_BYTES\s*=\s*4\s*\*\s*1024\s*\*\s*1024/,
  );
  assert.match(managerSource, /Maximum 4 MB total across Front \+ Back/);
  assert.match(uploadFormSource, /CUSTOM_CARD_MAX_PAIR_BYTES/);
  assert.match(uploadFormSource, /totalBytes\s*>\s*CUSTOM_CARD_MAX_PAIR_BYTES/);
  assert.match(uploadFormSource, /event\.preventDefault\(\)/);
});

test("custom card manager sends Front and Back through one client-guarded paired action", () => {
  assert.match(managerSource, /CustomCardUploadForm/);
  assert.match(managerSource, /action=\{uploadCustomArtwork\}/);
  assert.match(uploadFormSource, /action=\{action\}/);
  assert.match(uploadFormSource, /name="customCardFrontFile"/);
  assert.match(uploadFormSource, /name="customCardBackFile"/);
  assert.match(uploadFormSource, /required/);
  assert.doesNotMatch(managerSource + uploadFormSource, /uploadCustomBack/);

  assert.match(
    uploadActionSource,
    /front:\s*formData\.get\("customCardFrontFile"\)/,
  );
  assert.match(
    uploadActionSource,
    /back:\s*formData\.get\("customCardBackFile"\)/,
  );
  assert.match(uploadActionSource, /uploadCustomCardDraftCommand/);
});

test("custom card client guard rejects incomplete, unsupported, or oversized pairs before submission", () => {
  assert.match(uploadFormSource, /CUSTOM_CARD_ALLOWED_TYPES/);
  assert.match(
    uploadFormSource,
    /if \(!front \|\| !back \|\| !validateSelection\(\)\)/,
  );
  assert.match(uploadFormSource, /event\.preventDefault\(\)/);
  assert.match(uploadFormSource, /role="alert"/);
  assert.match(uploadFormSource, /Use PNG, JPEG, or WebP only\./);
  assert.match(uploadFormSource, /Front and Back together must not exceed 4 MB\./);
});

test("paired upload command validates both sides before immutable storage", () => {
  assert.match(
    uploadCommandSource,
    /validateCustomCardUploadPair\(/,
  );
  assert.match(uploadCommandSource, /const version = randomUUID\(\)/);
  assert.match(uploadCommandSource, /uploadCustomCardArtwork/);
});

test("custom card publish confirmation cancels the submit when approval is declined", () => {
  assert.match(managerSource, /ConfirmedSubmitButton/);
  assert.match(confirmedSubmitSource, /window\.confirm\(confirmMessage\)/);
  assert.match(confirmedSubmitSource, /event\.preventDefault\(\)/);
});

test("legacy separate Back upload fails closed", () => {
  assert.match(backCommandSource, /void input;/);
  assert.match(
    backCommandSource,
    /return \{ ok: false, reason: "INVALID_UPLOAD" \};/,
  );
  assert.doesNotMatch(backCommandSource, /findCustomCardArtworkVersion/);
  assert.doesNotMatch(backCommandSource, /readPrivateCustomCardArtwork/);
  assert.doesNotMatch(backCommandSource, /uploadCustomCardArtwork/);
});

test("custom card version IDs retain canonical UUID v4 shape", () => {
  assert.match(
    storageSource,
    /\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-4\[0-9a-f\]\{3\}-\[89ab\]\[0-9a-f\]\{3\}-\[0-9a-f\]\{12\}\$/,
  );
});
