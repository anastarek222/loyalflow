import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

test("public card installs use separate full-bleed and mask-safe business icons", () => {
  const icon = source("app/api/card-icon/[token]/route.tsx");
  const manifest = source("app/api/card-manifest/[token]/route.ts");
  const page = source("app/card/[token]/page.tsx");

  assert.match(icon, /requestedSize === "180"/);
  assert.match(icon, /searchParams\.get\("purpose"\) === "maskable"/);
  assert.match(icon, /const logoFrameSize = maskable \? scaled\(390\) : iconSize/);
  assert.match(icon, /objectFit: maskable \? 'contain' : 'cover'/);
  assert.match(icon, /padding: "0"/);

  assert.match(manifest, /size=192&purpose=any/);
  assert.match(manifest, /size=512&purpose=any/);
  assert.match(manifest, /size=192&purpose=maskable/);
  assert.match(manifest, /size=512&purpose=maskable/);
  assert.doesNotMatch(manifest, /purpose: "any maskable"/);

  assert.match(page, /apple: `\/api\/card-icon\/\$\{token\}\?size=180&purpose=any`/);
  assert.match(page, /object-cover shadow-sm/);
  assert.doesNotMatch(page, /object-contain p-1\.5 shadow-sm/);
});
