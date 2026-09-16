import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");

test("manual redeemed delivery uses the latest durable redemption snapshot", () => {
  const events = source("lib/server/integrations/customer-messaging.ts");
  const action = source("app/businesses/[slug]/customers/[customerId]/whatsapp-actions.ts");
  const panel = source("app/businesses/[slug]/customers/[customerId]/whatsapp-panel.tsx");

  assert.match(events, /MANUAL_CUSTOMER_MESSAGE_EVENTS[\s\S]*"REWARD_REDEEMED"/);
  assert.match(action, /parsed\.data\.event === "REWARD_REDEEMED"/);
  assert.match(action, /prisma\.rewardRedemption\.findFirst/);
  assert.match(action, /rewardName = latestRedemption\.rewardName/);
  assert.match(panel, /manualReadiness\.isEventReady\("REWARD_REDEEMED"\)/);
  assert.match(panel, /data-whatsapp-customer-timeline/);
  assert.match(panel, /pageSize: 5/);
});
