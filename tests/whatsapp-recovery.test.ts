import assert from "node:assert/strict";
import test from "node:test";

import { getWhatsAppRecoveryDecision } from "../lib/server/integrations/whatsapp-recovery";

test("invalid customer phone requires data repair and never retries", () => {
  assert.deepEqual(getWhatsAppRecoveryDecision("WHATSAPP_INVALID_PHONE"), {
    action: "FIX_CUSTOMER_PHONE",
    retryAllowed: false,
    reason: "INVALID_PHONE",
  });
});

test("connection failures require reconnect and never retry blindly", () => {
  for (const failure of [
    "WHATSAPP_NOT_CONFIGURED",
    "WHATSAPP_WABA_NOT_CONFIGURED",
    "WHATSAPP_BUSINESS_CREDENTIAL_INVALID",
    "WHATSAPP_META_TEMPLATE_ACCOUNT_MISMATCH",
  ]) {
    const decision = getWhatsAppRecoveryDecision(failure);
    assert.equal(decision.action, "RECONNECT_WHATSAPP");
    assert.equal(decision.retryAllowed, false);
  }
});

test("template failures require template repair and never retry blindly", () => {
  for (const failure of [
    "WHATSAPP_OWNER_MESSAGE_NOT_CONFIGURED",
    "WHATSAPP_META_TEMPLATE_BINDING_NOT_CONFIGURED",
    "WHATSAPP_META_TEMPLATE_NOT_APPROVED",
    "WHATSAPP_META_TEMPLATE_CONTENT_MISMATCH",
    "WHATSAPP_META_TEMPLATE_BINDING_INVALID",
  ]) {
    const decision = getWhatsAppRecoveryDecision(failure);
    assert.equal(decision.action, "FIX_TEMPLATE");
    assert.equal(decision.retryAllowed, false);
  }
});

test("only transient provider failures are retryable", () => {
  for (const failure of [
    "WHATSAPP_NETWORK_ERROR",
    "WHATSAPP_HTTP_429",
    "WHATSAPP_HTTP_500",
    "WHATSAPP_HTTP_503",
  ]) {
    const decision = getWhatsAppRecoveryDecision(failure);
    assert.equal(decision.action, "RETRY");
    assert.equal(decision.retryAllowed, true);
  }

  for (const failure of ["WHATSAPP_HTTP_400", "WHATSAPP_HTTP_401", "WHATSAPP_HTTP_404"]) {
    const decision = getWhatsAppRecoveryDecision(failure);
    assert.equal(decision.action, "NONE");
    assert.equal(decision.retryAllowed, false);
    assert.equal(decision.reason, "PERMANENT_PROVIDER_ERROR");
  }
});

test("unknown or invalid delivery failures fail closed", () => {
  assert.deepEqual(getWhatsAppRecoveryDecision("WHATSAPP_INVALID_PAYLOAD"), {
    action: "NONE",
    retryAllowed: false,
    reason: "PERMANENT_DELIVERY_ERROR",
  });
  assert.equal(getWhatsAppRecoveryDecision("SOMETHING_NEW").retryAllowed, false);
  assert.equal(getWhatsAppRecoveryDecision(null).retryAllowed, false);
});
