import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AUTOMATIC_CUSTOMER_MESSAGE_EVENTS,
  enqueueCustomerMessageJob,
  enqueueCustomerMessagePublicationJobs,
  isCustomerMessagePayload,
} from "../lib/server/integrations/customer-messaging";
import { operationPresentationPath } from "../lib/loyalty/operation-origin";

function automationRow(
  overrides: Partial<{
    paused: boolean;
    welcomeEnabled: boolean;
    balanceUpdatedEnabled: boolean;
    rewardReadyEnabled: boolean;
    rewardRedeemedEnabled: boolean;
    newRewardEnabled: boolean;
    newOfferEnabled: boolean;
  }> = {},
) {
  return {
    businessId: "business_1",
    paused: false,
    welcomeEnabled: true,
    balanceUpdatedEnabled: true,
    rewardReadyEnabled: true,
    rewardRedeemedEnabled: true,
    newRewardEnabled: false,
    newOfferEnabled: false,
    newRewardMessage: null,
    newOfferMessage: null,
    createdAt: new Date("2026-09-11T00:00:00.000Z"),
    updatedAt: new Date("2026-09-11T00:00:00.000Z"),
    ...overrides,
  };
}

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
      version: 1,
      event: "REWARD_REDEEMED",
      customerId: "customer_1",
    }),
    true,
  );
  assert.equal(
    isCustomerMessagePayload({
      version: 1,
      event: "NEW_REWARD",
      customerId: "customer_1",
      rewardId: "reward_1",
      rewardName: "Free coffee",
    }),
    true,
  );
  assert.equal(
    isCustomerMessagePayload({
      version: 1,
      event: "NEW_OFFER",
      customerId: "customer_1",
      offerId: "offer_1",
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
  assert.equal(
    isCustomerMessagePayload({
      version: 1,
      event: "NEW_REWARD",
      customerId: "customer_1",
    }),
    false,
  );
  assert.equal(
    isCustomerMessagePayload({
      version: 1,
      event: "WELCOME",
      customerId: "customer_1",
      offerId: "offer_1",
    }),
    false,
  );
});

test("publish producers create one durable idempotent candidate per opted-in customer", async () => {
  const upserts: Array<Record<string, unknown>> = [];
  const transaction = {
    $queryRaw: async () => [automationRow({ newOfferEnabled: true })],
    customer: {
      findMany: async () => [{ id: "customer_1" }, { id: "customer_2" }],
    },
    integrationJob: {
      upsert: async (input: Record<string, unknown>) => {
        upserts.push(input);
        return { id: `job_${upserts.length}` };
      },
    },
  };

  const jobs = await enqueueCustomerMessagePublicationJobs(
    transaction as never,
    {
      businessId: "business_1",
      event: "NEW_OFFER",
      offerId: "offer_1",
      publicationKey: "offer:offer_1:created",
      availableAt: new Date("2026-09-13T00:00:00.000Z"),
    },
  );

  assert.deepEqual(
    jobs.map((job) => job.id),
    ["job_1", "job_2"],
  );
  assert.equal(upserts.length, 2);
  assert.deepEqual(
    (upserts[0] as { create: Record<string, unknown> }).create.payload,
    {
      version: 1,
      event: "NEW_OFFER",
      customerId: "customer_1",
      offerId: "offer_1",
    },
  );
  assert.equal(
    (upserts[1] as { create: Record<string, unknown> }).create.idempotencyKey,
    "customer-message:new_offer:offer:offer_1:created:customer_2",
  );
});

test("automatic WhatsApp contract contains six independently controlled events", () => {
  assert.deepEqual(AUTOMATIC_CUSTOMER_MESSAGE_EVENTS, [
    "WELCOME",
    "BALANCE_UPDATED",
    "REWARD_READY",
    "REWARD_REDEEMED",
    "NEW_REWARD",
    "NEW_OFFER",
  ]);
});

test("disabled or globally paused events stop before customer state is read", async () => {
  for (const settings of [
    automationRow({ rewardRedeemedEnabled: false }),
    automationRow({ paused: true }),
  ]) {
    let customerRead = false;
    let upsertCalled = false;
    const transaction = {
      $queryRaw: async () => [settings],
      customer: {
        findFirst: async () => {
          customerRead = true;
          return { id: "customer_1" };
        },
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
      event: "REWARD_REDEEMED",
      eventKey: "redemption_1",
    });

    assert.equal(result, null);
    assert.equal(customerRead, false);
    assert.equal(upsertCalled, false);
  }
});

test("redeemed event enqueues after successful trigger only when its switch is enabled", async () => {
  let upsertInput: Record<string, unknown> | null = null;
  const transaction = {
    $queryRaw: async () => [automationRow()],
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
    event: "REWARD_REDEEMED",
    eventKey: "redemption_1",
    rewardName: "Free coffee",
  });

  assert.equal(result?.id, "job_1");
  assert.ok(upsertInput);
  const create = (upsertInput as { create: Record<string, unknown> }).create;
  assert.equal(
    create.idempotencyKey,
    "customer-message:reward_redeemed:redemption_1",
  );
  assert.deepEqual(create.payload, {
    version: 1,
    event: "REWARD_REDEEMED",
    customerId: "customer_1",
    rewardName: "Free coffee",
  });
});

