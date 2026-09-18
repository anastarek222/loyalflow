import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const messagingSource = readFileSync(
  "lib/server/integrations/customer-messaging.ts",
  "utf8",
);
const senderSource = readFileSync(
  "lib/server/integrations/whatsapp-cloud.ts",
  "utf8",
);
const historySource = readFileSync(
  "lib/server/integrations/whatsapp-message-history.ts",
  "utf8",
);
const recoverySource = readFileSync(
  "app/businesses/[slug]/whatsapp-history/actions.ts",
  "utf8",
);
const manualSource = readFileSync(
  "app/businesses/[slug]/customers/[customerId]/whatsapp-actions.ts",
  "utf8",
);
const wrapperSource = readFileSync(
  "app/businesses/[slug]/customers/[customerId]/page.tsx",
  "utf8",
);
const legacyProfileSource = readFileSync(
  "app/businesses/[slug]/customers/[customerId]/legacy-page.tsx",
  "utf8",
);
const panelSource = readFileSync(
  "app/businesses/[slug]/customers/[customerId]/whatsapp-panel.tsx",
  "utf8",
);
const manualReadinessSource = readFileSync(
  "lib/server/integrations/whatsapp-manual-readiness.ts",
  "utf8",
);
const historyPageSource = readFileSync(
  "app/businesses/[slug]/whatsapp-history/page.tsx",
  "utf8",
);

test("manual WhatsApp shares the durable outbox without automation-toggle coupling", () => {
  assert.match(messagingSource, /deliveryMode\?: CustomerMessageDeliveryMode/);
  assert.match(messagingSource, /deliveryMode: "MANUAL"/);
  assert.match(messagingSource, /enqueueIntegrationJob\(transaction/);
  assert.match(messagingSource, /customer-message:manual:/);
  assert.match(
    senderSource,
    /const manualDelivery = payload\.deliveryMode === "MANUAL"/,
  );
  assert.match(
    senderSource,
    /!manualDelivery &&[\s\S]*isWhatsAppAutomationEventEnabled/,
  );
  assert.match(senderSource, /customer\.whatsappOptedOutAt/);
});

test("message history is business-scoped and filters the durable WhatsApp jobs", () => {
  assert.match(historySource, /businessId,/);
  assert.match(historySource, /kind: "WHATSAPP_CUSTOMER_NOTIFICATION"/);
  assert.match(
    historySource,
    /payload: \{ path: \["customerId"\], equals: customerId \}/,
  );
  assert.match(
    historySource,
    /payload: \{ path: \["event"\], equals: input\.event \}/,
  );
  assert.match(
    historySource,
    /orderBy: \[\{ createdAt: "desc" \}, \{ id: "desc" \}\]/,
  );
});

test("Retry revives the same delivery job only when the shared recovery policy allows it", () => {
  assert.match(recoverySource, /status: \{ in: \["FAILED", "DEAD"\] \}/);
  assert.match(recoverySource, /getWhatsAppRecoveryDecision\(job\.lastErrorCode\)/);
  assert.match(recoverySource, /!recoveryDecision\.retryAllowed/);
  assert.match(recoverySource, /whatsappPhoneE164:\s*\{ not: null \}/);
  assert.match(recoverySource, /customer\.whatsappPhoneE164 !== customer\.phone/);
  assert.match(historyPageSource, /getWhatsAppRecoveryDecision\(/);
  assert.match(historyPageSource, /recoveryDecision\.retryAllowed/);
  assert.match(historyPageSource, /const safeRetry =[\s\S]*eligible &&/);
  assert.match(recoverySource, /providerMessageId: null/);
  assert.match(recoverySource, /providerDeliveryStatus: null/);
  assert.match(recoverySource, /lastErrorCode: job\.lastErrorCode/);
  assert.match(recoverySource, /status: "PENDING"/);
  assert.match(recoverySource, /lastErrorCode: null/);
  assert.match(recoverySource, /scheduleIntegrationJob\(job\.id\)/);
  assert.doesNotMatch(recoverySource, /rewardRedemption|loyaltyTransaction/);
});

test("Resend creates a delivery-only job, preserves automatic payload identity, and never replays business mutation", () => {
  assert.match(
    recoverySource,
    /enqueueAutomaticCustomerMessageResendJob\(transaction/,
  );
  assert.match(recoverySource, /enqueueManualCustomerMessageJob\(transaction/);
  assert.match(recoverySource, /payload,/);
  assert.doesNotMatch(recoverySource, /redeemReward|addLoyalty|balanceAfter/);
});

test("contextual customer action uses the manual queue and authoritative Reward Ready", () => {
  assert.match(manualSource, /enqueueManualCustomerMessageJob\(transaction/);
  assert.match(manualSource, /getRewardAvailability\(/);
  assert.match(manualSource, /if \(!availability\.rewardReady\)/);
  assert.match(manualSource, /scheduleIntegrationJob\(job\.id\)/);
  assert.doesNotMatch(manualSource, /wa\.me/);
});

test("Customer Profile removes legacy direct WhatsApp links from the render source", () => {
  assert.match(wrapperSource, /LegacyCustomerDetailsPage/);
  assert.match(wrapperSource, /CustomerWhatsAppPanel/);
  assert.doesNotMatch(wrapperSource, /href\^=.*wa\.me/);
  assert.doesNotMatch(legacyProfileSource, /buildWhatsAppUrl|wa\.me/);
});

test("manual delivery UI and action share provider, sender and current-template readiness", () => {
  assert.match(manualSource, /getBusinessWhatsAppManualReadiness\(prisma/);
  assert.match(
    manualSource,
    /manualReadiness\.isEventReady\(parsed\.data\.event\)/,
  );
  assert.match(panelSource, /getBusinessWhatsAppManualReadiness\(prisma/);
  assert.match(panelSource, /manualReadiness\.isEventReady\("WELCOME"\)/);
  assert.match(
    manualReadinessSource,
    /getWhatsAppProviderReadiness\(\)\.providerReady/,
  );
  assert.match(manualReadinessSource, /getBusinessWhatsAppCredential/);
  assert.match(manualReadinessSource, /approvalStatus === "APPROVED"/);
  assert.match(
    manualReadinessSource,
    /hashBusinessWhatsAppTemplate\(message\)/,
  );
  assert.match(
    manualReadinessSource,
    /binding\.wabaId === credential\?\.wabaId/,
  );
});

test("WhatsApp recovery authority matches customer edit permission", () => {
  assert.match(recoverySource, /canPerform[\s\S]*"CUSTOMERS_EDIT"/);
  assert.match(historyPageSource, /canPerform[\s\S]*"CUSTOMERS_EDIT"/);
  assert.doesNotMatch(historyPageSource, /canRecoverForRole/);
});

test("WhatsApp history eligibility is phone-bound to the customer's current number", () => {
  assert.match(historySource, /whatsappPhoneMatchesCustomer/);
  assert.match(historySource, /customer\.whatsappPhoneE164 === customer\.phone/);
  assert.match(historyPageSource, /entry\.whatsappPhoneMatchesCustomer/);
});

test("global WhatsApp history labels manual and automatic delivery distinctly", () => {
  assert.match(historyPageSource, /payload\.deliveryMode === "MANUAL"/);
  assert.match(historyPageSource, /"يدوي", "Manual"/);
  assert.match(historyPageSource, /"تلقائي", "Automatic"/);
});
