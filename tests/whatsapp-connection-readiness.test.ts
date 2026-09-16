import assert from "node:assert/strict";
import test from "node:test";

import {
  getBusinessWhatsAppConnectionReadiness,
  WHATSAPP_CONNECTION_STATES,
} from "../lib/server/integrations/whatsapp-readiness";

test("WhatsApp connection authority exposes the approved product states", () => {
  assert.deepEqual(WHATSAPP_CONNECTION_STATES, [
    "NOT_CONNECTED",
    "CONNECTING",
    "CHECKING",
    "READY",
    "ACTION_REQUIRED",
    "ERROR",
  ]);
});

test("missing credential is not connected", () => {
  const readiness = getBusinessWhatsAppConnectionReadiness({
    credentialPresent: false,
    senderReady: false,
    providerReady: true,
    hasEnabledMessages: true,
    templatesReady: true,
  });

  assert.equal(readiness.state, "NOT_CONNECTED");
  assert.equal(readiness.reason, "NOT_CONNECTED");
  assert.equal(readiness.connectionReady, false);
  assert.equal(readiness.automaticDeliveryReady, false);
});

test("saved credential without a complete sender requires action", () => {
  const readiness = getBusinessWhatsAppConnectionReadiness({
    credentialPresent: true,
    senderReady: false,
    providerReady: true,
    hasEnabledMessages: true,
    templatesReady: true,
  });

  assert.equal(readiness.state, "ACTION_REQUIRED");
  assert.equal(readiness.reason, "SENDER_INCOMPLETE");
  assert.equal(readiness.connectionReady, false);
});

test("provider configuration and template approval remain separate readiness gates", () => {
  const providerBlocked = getBusinessWhatsAppConnectionReadiness({
    credentialPresent: true,
    senderReady: true,
    providerReady: false,
    hasEnabledMessages: true,
    templatesReady: true,
  });
  const templateBlocked = getBusinessWhatsAppConnectionReadiness({
    credentialPresent: true,
    senderReady: true,
    providerReady: true,
    hasEnabledMessages: true,
    templatesReady: false,
  });

  assert.equal(providerBlocked.reason, "PROVIDER_NOT_READY");
  assert.equal(providerBlocked.connectionReady, true);
  assert.equal(providerBlocked.automaticDeliveryReady, false);
  assert.equal(templateBlocked.reason, "TEMPLATE_APPROVAL_REQUIRED");
  assert.equal(templateBlocked.connectionReady, true);
  assert.equal(templateBlocked.automaticDeliveryReady, false);
});

test("an otherwise connected business with no enabled automatic messages requires action", () => {
  const readiness = getBusinessWhatsAppConnectionReadiness({
    credentialPresent: true,
    senderReady: true,
    providerReady: true,
    hasEnabledMessages: false,
    templatesReady: false,
  });

  assert.equal(readiness.state, "ACTION_REQUIRED");
  assert.equal(readiness.reason, "NO_AUTOMATIC_MESSAGES");
  assert.equal(readiness.automaticDeliveryReady, false);
});

test("ready means both connection and automatic delivery are ready", () => {
  const readiness = getBusinessWhatsAppConnectionReadiness({
    credentialPresent: true,
    senderReady: true,
    providerReady: true,
    hasEnabledMessages: true,
    templatesReady: true,
  });

  assert.equal(readiness.state, "READY");
  assert.equal(readiness.reason, "READY");
  assert.equal(readiness.connectionReady, true);
  assert.equal(readiness.automaticDeliveryReady, true);
});

test("explicit in-flight and failure states never claim automatic delivery readiness", () => {
  for (const operationState of ["CONNECTING", "CHECKING", "ERROR"] as const) {
    const readiness = getBusinessWhatsAppConnectionReadiness({
      credentialPresent: true,
      senderReady: true,
      providerReady: true,
      hasEnabledMessages: true,
      templatesReady: true,
      operationState,
    });

    assert.equal(readiness.state, operationState);
    assert.equal(readiness.reason, operationState);
    assert.equal(readiness.automaticDeliveryReady, false);
  }
});
