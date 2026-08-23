import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("public card exposes both protected card sides without moving data access client-side", () => {
  const page = source("app/card/[token]/page.tsx");
  const viewer = source(
    "components/customer-experience/public-loyalty-card-viewer.tsx",
  );

  assert.match(page, /PublicLoyaltyCardViewer/);
  assert.match(page, /qrCode=\{qrCode\}/);
  assert.match(viewer, /useState<"front" \| "back">/);
  assert.match(viewer, /<LoyaltyCard/);
  assert.match(viewer, /side=\{side\}/);
  assert.doesNotMatch(viewer, /prisma|publicToken|findUnique/);
});

test("public card shell and controls keep the expanded responsive experience", () => {
  const shell = source("components/customer-experience/public-page-shell.tsx");
  const actions = source(
    "components/customer-experience/public-card-actions.tsx",
  );

  assert.match(shell, /max-w-3xl/);
  assert.match(shell, /safe-area-inset/);
  assert.match(actions, /navigator\.share/);
  assert.match(actions, /navigator\.clipboard/);
  assert.match(actions, /beforeinstallprompt/);
  assert.match(actions, /primaryColor/);
});

test("canonical standard and custom card renderers remain untouched by the viewer", () => {
  const viewer = source(
    "components/customer-experience/public-loyalty-card-viewer.tsx",
  );
  const canonical = source("components/loyalty-card.tsx");

  assert.match(viewer, /import \{[\s\S]*LoyaltyCard/);
  assert.match(canonical, /CustomLoyaltyCard/);
  assert.match(canonical, /StandardLoyaltyCard/);
});
