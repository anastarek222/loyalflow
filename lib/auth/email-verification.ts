import { createHash, randomBytes, randomUUID } from "node:crypto";

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export type EmailVerificationTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export type VerifyEmailResult =
  | { status: "success"; userId: string }
  | { status: "invalid_or_expired" };

export type EmailVerificationStore = {
  findTokenByHash(tokenHash: string): Promise<EmailVerificationTokenRecord | null>;
  consumeAndVerify(input: {
    tokenId: string;
    userId: string;
    expectedTokenHash: string;
    now: Date;
  }): Promise<VerifyEmailResult>;
};

export function hashEmailVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createEmailVerificationToken(now = new Date()) {
  const token = randomBytes(32).toString("base64url");

  return {
    id: randomUUID(),
    token,
    tokenHash: hashEmailVerificationToken(token),
    expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS),
  };
}

export async function verifyEmailWithStore(
  input: { token: string; now?: Date },
  store: EmailVerificationStore,
): Promise<VerifyEmailResult> {
  const now = input.now ?? new Date();
  const tokenHash = hashEmailVerificationToken(input.token);
  const record = await store.findTokenByHash(tokenHash);

  if (!record || record.usedAt || record.expiresAt <= now) {
    return { status: "invalid_or_expired" };
  }

  return store.consumeAndVerify({
    tokenId: record.id,
    userId: record.userId,
    expectedTokenHash: tokenHash,
    now,
  });
}
