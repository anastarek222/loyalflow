import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  enqueueCustomerMessageJob,
  isCustomerMessagePayload,
} from "../lib/server/integrations/customer-messaging";
import { operationPresentationPath } from "../lib/loyalty/operation-origin";

test("accepts only bounded versioned customer message payloads", () => {
  assert.equal(
    isCustomerMessagePayload({
      version: 1,
      event: "WELCOME",
      customerId: "customer_1",
    }),
    true,
  );
  assert.equal(
    isCustomerMessagePayload({
      version: 1,
      event: "REWARD_READY",
      customerId: "customer_1",
      balance: 5,
      rewardName: "Free coffee",
    }),
    true,
  );
  assert.equal(
    isCustomerMessagePayload({
      version: 2,
      event: "WELCOME",
      customerId: "customer_1",
    }),
    false,
  );
  assert.equal(
    isCustomerMessagePayload({
      version: 1,
      event: "UNKNOWN",
      customerId: "customer_1",
    }),
    false,
  );
  assert.equal(
    isCustomerMessagePayload({
      version: 1,
      event: "BALANCE_UPDATED",
      customerId: "customer_1",
      balance: "5",
    }),
    false,
  );
});

test("does not enqueue WhatsApp delivery without explicit opt-in", async () => {
  let upsertCalled = false;
  const transaction = {
    customer: {
      findFirst: async () => null,
    },
    integrationJob: {
      upsert: async () => {
        upsertCalled = true;
        return { id: "job_should_not_exist" };
      },
    },
  };

  const result = await enqueueCustomerMessageJob(transaction as never, {
    businessId: "business_1",
    customerId: "customer_1",
    event: "WELCOME",
    eventKey: "activity_1",
    balance: 0,
  });

  assert.equal(result, null);
  assert.equal(upsertCalled, false);
});

test("enqueues one idempotent WhatsApp event after opt-in", async () => {
  let upsertInput: Record<string, unknown> | null = null;
  const transaction = {
    customer: {
      findFirst: async () => ({ id: "customer_1" }),
    },
    integrationJob: {
      upsert: async (input: Record<string, unknown>) => {
        upsertInput = input;
        return { id: "job_1" };
      },
    },
  };

  const result = await enqueueCustomerMessageJob(transaction as never, {
    businessId: "business_1",
    customerId: "customer_1",
    event: "REWARD_READY",
    eventKey: "operation_1:reward_1",
    balance: 8,
    rewardName: "Free coffee",
  });

  assert.equal(result?.id, "job_1");
  assert.ok(upsertInput);
  const create = (upsertInput as { create: Record<string, unknown> }).create;
  assert.equal(create.kind, "WHATSAPP_CUSTOMER_NOTIFICATION");
  assert.equal(
    create.idempotencyKey,
    "customer-message:reward_ready:operation_1:reward_1",
  );
  assert.deepEqual(create.payload, {
    version: 1,
    event: "REWARD_READY",
    customerId: "customer_1",
    balance: 8,
    rewardName: "Free coffee",
  });
});

test("reward-ready keeps the existing earned success UI and adds a feedback flag", () => {
  assert.equal(
    operationPresentationPath("SCAN", "coffee-shop", "customer_1", {
      success: "reward-ready",
    }),
    "/businesses/coffee-shop/scan/customer/customer_1?success=earned&rewardReady=1",
  );
  assert.equal(
    operationPresentationPath("SCAN", "coffee-shop", "customer_1", {
      success: "redeemed",
    }),
    "/businesses/coffee-shop/scan/customer/customer_1?success=redeemed",
  );
});

test("public and staff customer creation expose explicit WhatsApp consent", () => {
  const publicJoinPage = readFileSync("app/join/[slug]/page.tsx", "utf8");
  const staffCustomersPage = readFileSync(
    "app/businesses/[slug]/customers/page.tsx",
    "utf8",
  );
  const staffAction = readFileSync(
    "app/businesses/[slug]/customers/actions.ts",
    "utf8",
  );

  assert.match(publicJoinPage, /name="whatsappOptIn"/);
  assert.match(staffCustomersPage, /name="whatsappOptIn"/);
  assert.match(
    staffAction,
    /whatsappOptIn:\s*formData\.get\("whatsappOptIn"\)\s*===\s*"on"/,
  );
  assert.match(staffAction, /scheduleIntegrationJobs\(creation\.integrationJobIds\)/);
});

test("inbound WhatsApp opt-out is scoped only to explicit business sender credentials", () => {
  const consentSource = readFileSync(
    "lib/server/integrations/whatsapp-consent.ts",
    "utf8",
  );

  assert.doesNotMatch(consentSource, /WHATSAPP_PHONE_NUMBER_ID/);
  assert.match(
    consentSource,
    /INNER JOIN "BusinessWhatsAppCredential" AS credential/,
  );
  assert.match(
    consentSource,
    /credential\."phoneNumberId" = \$\{request\.phoneNumberId\}/,
  );
  assert.doesNotMatch(consentSource, /shared fallback sender/i);
});

test("customer message settings are explicitly manual and separate from automatic Meta templates", () => {
  const source = readFileSync("components/customer-messages-form.tsx", "utf8");

  assert.match(source, /Manual WhatsApp templates/);
  assert.match(source, /قوالب واتساب اليدوية/);
  assert.match(source, /Automatic WhatsApp notifications use approved Meta templates/);
  assert.match(source, /Settings → WhatsApp/);
});

test("manual customer-profile WhatsApp actions require customer edit permission", () => {
  const source = readFileSync(
    "app/businesses/[slug]/customers/[customerId]/page.tsx",
    "utf8",
  );

  assert.match(
    source,
    /const canManageCustomer = canPerform\([\s\S]*?"CUSTOMERS_EDIT"[\s\S]*?\);/,
  );
  assert.match(
    source,
    /const smartWhatsAppSuggestion = canManageCustomer\s*\?\s*getCampaignSuggestion\(/,
  );

  const cardSection = source.indexOf('id="customer-card"');
  const manualGuard = source.indexOf("{canManageCustomer ? (", cardSection);
  const manualCopy = source.indexOf("{copy.manualWhatsApp}", manualGuard);
  const welcomeLink = source.indexOf("href={welcomeWhatsAppUrl}", manualGuard);
  const balanceLink = source.indexOf("href={balanceWhatsAppUrl}", manualGuard);
  const rewardLink = source.indexOf("href={rewardWhatsAppUrl}", manualGuard);

  assert.ok(cardSection >= 0);
  assert.ok(manualGuard > cardSection);
  assert.ok(manualCopy > manualGuard);
  assert.ok(welcomeLink > manualGuard);
  assert.ok(balanceLink > welcomeLink);
  assert.ok(rewardLink > balanceLink);
});
