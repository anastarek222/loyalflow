import assert from "node:assert/strict";
import test from "node:test";

import { getPublicSupportChannels } from "../lib/marketing/public-support-channels";

test("public support channels are absent until explicitly configured", () => {
  assert.deepEqual(getPublicSupportChannels({}), []);
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
