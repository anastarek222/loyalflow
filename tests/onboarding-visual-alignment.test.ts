import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("owner onboarding shell uses the shared Tanee theme authority", () => {
  const page = source("app/onboarding/page.tsx");

  assert.match(page, /TANEE_UI_THEME_BOOTSTRAP/);
  assert.match(page, /<TaneeThemeSwitcher locale=\{locale\}/);
  assert.match(page, /data-testid="owner-onboarding-shell"/);
  assert.match(page, /bg-\[var\(--lf-canvas\)\]/);
  assert.doesNotMatch(page, /bg-\[var\(--lf-marketing-canvas\)\]/);
  assert.doesNotMatch(page, /rgb\(255_102_82|rgb\(168_71_36/);
});

test("owner onboarding wizard light-only surfaces are normalized through semantic tokens", () => {
  const foundation = source("app/frontend-foundation.css");

  assert.match(foundation, /form\[data-owner-step\] \{/);
  assert.match(foundation, /background-color: var\(--lf-surface\)/);
  assert.match(foundation, /form\[data-owner-step\] > div > aside/);
  assert.match(foundation, /var\(--lf-surface-subtle\)/);
  assert.match(foundation, /\[data-testid="owner-mobile-action-bar"\]/);
  assert.match(foundation, /color-mix\(in srgb, var\(--lf-surface\) 95%, transparent\)/);
  assert.match(foundation, /form\[data-owner-step\][\s\S]*var\(--lf-primary-foreground\)/);
});

test("optional WhatsApp onboarding card follows semantic product surfaces", () => {
  const card = source("components/owner-whatsapp-onboarding.tsx");

  assert.match(card, /data-testid="owner-whatsapp-onboarding"/);
  assert.match(card, /bg-surface/);
  assert.match(card, /shadow-\[var\(--lf-shadow-raised\)\]/);
  assert.doesNotMatch(card, /\bbg-white\b/);
});
