import assert from "node:assert/strict";
import test from "node:test";

import {
  getSuggestedWhatsAppTemplate,
  SUGGESTED_WHATSAPP_TEMPLATES,
  compileWhatsAppTemplateForMeta,
} from "../lib/whatsapp-templates";

test("all six WhatsApp events have bilingual editable suggested drafts", () => {
  const events = [
    "WELCOME",
    "BALANCE_UPDATED",
    "REWARD_READY",
    "REWARD_REDEEMED",
    "NEW_REWARD",
    "NEW_OFFER",
  ] as const;

  assert.deepEqual(Object.keys(SUGGESTED_WHATSAPP_TEMPLATES.AR), events);
  assert.deepEqual(Object.keys(SUGGESTED_WHATSAPP_TEMPLATES.EN), events);

  for (const language of ["AR", "EN"] as const) {
    for (const event of events) {
      const template = getSuggestedWhatsAppTemplate(language, event);
      assert.ok(template.length > 20);
      assert.equal(compileWhatsAppTemplateForMeta(template).ok, true);
    }
  }
});
