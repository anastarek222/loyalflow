import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("WhatsApp provider delivery rechecks live entitlement before Meta send", () => {
  const delivery = source("lib/server/integrations/whatsapp-cloud.ts");
  const entitlementCheck = delivery.indexOf(
    "await canBusinessPerformSubscriptionOperation",
  );
  const providerSend = delivery.indexOf("https://graph.facebook.com/");

  assert.ok(entitlementCheck >= 0);
  assert.ok(providerSend > entitlementCheck);
  assert.match(delivery, /WHATSAPP_SUBSCRIPTION_RESTRICTED/);
  assert.match(
    delivery,
    /WHATSAPP_SUBSCRIPTION_RESTRICTED[\s\S]*?retryable: false/,
  );
});

test("every WhatsApp mutation surface uses effective live entitlement", () => {
  const paths = [
    "app/businesses/[slug]/settings/whatsapp-actions.ts",
    "app/businesses/[slug]/customers/[customerId]/whatsapp-actions.ts",
    "app/businesses/[slug]/whatsapp-history/actions.ts",
  ];

  for (const path of paths) {
    const action = source(path);
    assert.match(action, /canBusinessPerformSubscriptionOperation/);
    assert.doesNotMatch(action, /canPerformSubscriptionOperation\(/);
    assert.doesNotMatch(action, /subscriptionLifecycleState: true/);
  }
});
