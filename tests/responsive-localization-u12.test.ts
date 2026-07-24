import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("U12 keeps direction owned by saved authenticated and public context", () => {
  const authenticated = source("components/authenticated-locale-shell.tsx");
  const card = source("app/card/[token]/page.tsx");
  const joinPage = source("app/join/[slug]/page.tsx");
  assert.match(authenticated, /getLanguageAttributes\(user\?\.language\)/);
  assert.match(authenticated, /dir=\{dir\}/);
  for (const page of [card, joinPage]) assert.match(page, /getLanguageAttributes/);
  assert.doesNotMatch(authenticated, /navigator\.language|window\.navigator/);
});

test("U12 shared navigation and mobile controls retain accessible responsive foundations", () => {
  const shell = source("components/authenticated-app-shell.tsx");
  const sidebar = source("components/mobile-sidebar.tsx");
  const bottomNavigation = source("components/mobile-bottom-navigation.tsx");
  assert.match(shell, /Skip to content|الانتقال إلى المحتوى/);
  assert.match(sidebar, /aria-modal="true"/);
  assert.match(sidebar, /event\.key !== "Tab"/);
  assert.match(sidebar, /aria-current=/);
  assert.match(bottomNavigation, /aria-current=/);
  assert.match(sidebar, /start-0/);
  assert.doesNotMatch(sidebar, /\b(?:left|right)-0/);
});

test("U12 primitives keep bounded dialogs, tables, motion, and long-content safety", () => {
  const css = source("app/globals.css");
  const dialog = source("components/ui/dialog.tsx");
  const table = source("components/ui/table.tsx");
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(dialog, /max-h-\[calc\(100dvh-2rem\)\]/);
  assert.match(dialog, /overflow-y-auto/);
  assert.match(table, /overflow-x-auto/);
  assert.match(table, /aria-busy="true"/);
});

test("U12 public card controls expose names and announced feedback without a new shell", () => {
  const actions = source("components/customer-experience/public-card-actions.tsx");
  const appShell = source("components/authenticated-app-shell.tsx");
  assert.match(actions, /aria-label=\{copy\.share\}/);
  assert.match(actions, /aria-label=\{copy\.copyLink\}/);
  assert.match(actions, /aria-live="polite"/);
  assert.match(actions, /min-h-11/);
  assert.match(appShell, /AppSidebar/);
  assert.doesNotMatch(appShell, /className="[^"]*lf-business-context[^"]*"/);
});

test("U12 remains presentation-only and introduces no persistence or API changes", () => {
  const changedUiFiles = [
    "app/globals.css",
    "components/mobile-sidebar.tsx",
    "components/redeem-reward-dialog.tsx",
    "components/customer-experience/public-card-actions.tsx",
    "components/ui/table.tsx",
  ].map(source).join("\n");
  assert.doesNotMatch(changedUiFiles, /prisma\.|from "@\/generated\/prisma|fetch\(\s*["']\/api/);
  const switcher = source("components/experience-mode-switcher.tsx");
  assert.match(switcher, /aria-pressed=\{selected\}/);
  assert.doesNotMatch(switcher, /canPerform|prisma\.|fetch\(/);
});
