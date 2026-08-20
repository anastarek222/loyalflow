import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("customer financial recovery shortcuts stay in normal flow on mobile", () => {
  const layout = read(
    "app/businesses/[slug]/customers/[customerId]/layout.tsx",
  );

  assert.match(layout, /data-customer-reversal-actions="true"/);
  assert.match(layout, /lg:fixed/);
  assert.match(layout, /lg:bottom-5/);
  assert.match(layout, /lg:end-5/);
  assert.doesNotMatch(layout, /className="fixed bottom-5 end-5 z-40/);
});

test("closed mobile navigation is not mounted or keyboard-focusable", () => {
  const sidebar = read("components/mobile-sidebar.tsx");

  assert.match(sidebar, /if \(!open\) return null;/);
  assert.match(sidebar, /aria-modal="true"/);
  assert.match(sidebar, /document\.body\.style\.overflow = "hidden"/);
  assert.match(sidebar, /previousFocus\?\.focus\(\)/);
  assert.doesNotMatch(sidebar, /open \? "translate-x-0"/);
});
