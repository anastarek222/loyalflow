import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => readFileSync(join(root, file), "utf8");

test("desktop sidebar stays viewport-sticky without changing mobile navigation", () => {
  const sidebar = source("components/app-sidebar.tsx");
  const layout = source("app/layout.tsx");
  const mobileBottom = source("components/mobile-bottom-navigation.tsx");
  const mobileSidebar = source("components/mobile-sidebar.tsx");

  assert.match(sidebar, /sticky top-0/);
  assert.match(sidebar, /h-screen/);
  assert.match(sidebar, /self-start/);
  assert.match(sidebar, /overflow-y-auto/);
  assert.match(layout, /overflow-x-clip/);

  assert.match(mobileBottom, /fixed inset-x-0 bottom-0/);
  assert.match(mobileBottom, /lg:hidden/);
  assert.match(mobileSidebar, /fixed inset-0/);
});
