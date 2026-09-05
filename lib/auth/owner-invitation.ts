import { createHash, randomBytes, randomUUID } from "node:crypto";

export const OWNER_INVITATION_TTL_MS = 24 * 60 * 60 * 1000;

export function hashOwnerInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createOwnerInvitationToken(now = new Date()) {
  const token = randomBytes(32).toString("base64url");

  return {
    id: randomUUID(),
    token,
    tokenHash: hashOwnerInvitationToken(token),
    expiresAt: new Date(now.getTime() + OWNER_INVITATION_TTL_MS),
  };
}

export type OwnerInvitationRecord = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  businessName: string | null;
  country: string | null;
  source: "MANAGED" | "PUBLIC_TRIAL";
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export type RedeemOwnerInvitationResult =
  | { status: "success"; userId: string }
  | { status: "invalid_or_expired" }
  | { status: "email_unavailable" };

export type RedeemOwnerInvitationStore = {
  findInvitationByTokenHash(tokenHash: string): Promise<OwnerInvitationRecord | null>;
  findUserByEmail(email: string): Promise<{ id: string } | null>;
  consumeAndCreateOwner(input: {
    invitationId: string;
    expectedTokenHash: string;
    now: Date;
    owner: {
      firstName: string;
      lastName: string | null;
      email: string;
      phone: string | null;
      passwordHash: string;
      role: "OWNER";
      isActive: true;
      onboardingStatus: "PENDING";
      onboardingData?: {
        name?: string;
        country?: string;
      };
    };
  }): Promise<
    | { status: "success"; userId: string }
    | { status: "invalid_or_expired" }
  >;
};

export async function redeemOwnerInvitationWithStore(
  input: { token: string; passwordHash: string; now?: Date },
  store: RedeemOwnerInvitationStore,
): Promise<RedeemOwnerInvitationResult> {
  const now = input.now ?? new Date();
  const tokenHash = hashOwnerInvitationToken(input.token);
  const invitation = await store.findInvitationByTokenHash(tokenHash);

  if (!invitation || invitation.usedAt !== null || invitation.expiresAt <= now) {
    return { status: "invalid_or_expired" };
  }

  const existingUser = await store.findUserByEmail(invitation.email);
  if (existingUser) {
    return { status: "email_unavailable" };
  }

  return store.consumeAndCreateOwner({
    invitationId: invitation.id,
    expectedTokenHash: tokenHash,
    now,
    owner: {
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      email: invitation.email,
      phone: invitation.phone,
      passwordHash: input.passwordHash,
      role: "OWNER",
      isActive: true,
      onboardingStatus: "PENDING",
      ...(invitation.source === "PUBLIC_TRIAL"
        ? {
            onboardingData: {
              ...(invitation.businessName
                ? { name: invitation.businessName }
                : {}),
              ...(invitation.country ? { country: invitation.country } : {}),
            },
          }
        : {}),
    },
  });
}
