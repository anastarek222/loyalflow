import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("manual customer WhatsApp sends require a preview confirmation", () => {
  const panel = source("app/businesses/[slug]/customers/[customerId]/whatsapp-panel.tsx");
  const button = source("components/manual-whatsapp-send-button.tsx");

  assert.match(panel, /ManualWhatsAppSendButton/);
  assert.match(panel, /renderWhatsAppTemplate/);
  assert.match(panel, /maskedPhone/);
  assert.doesNotMatch(panel, /<form action=\{sendAction\}>/);
  assert.match(button, /role="dialog"/);
  assert.match(button, /aria-modal="true"/);
  assert.match(button, /Send now/);
  assert.match(button, /<form action=\{action\}>/);
});
