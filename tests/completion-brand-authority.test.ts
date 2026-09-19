import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("desktop and mobile application shells share the inline Tanee name authority", () => {
  const desktopShell = source("components/app-sidebar.tsx");
  const mobileShell = source("components/mobile-sidebar.tsx");

  for (const shell of [desktopShell, mobileShell]) {
    assert.match(
      shell,
      /import \{ InlineTaneeName \} from "@\/components\/brand\/inline-tanee-name"/,
    );
    assert.match(shell, /<InlineTaneeName/);
    assert.doesNotMatch(shell, />LoyalFlow</);
  }

  assert.match(
    desktopShell,
    /import \{ PlatformBrandIdentity \} from "@\/components\/platform-brand-identity"/,
  );
  assert.match(desktopShell, /<PlatformBrandIdentity/);

  assert.match(mobileShell, /data-testid="mobile-saas-brand"/);
  assert.doesNotMatch(mobileShell, /PlatformBrandIdentity/);
  assert.doesNotMatch(mobileShell, /platformBrand\.name/);
  assert.match(mobileShell, /min-h-11 w-full[\s\S]*bg-surface[\s\S]*text-foreground/);
});

test("transactional auth emails consume the Tanee auth email brand authority", () => {
  for (const path of [
    "lib/auth/owner-invitation-email.ts",
    "lib/auth/password-reset-email.ts",
    "lib/auth/email-verification-email.ts",
  ]) {
    const email = source(path);
    assert.match(
      email,
      /import \{ TANEE_AUTH_EMAIL_BRAND \} from "@\/lib\/auth\/auth-email-sender"/,
    );
    assert.match(email, /TANEE_AUTH_EMAIL_BRAND/);
    assert.doesNotMatch(email, /platformBrand\.name/);
    assert.doesNotMatch(email, /["'`]LoyalFlow/);
    assert.match(email, /sendResendAuthEmail/);
    assert.match(email, /createAuthEmailIdempotencyKey/);
  }
});
