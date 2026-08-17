import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const page = source("app/businesses/[slug]/settings/page.tsx");
const boundedAction = source(
  "app/businesses/[slug]/settings/export-permission-action.ts",
);

test("TC5 Settings page binds export permission to the command-backed action", () => {
  assert.match(
    page,
    /import \{ updateBusinessExportPermissionCommandAction \} from "\.\/export-permission-action"/,
  );
  assert.match(
    page,
    /action=\{updateBusinessExportPermissionCommandAction\.bind\(/,
  );
  assert.doesNotMatch(
    page,
    /updateBusinessExportPermissionAction/,
  );
});

test("TC5 active export permission action remains persistence-free", () => {
  assert.match(boundedAction, /updateBusinessExportPermissionCommand\(/);
  assert.doesNotMatch(boundedAction, /prisma\.\$transaction/);
  assert.doesNotMatch(boundedAction, /transaction\.business\.update/);
  assert.doesNotMatch(boundedAction, /businessActivity\.create/);
});
