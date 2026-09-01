import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(
  join(process.cwd(), "components/standard-card-setup.tsx"),
  "utf8",
);

test("mobile card editor keeps a compact preview control reachable while editing", () => {
  assert.match(
    source,
    /const \[mobilePreviewOpen, setMobilePreviewOpen\] = useState\(false\)/,
  );
  assert.match(source, /data-testid="standard-card-mobile-preview-shell"/);
  assert.match(source, /className="order-1 sticky top-2 z-20 min-w-0 self-start xl:order-2 xl:top-6"/);
  assert.match(source, /data-testid="standard-card-mobile-preview-toggle"/);
  assert.match(source, /aria-expanded=\{mobilePreviewOpen\}/);
  assert.match(source, /aria-controls="standard-card-preview-body"/);
  assert.match(source, /className="shrink-0[^\n]+xl:hidden"/);
});

test("preview body collapses on phones but remains visible on desktop", () => {
  assert.match(source, /id="standard-card-preview-body"/);
  assert.match(source, /data-testid="standard-card-preview-body"/);
  assert.match(
    source,
    /className=\{`\$\{mobilePreviewOpen \? "block" : "hidden"\} xl:block`\}/,
  );
  assert.match(source, /data-testid="standard-card-preview-container"/);
  assert.match(source, /<LoyaltyCard[\s\S]*?side=\{side\}/);
});

test("mobile accessibility no longer depends on an xl-only sticky preview", () => {
  assert.doesNotMatch(source, /xl:sticky xl:top-6 xl:self-start/);
});