test("does not enqueue WhatsApp delivery without explicit opt-in", async () => {
  let upsertCalled = false;
  const transaction = {
    $queryRaw: async () => [automationRow()],
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
    $queryRaw: async () => [automationRow()],
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
  assert.match(
    staffAction,
    /scheduleIntegrationJobs\(creation\.integrationJobIds\)/,
  );
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

test("automatic WhatsApp copy is Owner-authored and Meta-bound per business", () => {
  const formSource = readFileSync(
    "components/customer-messages-form.tsx",
    "utf8",
  );
  const senderSource = readFileSync(
    "lib/server/integrations/whatsapp-cloud.ts",
    "utf8",
  );
  const readinessSource = readFileSync(
    "lib/server/integrations/whatsapp-readiness.ts",
    "utf8",
  );
  const settingsSource = readFileSync(
    "lib/server/integrations/business-whatsapp-automation-settings.ts",
    "utf8",
  );

  assert.match(formSource, /WhatsApp messages/);
  assert.match(formSource, /رسائل واتساب/);
  assert.match(formSource, /single source of truth/);
  assert.match(
    formSource,
    /There are no separate Manual and Automatic message versions/,
  );
  assert.match(formSource, /data-whatsapp-owner-messages/);
  assert.doesNotMatch(formSource, /data-automatic-whatsapp-owner-messages/);

  assert.match(senderSource, /whatsappWelcomeMessage: true/);
  assert.match(senderSource, /whatsappBalanceMessage: true/);
  assert.match(senderSource, /whatsappRewardMessage: true/);
  assert.match(senderSource, /whatsappRedeemedMessage: true/);
  assert.match(senderSource, /isWhatsAppAutomationEventEnabled/);
  assert.match(senderSource, /getBusinessWhatsAppTemplateBinding/);
  assert.match(senderSource, /hashBusinessWhatsAppTemplate/);
  assert.match(senderSource, /WHATSAPP_META_TEMPLATE_NOT_APPROVED/);
  assert.match(senderSource, /WHATSAPP_META_TEMPLATE_CONTENT_MISMATCH/);
  assert.match(senderSource, /renderWhatsAppTemplateParameters/);
  assert.doesNotMatch(senderSource, /renderedOwnerMessage/);
  assert.doesNotMatch(senderSource, /DEFAULT_WHATSAPP_TEMPLATES/);
  assert.doesNotMatch(senderSource, /WHATSAPP_TEMPLATE_/);
  assert.doesNotMatch(readinessSource, /WHATSAPP_TEMPLATE_/);
  assert.match(settingsSource, /"newRewardMessage"/);
  assert.match(settingsSource, /"newOfferMessage"/);
});

test("Meta approval remains provider-owned while event toggles remain Owner-owned", () => {
  const bindingSource = readFileSync(
    "lib/server/integrations/business-whatsapp-template-bindings.ts",
    "utf8",
  );
  const actionsSource = readFileSync(
    "app/businesses/[slug]/settings/whatsapp-actions.ts",
    "utf8",
  );
  const migrationSource = readFileSync(
    "prisma/migrations/20260911120000_add_whatsapp_automation_controls/migration.sql",
    "utf8",
  );

  assert.match(bindingSource, /FROM "BusinessWhatsAppTemplateBinding"/);
  assert.doesNotMatch(
    bindingSource,
    /\$executeRaw|INSERT INTO|UPDATE "BusinessWhatsAppTemplateBinding"/,
  );
  assert.doesNotMatch(
    actionsSource,
    /approvalStatus:\s*formData|get\("approvalStatus"\)/,
  );
  assert.doesNotMatch(
    actionsSource,
    /providerTemplateId:\s*formData|get\("providerTemplateId"\)/,
  );
  assert.match(actionsSource, /rewardRedeemedEnabled/);
  assert.match(actionsSource, /newRewardEnabled/);
  assert.match(actionsSource, /newOfferEnabled/);
  assert.match(
    migrationSource,
    /'REWARD_REDEEMED'[\s\S]*'NEW_REWARD'[\s\S]*'NEW_OFFER'/,
  );
});

test("New Reward and New Offer producers are enabled after the WA-5 audience gate", () => {
  const pageSource = readFileSync(
    "app/businesses/[slug]/settings/whatsapp/page.tsx",
    "utf8",
  );

  assert.match(pageSource, /event: "NEW_REWARD"/);
  assert.match(pageSource, /event: "NEW_OFFER"/);
  assert.doesNotMatch(pageSource, /producerReady: false/);
  assert.doesNotMatch(pageSource, /WA-5 sync/);
});

test("WA-5 publishes only on create or inactive-to-active transitions and rechecks delivery truth", () => {
  const rewardCommand = readFileSync(
    "lib/server/business/reward-write-command.ts",
    "utf8",
  );
  const offerCommand = readFileSync(
    "lib/server/business/offer-write-command.ts",
    "utf8",
  );
  const rewardActions = readFileSync(
    "app/businesses/[slug]/rewards/actions.ts",
    "utf8",
  );
  const offerActions = readFileSync(
    "app/businesses/[slug]/offers/actions.ts",
    "utf8",
  );
  const sender = readFileSync(
    "lib/server/integrations/whatsapp-cloud.ts",
    "utf8",
  );

  assert.match(rewardCommand, /event: "NEW_REWARD"/);
  assert.match(offerCommand, /event: "NEW_OFFER"/);
  assert.match(rewardCommand, /!existingReward\.isActive && reward\.isActive/);
  assert.match(offerCommand, /!existingOffer\.isActive && offer\.isActive/);
  assert.match(offerCommand, /offerNotificationAvailableAt/);
  assert.match(
    rewardActions,
    /scheduleIntegrationJobs\(result\.integrationJobIds\)/,
  );
  assert.match(
    offerActions,
    /scheduleIntegrationJobs\(result\.integrationJobIds\)/,
  );
  assert.match(sender, /payload\.event === "NEW_REWARD"[\s\S]*isActive: true/);
  assert.match(
    sender,
    /payload\.event === "NEW_OFFER"[\s\S]*isOfferEligible\(/,
  );
  assert.match(sender, /resolveBusinessCustomerAudienceContext\(/);
});

test("manual customer-profile WhatsApp actions require customer edit permission", () => {
  const panelSource = readFileSync(
    "app/businesses/[slug]/customers/[customerId]/whatsapp-panel.tsx",
    "utf8",
  );
  const actionSource = readFileSync(
    "app/businesses/[slug]/customers/[customerId]/whatsapp-actions.ts",
    "utf8",
  );
  assert.match(
    panelSource,
    /const canSend = canPerform\(session\.user, business\.id, "CUSTOMERS_EDIT"\)/,
  );
  assert.match(
    actionSource,
    /!canPerform\(session\.user, business\.id, "CUSTOMERS_EDIT"\)/,
  );
});
