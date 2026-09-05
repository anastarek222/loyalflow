import assert from "node:assert/strict";
import test from "node:test";

import {
  decryptBusinessWhatsAppAccessToken,
  encryptBusinessWhatsAppAccessToken,
} from "../lib/server/integrations/whatsapp-credential-crypto";

test("business WhatsApp access tokens round-trip through authenticated encryption", (t) => {
  const previous = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "test-only-auth-secret-that-is-longer-than-thirty-two-characters";
  t.after(() => {
    if (previous === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previous;
  });

  const token = "EA-test-access-token-value-that-must-never-be-stored-in-plain-text";
  const encrypted = encryptBusinessWhatsAppAccessToken(token);

  assert.notEqual(encrypted, token);
  assert.equal(encrypted.includes(token), false);
  assert.match(encrypted, /^v1\.[^.]+\.[^.]+\.[^.]+$/);
  assert.equal(decryptBusinessWhatsAppAccessToken(encrypted), token);
});

test("business WhatsApp access token encryption fails closed when tampered", (t) => {
  const previous = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "test-only-auth-secret-that-is-longer-than-thirty-two-characters";
  t.after(() => {
    if (previous === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previous;
  });

  const encrypted = encryptBusinessWhatsAppAccessToken(
    "EA-another-test-access-token-value-that-is-long-enough",
  );
  const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith("A") ? "B" : "A"}`;

  assert.throws(
    () => decryptBusinessWhatsAppAccessToken(tampered),
    /WHATSAPP_CREDENTIAL_INVALID/,
  );
});

test("business WhatsApp access token encryption requires the existing auth secret", (t) => {
  const previous = process.env.AUTH_SECRET;
  delete process.env.AUTH_SECRET;
  t.after(() => {
    if (previous === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previous;
  });

  assert.throws(
    () => encryptBusinessWhatsAppAccessToken("EA-valid-looking-test-token-value"),
    /WHATSAPP_CREDENTIAL_ENCRYPTION_NOT_CONFIGURED/,
  );
});
