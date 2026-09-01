import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { OWNER_PUBLIC_IDENTITY } from "../lib/marketing/owner-public-identity";
import { getPublicSupportChannels } from "../lib/marketing/public-support-channels";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("public support channels are absent until explicitly configured", () => {
  assert.deepEqual(getPublicSupportChannels({}), []);
});

test("approved Owner support identity resolves to email and phone only", () => {
  assert.deepEqual(
    getPublicSupportChannels({
      NEXT_PUBLIC_SUPPORT_EMAIL: OWNER_PUBLIC_IDENTITY.support.email,
      NEXT_PUBLIC_SUPPORT_PHONE: OWNER_PUBLIC_IDENTITY.support.phone,
    }),
    [
      {
        kind: "email",
        displayValue: "loyaltyy.programme@gmail.com",
        href: "mailto:loyaltyy.programme@gmail.com",
      },
      {
        kind: "phone",
        displayValue: "+201212312746",
        href: "tel:+201212312746",
      },
    ],
  );
});

test("public support channels normalize approved values", () => {
  assert.deepEqual(
    getPublicSupportChannels({
      NEXT_PUBLIC_SUPPORT_EMAIL: " Support@LoyalFlow.example ",
      NEXT_PUBLIC_SUPPORT_WHATSAPP: "+20 100-123-4567",
      NEXT_PUBLIC_SUPPORT_PHONE: "+1 (416) 555-0199",
    }),
    [
      {
        kind: "email",
        displayValue: "support@loyalflow.example",
        href: "mailto:support@loyalflow.example",
      },
      {
        kind: "whatsapp",
        displayValue: "+201001234567",
        href: "https://wa.me/201001234567",
      },
      {
        kind: "phone",
        displayValue: "+14165550199",
        href: "tel:+14165550199",
      },
    ],
  );
});

test("invalid public support values fail closed", () => {
  assert.deepEqual(
    getPublicSupportChannels({
      NEXT_PUBLIC_SUPPORT_EMAIL: "javascript:alert(1)",
      NEXT_PUBLIC_SUPPORT_WHATSAPP: "wa.me/not-a-number",
      NEXT_PUBLIC_SUPPORT_PHONE: "+00000000",
    }),
    [],
  );
});

test("Contact support authority consumes the Owner public identity defaults", () => {
  const authority = source("lib/marketing/public-support-channels.ts");

  assert.match(authority, /OWNER_PUBLIC_IDENTITY\.support\.email/);
  assert.match(authority, /OWNER_PUBLIC_IDENTITY\.support\.phone/);
  assert.doesNotMatch(authority, /OWNER_PUBLIC_IDENTITY\.support\.whatsapp/);
});
