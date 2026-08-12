import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { commonMessages } from "@loyalflow/i18n/common";
import { messages, translate } from "@/lib/i18n/catalog";

test("TC2.1 keeps separately sourced common locale keys in parity", () => {
  assert.deepEqual(
    Object.keys(commonMessages.ar).sort(),
    Object.keys(commonMessages.en).sort(),
  );
  assert.equal(Object.keys(commonMessages.en).length, 9);
});

test("TC2.1 compatibility catalog retains every existing common value", () => {
  for (const key of Object.keys(commonMessages.en)) {
    const messageKey = key as keyof typeof commonMessages.en;

    assert.equal(messages.en[messageKey], commonMessages.en[messageKey]);
    assert.equal(messages.ar[messageKey], commonMessages.ar[messageKey]);
    assert.equal(translate("en", messageKey), commonMessages.en[messageKey]);
    assert.equal(translate("ar", messageKey), commonMessages.ar[messageKey]);
  }
});

test("TC2.1 legacy catalog is an adapter instead of a second common source", async () => {
  const source = await readFile(
    new URL("../lib/i18n/catalog.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import \{ commonMessages \} from "@loyalflow\/i18n\/common"/,
  );
  assert.match(source, /\.\.\.commonMessages\.en/);
  assert.match(source, /\.\.\.commonMessages\.ar/);
  assert.doesNotMatch(source, /"common\.[A-Za-z]+"\s*:/);
});
