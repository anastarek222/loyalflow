import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("Stage 13 public-card unavailable state is understandable in AR and EN", () => {
  const page = source("app/card/[token]/page.tsx");
  const notFoundState = source("app/card/[token]/not-found.tsx");
  const shell = source("components/public/public-state-shell.tsx");
  const directionText = source("components/i18n/direction-text.tsx");

  assert.match(page, /notFound\(\)/);
  assert.match(notFoundState, /البطاقة غير متاحة/);
  assert.match(notFoundState, /بطاقة الولاء هذه غير متاحة أو أن الرابط لم يعد صالحًا/);
  assert.match(notFoundState, /Card unavailable/);
  assert.match(
    notFoundState,
    /This loyalty card is unavailable or the link is no longer valid/,
  );
  assert.match(notFoundState, /<PublicStateShell/);
  assert.match(shell, /<DirectionText en=\{titleEn\} ar=\{titleAr\} \/>/);
  assert.match(directionText, /className="rtl:hidden"/);
  assert.match(directionText, /className="hidden rtl:inline"/);
});

test("Stage 13 public-card unavailable localization remains presentation-only", () => {
  const notFoundState = source("app/card/[token]/not-found.tsx");

  assert.doesNotMatch(notFoundState, /prisma|redirect|cookies|headers|Server Action/);
});
