import assert from "node:assert/strict";
import test from "node:test";

import {
  extractWhatsAppMetaProviderErrorDetails,
  logWhatsAppMetaProviderFailure,
} from "../lib/server/integrations/whatsapp-meta-provider-diagnostics";

test("Meta provider diagnostics keep only allowlisted error fields and redact token-shaped text", () => {
  const details = extractWhatsAppMetaProviderErrorDetails({
    error: {
      message:
        "Invalid OAuth access token: Bearer EAA012345678901234567890123456789",
      type: "OAuthException",
      code: 190,
      error_subcode: 463,
      fbtrace_id: "trace-123",
      access_token: "TOP_SECRET_TOKEN",
      request_body: "private customer copy",
    },
    access_token: "OUTER_SECRET_TOKEN",
    components: [{ text: "private owner-authored copy" }],
  });

  assert.deepEqual(details, {
    code: 190,
    subcode: 463,
    type: "OAuthException",
    message: "Invalid OAuth access token: Bearer [REDACTED]",
    fbtraceId: "trace-123",
  });

  const serialized = JSON.stringify(details);
  assert.doesNotMatch(serialized, /TOP_SECRET_TOKEN/);
  assert.doesNotMatch(serialized, /OUTER_SECRET_TOKEN/);
  assert.doesNotMatch(serialized, /private customer copy/);
  assert.doesNotMatch(serialized, /private owner-authored copy/);
  assert.doesNotMatch(serialized, /EAA012345678901234567890123456789/);
});

test("Meta provider failure log never serializes arbitrary provider payload fields", () => {
  const calls: unknown[][] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    calls.push(args);
  };

  try {
    logWhatsAppMetaProviderFailure({
      operation: "create-template",
      httpStatus: 400,
      payload: {
        error: {
          message: "Bad request access_token=SUPER_SECRET_TOKEN",
          type: "OAuthException",
          code: 100,
          error_subcode: 2494010,
          fbtrace_id: "trace-456",
          authorization: "Bearer SHOULD_NOT_APPEAR",
        },
        request: {
          body: "customer-authored WhatsApp template",
        },
      },
    });
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(calls.length, 1);
  const serialized = calls[0].map(String).join(" ");
  assert.match(serialized, /whatsapp-meta-template-provider/);
  assert.match(serialized, /create-template/);
  assert.match(serialized, /400/);
  assert.match(serialized, /2494010/);
  assert.doesNotMatch(serialized, /SUPER_SECRET_TOKEN/);
  assert.doesNotMatch(serialized, /SHOULD_NOT_APPEAR/);
  assert.doesNotMatch(serialized, /customer-authored WhatsApp template/);
});
