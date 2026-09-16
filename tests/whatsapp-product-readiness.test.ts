import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(
  join(
    process.cwd(),
    "lib/server/integrations/business-whatsapp-product-readiness.ts",
  ),
  "utf8",
);

test("setup indicators use complete business WhatsApp delivery readiness", () => {
  assert.match(source, /getBusinessWhatsAppCredential/);
  assert.match(source, /getBusinessWhatsAppAutomationSettings/);
  assert.match(source, /getBusinessWhatsAppAutomaticReadiness/);
  assert.match(source, /getBusinessWhatsAppConnectionReadiness/);
  assert.match(source, /connection\.automaticDeliveryReady && !automation\.paused/);
});
