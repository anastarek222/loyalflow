import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

const CREDENTIAL_VERSION = "v1";
const IV_BYTES = 12;
const KEY_BYTES = 32;
const AUTH_SECRET_MIN_LENGTH = 32;
const KEY_SALT = "loyalflow-business-whatsapp-credentials";
const KEY_INFO = "whatsapp-cloud-access-token";

function encryptionKey() {
  const rootSecret = process.env.AUTH_SECRET?.trim();
  if (!rootSecret || rootSecret.length < AUTH_SECRET_MIN_LENGTH) {
    throw new Error("WHATSAPP_CREDENTIAL_ENCRYPTION_NOT_CONFIGURED");
  }

  return Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(rootSecret, "utf8"),
      Buffer.from(KEY_SALT, "utf8"),
      Buffer.from(KEY_INFO, "utf8"),
      KEY_BYTES,
    ),
  );
}

export function encryptBusinessWhatsAppAccessToken(accessToken: string) {
  const normalized = accessToken.trim();
  if (!normalized) {
    throw new Error("WHATSAPP_ACCESS_TOKEN_REQUIRED");
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(normalized, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    CREDENTIAL_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptBusinessWhatsAppAccessToken(value: string) {
  const [version, ivValue, tagValue, ciphertextValue, extra] = value.split(".");
  if (
    version !== CREDENTIAL_VERSION ||
    !ivValue ||
    !tagValue ||
    !ciphertextValue ||
    extra !== undefined
  ) {
    throw new Error("WHATSAPP_CREDENTIAL_INVALID");
  }

  try {
    const iv = Buffer.from(ivValue, "base64url");
    const tag = Buffer.from(tagValue, "base64url");
    const ciphertext = Buffer.from(ciphertextValue, "base64url");
    if (iv.length !== IV_BYTES || tag.length !== 16 || ciphertext.length === 0) {
      throw new Error("invalid credential envelope");
    }

    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "WHATSAPP_CREDENTIAL_ENCRYPTION_NOT_CONFIGURED"
    ) {
      throw error;
    }
    throw new Error("WHATSAPP_CREDENTIAL_INVALID");
  }
}
