import { createHash, randomBytes, randomUUID } from "node:crypto";

export const OWNER_INVITATION_TTL_MS = 24 * 60 * 60 * 1000;
const LEGAL_INVITATION_TOKEN_PREFIX = "legal-v1";
const LEGAL_EFFECTIVE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type OwnerInvitationLegalAcceptance = Readonly<{
  effectiveDate: string;
  acceptedAt: Date;
}>;

export function hashOwnerInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function encodeLegalAcceptance(acceptance: OwnerInvitationLegalAcceptance) {
  if (!LEGAL_EFFECTIVE_DATE_PATTERN.test(acceptance.effectiveDate)) {
    throw new Error("Invalid legal effective date");
  }
  if (Number.isNaN(acceptance.acceptedAt.valueOf())) {
    throw new Error("Invalid legal acceptance timestamp");
  }

  return Buffer.from(
    JSON.stringify({
      effectiveDate: acceptance.effectiveDate,
      acceptedAt: acceptance.acceptedAt.toISOString(),
    }),
    "utf8",
  ).toString("base64url");
}

export function parseOwnerInvitationLegalAcceptance(
  token: string,
): OwnerInvitationLegalAcceptance | null {
  const parts = token.split(".");
  if (
    parts.length !== 3 ||
    parts[0] !== LEGAL_INVITATION_TOKEN_PREFIX ||
    !parts[1] ||
    !parts[2]
  ) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as { effectiveDate?: unknown; acceptedAt?: unknown };
    if (
      typeof decoded.effectiveDate !== "string" ||
      !LEGAL_EFFECTIVE_DATE_PATTERN.test(decoded.effectiveDate) ||
      typeof decoded.acceptedAt !== "string"
    ) {
      return null;
    }

    const acceptedAt = new Date(decoded.acceptedAt);
    if (
      Number.isNaN(acceptedAt.valueOf()) ||
      acceptedAt.toISOString() !== decoded.acceptedAt
    ) {
      return null;
    }

    return {
      effectiveDate: decoded.effectiveDate,
      acceptedAt,
    };
  } catch {
    return null;
  }
}

export function createOwnerInvitationToken(
  now = new Date(),
  legalAcceptance?: OwnerInvitationLegalAcceptance,
) {
  const secret = randomBytes(32).toString("base64url");
  const token = legalAcceptance
    ? `${LEGAL_INVITATION_TOKEN_PREFIX}.${encodeLegalAcceptance(legalAcceptance)}.${secret}`
    : secret;

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
  | { status: "success"; userId: string; email: string }
  | { status: "invalid_or_expired" }
  | { status: "email_unavailable" };

export type RedeemOwnerInvitationStore = {
  findInvitationByTokenHash(tokenHash: string): Promise<OwnerInvitationRecord | null>;
  findUserByEmail(email: string): Promise<{ id: string } | null>;
  consumeAndCreateOwner(input: {
    invitationId: string;
    expectedTokenHash: string;
    now: Date;
    legalAcceptance: OwnerInvitationLegalAcceptance | null;
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

  const legalAcceptance =
    invitation.source === "PUBLIC_TRIAL"
      ? parseOwnerInvitationLegalAcceptance(input.token)
      : null;
  if (legalAcceptance && legalAcceptance.acceptedAt > now) {
    return { status: "invalid_or_expired" };
  }

  const existingUser = await store.findUserByEmail(invitation.email);
  if (existingUser) {
    return { status: "email_unavailable" };
  }

  const result = await store.consumeAndCreateOwner({
    invitationId: invitation.id,
    expectedTokenHash: tokenHash,
    now,
    legalAcceptance,
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

  return result.status === "success"
    ? { ...result, email: invitation.email }
    : result;
}
