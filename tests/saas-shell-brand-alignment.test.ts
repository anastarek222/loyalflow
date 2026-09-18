import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("authenticated SaaS shell restores the shared Tanee theme authority", () => {
  const shell = source("components/authenticated-locale-shell.tsx");
  const topbar = source("components/app-topbar.tsx");

  assert.match(shell, /TANEE_UI_THEME_BOOTSTRAP/);
  assert.match(shell, /bg-canvas text-foreground/);
  assert.doesNotMatch(shell, /bg-slate-50/);
  assert.match(topbar, /data-testid="saas-theme-switcher"/);
  assert.match(topbar, /<TaneeThemeSwitcher locale=\{language === "AR" \? "ar" : "en"\} \/>/);
});

test("authenticated SaaS chrome keeps semantic primary contrast", () => {
  const appShell = source("components/authenticated-app-shell.tsx");
  const mobileNav = source("components/mobile-bottom-navigation.tsx");

  assert.match(appShell, /bg-primary[\s\S]*text-primary-foreground/);
  assert.doesNotMatch(appShell, /bg-primary[\s\S]*text-white/);
  assert.match(mobileNav, /bg-primary[\s\S]*text-primary-foreground/);
  assert.doesNotMatch(mobileNav, /bg-primary[\s\S]*text-white/);
});

test("desktop and mobile SaaS identities use the selectable Tanee treatment", () => {
  const desktop = source("components/app-sidebar.tsx");
  const mobile = source("components/mobile-sidebar.tsx");

  assert.match(desktop, /data-testid="desktop-saas-brand"/);
  assert.match(desktop, /<InlineTaneeName \/>/);
  assert.match(mobile, /data-testid="mobile-saas-brand"/);
  assert.match(mobile, /<InlineTaneeName \/>/);
});


test("authenticated SaaS shell keeps the hidden skip link inside the mobile viewport", () => {
  const appShell = source("components/authenticated-app-shell.tsx");

  assert.match(appShell, /focus:px-4 focus:py-2/);
  assert.doesNotMatch(
    appShell,
    /bg-primary px-4 py-2 font-semibold text-primary-foreground/,
  );
});
