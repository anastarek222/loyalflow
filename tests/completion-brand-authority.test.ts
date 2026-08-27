import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("desktop and mobile application shells consume the central platform brand", () => {
  for (const path of [
    "components/app-sidebar.tsx",
    "components/mobile-sidebar.tsx",
  ]) {
    const shell = source(path);
    assert.match(shell, /import \{ platformBrand \} from "@\/lib\/platform-brand"/);
    assert.match(
      shell,
      /import \{ PlatformBrandIdentity \} from "@\/components\/platform-brand-identity"/,
    );
    assert.match(shell, /<PlatformBrandIdentity/);
    assert.match(shell, /platformBrand\.name/);
    assert.doesNotMatch(shell, />LoyalFlow</);
  }
});

test("transactional auth emails consume the same central brand name", () => {
  for (const path of [
    "lib/auth/owner-invitation-email.ts",
    "lib/auth/password-reset-email.ts",
    "lib/auth/email-verification-email.ts",
  ]) {
    const email = source(path);
    assert.match(email, /import \{ platformBrand \} from "@\/lib\/platform-brand"/);
    assert.match(email, /platformBrand\.name/);
    assert.doesNotMatch(email, /["'`]LoyalFlow/);
    assert.match(email, /sendResendAuthEmail/);
    assert.match(email, /createAuthEmailIdempotencyKey/);
  }
});
