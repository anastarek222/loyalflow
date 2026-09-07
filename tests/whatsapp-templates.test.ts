import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWhatsAppUrl,
  DEFAULT_WHATSAPP_TEMPLATES,
  normalizeWhatsAppPhone,
  renderWhatsAppTemplate,
  renderWhatsAppTemplateParameters,
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

const ownerAuthoredArabicTemplate =
  "أهلًا {customer} في {business}! رصيدك {balance} {unit}. بطاقتك: {card_link}";

test("automatic WhatsApp defaults never invent platform-authored copy", () => {
  assert.deepEqual(DEFAULT_WHATSAPP_TEMPLATES, {
    welcome: "",
    balance: "",
    reward: "",
  });
});

test("Owner-authored Arabic WhatsApp copy preserves UTF-8 and dynamic LTR values", () => {
  const message = renderWhatsAppTemplate(ownerAuthoredArabicTemplate, context);

  assert.equal(message.includes("�"), false);
  assert.equal(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(message),
    false,
  );

  assert.match(message, /أهلًا/);
  assert.match(message, /Ali Mohammed/);
  assert.match(message, /Sprint Group/);
  assert.match(message, /3020 Monthly subscription/);
  assert.match(message, /https:\/\/app\.loyalflow\.test\/card\/public-token/);
});

test("Meta body parameters contain dynamic token values in occurrence order", () => {
  assert.deepEqual(
    renderWhatsAppTemplateParameters(
      "{customer} — {balance} — {customer} — {card_link}",
      context,
    ),
    [
      "Ali Mohammed",
      "3020",
      "Ali Mohammed",
      "https://app.loyalflow.test/card/public-token",
    ],
  );
});

test("WhatsApp URL encoding round-trips Arabic and English text exactly", () => {
  const message = renderWhatsAppTemplate(ownerAuthoredArabicTemplate, context);

  const url = buildWhatsAppUrl("+20 101 234 5678", message);
  const parsed = new URL(url);

  assert.equal(parsed.origin, "https://wa.me");
  assert.equal(parsed.pathname, "/201012345678");
  assert.equal(parsed.searchParams.get("text"), message);
});

test("manual and automatic WhatsApp paths share Egyptian international normalization", () => {
  assert.equal(normalizeWhatsAppPhone("010 1234 5678"), "201012345678");
  assert.equal(normalizeWhatsAppPhone("0020 1012345678"), "201012345678");
  assert.equal(normalizeWhatsAppPhone("+20 1012345678"), "201012345678");
});

test("WhatsApp URL safely supports a missing phone number", () => {
  const message = renderWhatsAppTemplate(
    "Welcome {customer} to {business}",
    context,
  );

  const url = buildWhatsAppUrl("", message);
  const parsed = new URL(url);

  assert.equal(parsed.origin, "https://wa.me");
  assert.equal(parsed.pathname, "/");
  assert.equal(parsed.searchParams.get("text"), message);
});
