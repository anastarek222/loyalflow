import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { conversionMessages } from "@loyalflow/i18n/conversion";
import { messages, translate } from "@/lib/i18n/catalog";

const root = process.cwd();
const source = (file: string) => readFileSync(join(root, file), "utf8");

test("TC2.8 keeps conversion AR/EN keys in exact parity", () => {
  assert.deepEqual(
    Object.keys(conversionMessages.ar).sort(),
    Object.keys(conversionMessages.en).sort(),
  );
  assert.equal(Object.keys(conversionMessages.en).length, 14);
});

test("TC2.8 compatibility catalog composes conversion values from the package", () => {
  for (const key of Object.keys(conversionMessages.en)) {
    const messageKey = key as keyof typeof conversionMessages.en;
    assert.equal(messages.en[messageKey], conversionMessages.en[messageKey]);
    assert.equal(messages.ar[messageKey], conversionMessages.ar[messageKey]);
    assert.equal(translate("en", messageKey), conversionMessages.en[messageKey]);
    assert.equal(translate("ar", messageKey), conversionMessages.ar[messageKey]);
  }

  const catalog = source("lib/i18n/catalog.ts");
  assert.match(
    catalog,
    /import \{ conversionMessages \} from "@loyalflow\/i18n\/conversion"/,
  );
  assert.match(catalog, /\.\.\.conversionMessages\.en/);
  assert.match(catalog, /\.\.\.conversionMessages\.ar/);
  assert.doesNotMatch(catalog, /"conversion\.[A-Za-z]+"\s*:/);
});

test("TC2.8 keeps get-started inside the public Trial acquisition boundary", () => {
  const page = source("app/get-started/page.tsx");
  assert.match(page, /PUBLIC_ACQUISITION_MODE/);
  assert.match(page, /PublicTrialForm/);
  assert.match(page, /startPublicTrialAction/);
  assert.match(page, /href="\/login"/);
  assert.doesNotMatch(page, /href="\/accept-owner-invitation"/);
  assert.doesNotMatch(page, /href="\/(?:signup|checkout|pricing)"/);
  assert.match(page, /conversion\.invitedBody/);
  assert.match(page, /conversion\.noSignup/);
});
