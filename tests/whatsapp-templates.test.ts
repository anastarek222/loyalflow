import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWhatsAppUrl,
  DEFAULT_WHATSAPP_TEMPLATES,
  renderWhatsAppTemplate,
} from "../lib/whatsapp-templates";

const context = {
  customer: "Ali Mohammed",
  business: "Sprint Group",
  balance: 3020,
  unit: "Monthly subscription",
  reward: "50% discount",
  remaining: 6980,
  cardLink: "https://app.loyalflow.test/card/public-token",
};

test("Arabic WhatsApp templates preserve UTF-8 and dynamic LTR values", () => {
  for (const template of Object.values(DEFAULT_WHATSAPP_TEMPLATES)) {
    const message = renderWhatsAppTemplate(template, context);

    assert.equal(message.includes("�"), false);
    assert.equal(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(message),
      false,
    );

    assert.match(message, /Ali Mohammed/);
    assert.match(message, /Sprint Group/);
    assert.match(message, /3020 Monthly subscription/);
    assert.match(message, /https:\/\/app\.loyalflow\.test\/card\/public-token/);
  }
});

test("WhatsApp URL encoding round-trips Arabic and English text exactly", () => {
  const message = renderWhatsAppTemplate(
    DEFAULT_WHATSAPP_TEMPLATES.balance,
    context,
  );

  const url = buildWhatsAppUrl("+20 101 234 5678", message);
  const parsed = new URL(url);

  assert.equal(parsed.origin, "https://wa.me");
  assert.equal(parsed.pathname, "/201012345678");
  assert.equal(parsed.searchParams.get("text"), message);
});

test("WhatsApp URL safely supports a missing phone number", () => {
  const message = renderWhatsAppTemplate(
    DEFAULT_WHATSAPP_TEMPLATES.welcome,
    context,
  );

  const url = buildWhatsAppUrl("", message);
  const parsed = new URL(url);

  assert.equal(parsed.origin, "https://wa.me");
  assert.equal(parsed.pathname, "/");
  assert.equal(parsed.searchParams.get("text"), message);
});
