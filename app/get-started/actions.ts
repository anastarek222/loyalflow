"use server";

import { createOwnerInvitationToken } from "@/lib/auth/owner-invitation";
import { sendOwnerInvitationEmail } from "@/lib/auth/owner-invitation-email";
import {
  createPublicTrialIdentityKey,
  parsePublicTrialInput,
  PUBLIC_TRIAL_IDENTITY_LIMIT,
  PUBLIC_TRIAL_IP_LIMIT,
  PUBLIC_TRIAL_RATE_WINDOW_MS,
} from "@/lib/acquisition/public-trial";
import prisma from "@/lib/prisma";
import { logServerError } from "@/lib/server/logging";
import {
  distributedRateLimit,
  getClientAddress,
} from "@/lib/utils/rate-limiter";
import { headers } from "next/headers";

export type PublicTrialFormState = {
  status?:
    | "submitted"
    | "validation-error"
    | "rate-limited"
    | "service-unavailable";
};

type ReservedInvitation = {
  id: string;
  tokenHash: string;
};

async function reservePublicTrialInvitation(input: {
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string;
  businessName: string;
  country: string;
  invitation: ReturnType<typeof createOwnerInvitationToken>;
}): Promise<ReservedInvitation | null> {
  return prisma.$transaction(async (transaction) => {
    const existingUser = await transaction.user.findFirst({
      where: {
        OR: [{ email: input.email }, { phone: input.phone }],
      },
      select: { id: true },
    });
    if (existingUser) return null;

    const existingRows = await transaction.$queryRaw<
      Array<{
        id: string;
        email: string;
        phone: string | null;
        source: "MANAGED" | "PUBLIC_TRIAL";
        tokenHash: string;
        usedAt: Date | null;
      }>
    >`
      SELECT "id", "email", "phone", "source", "tokenHash", "usedAt"
      FROM "OwnerInvitation"
      WHERE "email" = ${input.email}
         OR "phone" = ${input.phone}
      LIMIT 1
    `;
    const existing = existingRows[0];

    if (existing) {
      const sameUnusedPublicIdentity =
        existing.source === "PUBLIC_TRIAL" &&
        existing.usedAt === null &&
        existing.email === input.email &&
        existing.phone === input.phone;
      if (!sameUnusedPublicIdentity) return null;

      const refreshed = await transaction.$queryRaw<Array<{ id: string }>>`
        UPDATE "OwnerInvitation"
        SET "firstName" = ${input.firstName},
            "lastName" = ${input.lastName},
            "businessName" = ${input.businessName},
            "country" = ${input.country},
            "tokenHash" = ${input.invitation.tokenHash},
            "expiresAt" = ${input.invitation.expiresAt},
            "createdAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${existing.id}
          AND "tokenHash" = ${existing.tokenHash}
          AND "usedAt" IS NULL
          AND "source" = 'PUBLIC_TRIAL'::"OwnerInvitationSource"
        RETURNING "id"
      `;

      return refreshed.length === 1
        ? { id: refreshed[0].id, tokenHash: input.invitation.tokenHash }
        : null;
    }

    const inserted = await transaction.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "OwnerInvitation" (
        "id", "firstName", "lastName", "email", "phone", "businessName",
        "country", "source", "tokenHash", "expiresAt", "usedAt", "createdAt"
      )
      VALUES (
        ${input.invitation.id}, ${input.firstName}, ${input.lastName},
        ${input.email}, ${input.phone}, ${input.businessName}, ${input.country},
        'PUBLIC_TRIAL'::"OwnerInvitationSource", ${input.invitation.tokenHash},
        ${input.invitation.expiresAt}, NULL, CURRENT_TIMESTAMP
      )
      ON CONFLICT DO NOTHING
      RETURNING "id"
    `;

    return inserted.length === 1
      ? { id: inserted[0].id, tokenHash: input.invitation.tokenHash }
      : null;
  });
}

async function releaseUndeliveredInvitation(invitation: ReservedInvitation) {
  await prisma.$executeRaw`
    DELETE FROM "OwnerInvitation"
    WHERE "id" = ${invitation.id}
      AND "tokenHash" = ${invitation.tokenHash}
      AND "usedAt" IS NULL
      AND "source" = 'PUBLIC_TRIAL'::"OwnerInvitationSource"
  `;
}

export async function startPublicTrialAction(
  _previousState: PublicTrialFormState,
  formData: FormData,
): Promise<PublicTrialFormState> {
  const requestHeaders = await headers();
  const address = getClientAddress(requestHeaders);
  const addressLimit = await distributedRateLimit(
    `public-trial-address:${address}`,
    {
      limit: PUBLIC_TRIAL_IP_LIMIT,
      windowMs: PUBLIC_TRIAL_RATE_WINDOW_MS,
    },
  );
  if (!addressLimit.allowed) return { status: "rate-limited" };

  // Bot submissions receive the same neutral terminal response as ineligible
  // identities and never reach persistence or email delivery.
  if (String(formData.get("companyWebsite") ?? "").trim()) {
    return { status: "submitted" };
  }

  const input = parsePublicTrialInput({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") ?? "",
    email: formData.get("email"),
    phone: formData.get("phone"),
    businessName: formData.get("businessName"),
    country: formData.get("country"),
    acceptTerms: formData.get("acceptTerms"),
  });
  if (!input) return { status: "validation-error" };

  const identityLimit = await distributedRateLimit(
    `public-trial-identity:${createPublicTrialIdentityKey(input)}`,
    {
      limit: PUBLIC_TRIAL_IDENTITY_LIMIT,
      windowMs: PUBLIC_TRIAL_RATE_WINDOW_MS,
    },
  );
  if (!identityLimit.allowed) return { status: "rate-limited" };

  const token = createOwnerInvitationToken();
  let reserved: ReservedInvitation | null;

  try {
    reserved = await reservePublicTrialInvitation({
      ...input,
      invitation: token,
    });
  } catch (error) {
    logServerError("PUBLIC_TRIAL_RESERVATION_FAILED", error);
    return { status: "service-unavailable" };
  }

  // Existing accounts, used trials, and identity collisions intentionally share
  // the public success response. No account or eligibility state is disclosed.
  if (!reserved) return { status: "submitted" };

  try {
    await sendOwnerInvitationEmail({ email: input.email, token: token.token });
  } catch (error) {
    try {
      await releaseUndeliveredInvitation(reserved);
    } catch (cleanupError) {
      logServerError("PUBLIC_TRIAL_EMAIL_CLEANUP_FAILED", cleanupError);
    }
    logServerError("PUBLIC_TRIAL_EMAIL_DELIVERY_FAILED", error);
    return { status: "service-unavailable" };
  }

  return { status: "submitted" };
}
