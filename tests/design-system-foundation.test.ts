import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("U2 exposes semantic application color, type, size, motion, and chart tokens", () => {
  const css = source("app/globals.css");
  for (const token of [
    "--lf-canvas", "--lf-surface", "--lf-surface-subtle", "--lf-surface-raised",
    "--lf-foreground", "--lf-foreground-muted", "--lf-foreground-subtle", "--lf-inverse",
    "--lf-border", "--lf-border-strong", "--lf-divider", "--lf-primary", "--lf-primary-hover", "--lf-primary-active", "--lf-primary-foreground",
    "--lf-space-4", "--lf-radius-md", "--lf-shadow-raised", "--lf-motion-fast", "--lf-chart-1",
  ]) assert.match(css, new RegExp(token));
});

test("U2 status, focus, selection, and reduced-motion semantics are explicit", () => {
  const css = source("app/globals.css");
  for (const token of ["--lf-success", "--lf-success-subtle", "--lf-warning", "--lf-warning-subtle", "--lf-danger", "--lf-danger-subtle", "--lf-info", "--lf-info-subtle", "--lf-focus", "--lf-selection", "--lf-disabled"]) assert.match(css, new RegExp(token));
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});

test("application state semantics remain separate from the business branding boundary", () => {
  const css = source("app/globals.css");
  assert.match(css, /\.lf-business-context/);
  assert.match(css, /--lf-business-primary/);
  assert.doesNotMatch(css, /--lf-business-danger/);
  assert.doesNotMatch(css, /--lf-business-success/);
  assert.doesNotMatch(css, /--lf-business-focus/);
});

test("new primitives use direction-safe layout and expose required accessibility hooks", () => {
  const files = ["button.tsx", "form-controls.tsx", "table.tsx", "navigation.tsx", "dialog.tsx", "toolbar.tsx"].map((file) => source(`components/ui/${file}`)).join("\n");
  assert.doesNotMatch(files, /dir=["']rtl["']/);
  assert.doesNotMatch(files, /\b(?:ml|mr|left|right)-/);
  for (const attribute of ["aria-label", "aria-disabled", "aria-busy", "aria-describedby", "aria-modal", "aria-labelledby", "aria-sort", "aria-selected"]) assert.match(files, new RegExp(attribute));
});

test("U2 has no schema or migration changes", () => {
  const tracked = execFileSync("git", ["diff", "--name-only"], { cwd: root, encoding: "utf8" });
  const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" });
  const changed = `${tracked}\n${untracked}`.split("\n").filter(Boolean);
  assert.equal(changed.some((path) => path === "prisma/schema.prisma" || path.startsWith("prisma/migrations/")), false);
});
