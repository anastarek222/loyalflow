import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("advanced Customers desktop table scrolls instead of compressing columns", () => {
  const layout = read("app/businesses/[slug]/customers/layout.tsx");
  const css = read("app/businesses/[slug]/customers/customers-responsive.css");
  const page = read("app/businesses/[slug]/customers/page.tsx");

  assert.match(layout, /customers-responsive\.css/);
  assert.match(layout, /data-customers-route="true"/);

  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /min-width:\s*64rem/);
  assert.match(css, /white-space:\s*nowrap/);
  assert.match(css, /data-experience-customers="advanced"/);

  assert.match(page, /lg:block/);
  assert.match(page, /lg:hidden/);
});
