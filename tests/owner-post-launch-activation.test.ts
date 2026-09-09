import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => readFileSync(path.join(root, file), "utf8");

test("successful Owner launch continues into the first-customer activation path", () => {
  const onboardingAction = source("app/onboarding/actions.ts");
  const launchSuccessPage = source(
    "app/businesses/[slug]/launch-success/page.tsx",
  );
  const joinQr = source("components/primary-business-join-qr.tsx");

  assert.match(
    onboardingAction,
    /redirect\(`\/businesses\/\$\{business\.slug\}\/launch-success\?sheetSync=pending`\)/,
  );
  assert.match(launchSuccessPage, /data-owner-launch-success/);
  assert.match(launchSuccessPage, /canManageBusiness\(user, business\.id\)/);
  assert.match(launchSuccessPage, /<PrimaryBusinessJoinQr/);
  assert.match(launchSuccessPage, /sheetSync=pending/);
  assert.match(joinQr, /businessJoinPath\(slug\)/);
  assert.match(joinQr, /<CopyLinkButton/);
  assert.match(joinQr, /Open join page/);
});
