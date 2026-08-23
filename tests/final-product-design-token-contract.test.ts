import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => readFileSync(join(root, file), "utf8");

test("Final Product primitives inherit the canonical LoyalFlow semantic theme", () => {
  const aliases = source("app/loyalflow-theme-aliases.css");
  const layout = source("app/layout.tsx");
  const button = source("components/ui/button.tsx");
  const controls = source("components/ui/form-controls.tsx");

  assert.match(layout, /import "\.\/globals\.css";/);
  assert.match(layout, /import "\.\/loyalflow-theme-aliases\.css";/);

  assert.match(aliases, /--lf-radius-input:\s*var\(--lf-radius-md\)/);
  assert.match(aliases, /--primary:\s*var\(--lf-primary\)/);
  assert.match(aliases, /--primary-foreground:\s*var\(--lf-primary-foreground\)/);
  assert.match(aliases, /--background:\s*var\(--lf-canvas\)/);
  assert.match(aliases, /--card:\s*var\(--lf-surface\)/);
  assert.match(aliases, /--border:\s*var\(--lf-border\)/);
  assert.match(aliases, /--ring:\s*var\(--lf-focus\)/);
  assert.match(aliases, /--sidebar-primary:\s*var\(--lf-primary\)/);
  assert.match(aliases, /--chart-1:\s*var\(--lf-chart-1\)/);

  assert.match(button, /bg-primary/);
  assert.match(controls, /var\(--lf-radius-input\)/);
});

test("Final Product theme aliases do not introduce an independent literal palette", () => {
  const aliases = source("app/loyalflow-theme-aliases.css");

  assert.doesNotMatch(aliases, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(aliases, /oklch\(/);
});
