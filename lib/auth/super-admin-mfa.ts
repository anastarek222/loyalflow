import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const MFA_KEY_SALT = Buffer.from("loyalflow-super-admin-mfa", "utf8");
const MFA_KEY_INFO = Buffer.from("totp-secret-v1", "utf8");

function base32Encode(input: Buffer) {
  let bits = "";
  for (const byte of input) bits += byte.toString(2).padStart(8, "0");

  let output = "";
  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, "0");
    output += BASE32_ALPHABET[Number.parseInt(chunk, 2)];
  }
  return output;
}

function base32Decode(value: string) {
  const normalized = value.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error("Invalid base32 secret");
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function deriveEncryptionKey(rootSecret: string) {
  if (rootSecret.trim().length < 32) {
    throw new Error("MFA encryption root secret is too short");
  }
  return Buffer.from(
    hkdfSync("sha256", Buffer.from(rootSecret), MFA_KEY_SALT, MFA_KEY_INFO, 32),
  );
}

function normalizeRecoveryCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function createTotpSecret() {
  return base32Encode(randomBytes(20));
}

export function createTotpUri(input: {
  secret: string;
  email: string;
  issuer?: string;
}) {
  const issuer = input.issuer ?? "LoyalFlow";
  const label = `${issuer}:${input.email.trim().toLowerCase()}`;
  const params = new URLSearchParams({
    secret: input.secret,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

export function generateTotpCode(secret: string, now = Date.now()) {
  const counter = Math.floor(now / 1000 / TOTP_PERIOD_SECONDS);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac("sha1", base32Decode(secret))
    .update(counterBuffer)
    .digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function verifyTotpCode(input: {
  secret: string;
  code: string;
  now?: number;
  window?: number;
}) {
  const code = input.code.trim();
  if (!/^\d{6}$/.test(code)) return false;

  const now = input.now ?? Date.now();
  const window = input.window ?? 1;
  for (let offset = -window; offset <= window; offset += 1) {
    const candidate = generateTotpCode(
      input.secret,
      now + offset * TOTP_PERIOD_SECONDS * 1000,
    );
    if (timingSafeEqual(Buffer.from(candidate), Buffer.from(code))) return true;
  }
  return false;
}

export function sealTotpSecret(secret: string, rootSecret: string) {
  const key = deriveEncryptionKey(rootSecret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(":");
}

export function openTotpSecret(sealed: string, rootSecret: string) {
  const [version, ivValue, tagValue, ciphertextValue] = sealed.split(":");
  if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Invalid MFA secret envelope");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveEncryptionKey(rootSecret),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function hashRecoveryCode(code: string) {
  return createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");
}

export function createRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(6).toString("hex").toUpperCase();
    return `${raw.slice(0, 6)}-${raw.slice(6)}`;
  });
}
