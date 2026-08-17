"use server";

import { auth } from "@/auth";
import { createOwnerInvitationToken } from "@/lib/auth/owner-invitation";
import {
  OwnerInvitationEmailError,
  sendOwnerInvitationEmail,
} from "@/lib/auth/owner-invitation-email";
import { getSafeImageDataUrl } from "@/lib/branding/image-data";
import { businessCreationSchema, ownerInvitationSchema } from "@/lib/business/creation-input";
import { parseDateOnly, parseMoneyToMinor } from "@/lib/billing/subscription";
import {
  createWithGeneratedSlug,
  isUniqueConstraintError,
  optionalBusinessPhoneValue,
  optionalOwnerPhoneValue,
  optionalProfileValue,
} from "@/lib/business-profile";
import prisma from "@/lib/prisma";
import { scheduleBusinessGoogleSheetsSync } from "@/lib/google-sheets-sync-scheduler";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { logServerEvent } from "@/lib/server/logging";
import { enqueueIntegrationJob } from "@/lib/server/integrations/outbox";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");
}

export async function createOwnerInvitationAction(formData: FormData) {
  await requireSuperAdmin();

  const parsed = ownerInvitationSchema.safeParse({
    ownerFirstName: formData.get("ownerFirstName"),
    ownerLastName: formData.get("ownerLastName") ?? "",
    ownerEmail: formData.get("ownerEmail"),
  });

  if (!parsed.success) redirect("/businesses?error=invitation-invalid");

  const email = parsed.data.ownerEmail.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) redirect("/businesses?error=owner-email");

  const invitation = createOwnerInvitationToken();

  try {
    await prisma.$executeRaw`
      INSERT INTO "OwnerInvitation" (
        "id", "firstName", "lastName", "email", "tokenHash", "expiresAt", "usedAt", "createdAt"
      )
      VALUES (
        ${invitation.id},
        ${parsed.data.ownerFirstName},
        ${parsed.data.ownerLastName || null},
        ${email},
        ${invitation.tokenHash},
        ${invitation.expiresAt},
        NULL,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("email") DO UPDATE SET
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        "tokenHash" = EXCLUDED."tokenHash",
        "expiresAt" = EXCLUDED."expiresAt",
        "usedAt" = NULL
    `;

    await sendOwnerInvitationEmail({
      email,
      token: invitation.token,
    });
  } catch (error) {
    if (
      isUniqueConstraintError(error) ||
      error instanceof OwnerInvitationEmailError
    ) {
      redirect("/businesses?error=invite-unavailable");
    }

    throw error;
  }

  revalidatePath("/businesses");
  revalidatePath("/business-owners");
  revalidatePath("/dashboard");
  redirect("/businesses?created=invitation");
}

export async function createBusinessAction(formData: FormData) {
  const creationAttemptId = randomUUID();
  logServerEvent("BUSINESS_CREATE_SUBMIT_START", { creationAttemptId });
  await requireSuperAdmin();
  logServerEvent("BUSINESS_CREATE_ACTION_ENTERED", { creationAttemptId });

  const submittedLogoDataUrl = String(formData.get("logoDataUrl") ?? "");
  const uploadedLogoDataUrl = getSafeImageDataUrl(submittedLogoDataUrl, 500 * 1024);

  if (submittedLogoDataUrl && !uploadedLogoDataUrl) {
    redirect("/businesses?error=invalid");
  }

  const parsed = businessCreationSchema.safeParse({
    name: formData.get("name"),
    contactPhone: formData.get("contactPhone") ?? "",
    currency: formData.get("currency") ?? "",
    timezone: formData.get("timezone") ?? "",
    industry: formData.get("industry") ?? "",
    website: formData.get("website") ?? "",
    email: formData.get("email") ?? "",
    country: formData.get("country") ?? "",
    city: formData.get("city") ?? "",
    taxNumber: formData.get("taxNumber") ?? "",
    employeeCount: formData.get("employeeCount") ?? 0,
    ownerFirstName: formData.get("ownerFirstName"),
    ownerLastName: formData.get("ownerLastName") ?? "",
    ownerEmail: formData.get("ownerEmail"),
    ownerPhone: formData.get("ownerPhone") ?? "",
    ownerPassword: formData.get("ownerPassword"),
    logoUrl: formData.get("logoUrl") ?? "",
    loyaltyMode: formData.get("loyaltyMode"),
    unitName: formData.get("unitName"),
    rewardName: formData.get("rewardName"),
    rewardThreshold: formData.get("rewardThreshold"),
    earnAmount: formData.get("earnAmount"),
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    themePreset: formData.get("themePreset") ?? "DEFAULT",
    cardStyle: formData.get("cardStyle") ?? "CLASSIC",
    fontFamily: formData.get("fontFamily") ?? "INTER",
    standardCardArtworkEnabled: formData.get("standardCardArtworkEnabled") ?? false,
    standardCardArtworkCategory: formData.get("standardCardArtworkCategory") ?? "OTHER",
    cardDesignMode: formData.get("cardDesignMode") ?? "STANDARD",
    customCardArtworkEnabled: formData.get("customCardArtworkEnabled") ?? false,
    customCardFrontArtworkUrl: formData.get("customCardFrontArtworkUrl") ?? "",
    customCardBackArtworkUrl: formData.get("customCardBackArtworkUrl") ?? "",
    customCardSafeZoneVersion: formData.get("customCardSafeZoneVersion") ?? "ID1_V1",
    billingInterval: formData.get("billingInterval") ?? "MONTHLY",
    billingCustomDays: formData.get("billingCustomDays") || undefined,
    subscriptionStartDate: formData.get("subscriptionStartDate") ?? "",
    nextPaymentDate: formData.get("nextPaymentDate") ?? "",
    lastPaymentDate: formData.get("lastPaymentDate") ?? "",
    subscriptionAmount: formData.get("subscriptionAmount") ?? "",
    billingCurrency: formData.get("billingCurrency") ?? formData.get("currency") ?? "EGP",
    paymentStatus: formData.get("paymentStatus") ?? "TRIAL",
    gracePeriodDays: formData.get("gracePeriodDays") ?? 3,
    paymentMethod: formData.get("paymentMethod") ?? "",
    billingNotes: formData.get("billingNotes") ?? "",
    adminNotes: formData.get("adminNotes") ?? "",
    plan: formData.get("plan") ?? "FREE",
  });

  if (!parsed.success) {
    redirect("/businesses?error=invalid");
  }
  logServerEvent("BUSINESS_CREATE_VALIDATION_OK", { creationAttemptId });

  const finalLogoUrl = uploadedLogoDataUrl ?? (parsed.data.logoUrl || null);
  logServerEvent("BUSINESS_CREATE_LOGO_OK", {
    creationAttemptId,
    logoConfigured: Boolean(finalLogoUrl),
  });

  const ownerEmail = parsed.data.ownerEmail.toLowerCase();

  const existingOwner = await prisma.user.findUnique({
    where: { email: ownerEmail },
    select: { id: true },
  });

  if (existingOwner) {
    redirect("/businesses?error=owner-email");
  }

  const ownerPasswordHash = await hash(parsed.data.ownerPassword, 12);
  logServerEvent("BUSINESS_CREATE_HASH_OK", { creationAttemptId });

  let createdBusiness;
  let integrationJobId;

  try {
    logServerEvent("BUSINESS_CREATE_TX_START", { creationAttemptId });
    const creationResult = await createWithGeneratedSlug(
      parsed.data.name,
      (slug) =>
        prisma.$transaction(async (transaction) => {
          const business = await transaction.business.create({
            data: {
              name: parsed.data.name,
              slug,
              logoUrl: finalLogoUrl,
              contactPhone: optionalBusinessPhoneValue(parsed.data.contactPhone),
              currency: optionalProfileValue(parsed.data.currency),
              timezone: optionalProfileValue(parsed.data.timezone),
              industry: optionalProfileValue(parsed.data.industry),
              website: optionalProfileValue(parsed.data.website),
              email: optionalProfileValue(parsed.data.email),
              country: optionalProfileValue(parsed.data.country),
              city: optionalProfileValue(parsed.data.city),
              taxNumber: optionalProfileValue(parsed.data.taxNumber),
              employeeCount: parsed.data.employeeCount,
              billingInterval: parsed.data.billingInterval,
              billingCustomDays:
                parsed.data.billingInterval === "CUSTOM"
                  ? parsed.data.billingCustomDays ?? null
                  : null,
              subscriptionStartDate: parseDateOnly(parsed.data.subscriptionStartDate),
              nextPaymentDate: parseDateOnly(parsed.data.nextPaymentDate),
              lastPaymentDate: parseDateOnly(parsed.data.lastPaymentDate),
              subscriptionAmountMinor: parseMoneyToMinor(parsed.data.subscriptionAmount),
              billingCurrency: parsed.data.billingCurrency || parsed.data.currency || "EGP",
              paymentStatus: parsed.data.paymentStatus,
              gracePeriodDays: parsed.data.gracePeriodDays,
              paymentMethod: parsed.data.paymentMethod || null,
              billingNotes: parsed.data.billingNotes || null,
              adminNotes: parsed.data.adminNotes || null,
              plan: parsed.data.plan,
              loyaltyMode: parsed.data.loyaltyMode,
              unitName: parsed.data.unitName,
              rewardName: parsed.data.rewardName,
              rewardThreshold: parsed.data.rewardThreshold,
              earnAmount: parsed.data.earnAmount,
              primaryColor: parsed.data.primaryColor,
              secondaryColor: parsed.data.secondaryColor,
              themePreset: parsed.data.themePreset,
              cardStyle: parsed.data.cardStyle,
              fontFamily: parsed.data.fontFamily,
              standardCardArtworkEnabled: parsed.data.standardCardArtworkEnabled,
              standardCardArtworkCategory: parsed.data.standardCardArtworkCategory,
              ...(parsed.data.cardDesignMode === "CUSTOM"
                ? {
                    cardDesignMode: parsed.data.cardDesignMode,
                    customCardArtworkEnabled: parsed.data.customCardArtworkEnabled,
                    customCardFrontArtworkUrl: parsed.data.customCardFrontArtworkUrl || null,
                    customCardBackArtworkUrl: parsed.data.customCardBackArtworkUrl || null,
                    customCardSafeZoneVersion: parsed.data.customCardSafeZoneVersion,
                  }
                : {}),
            },
            select: { id: true, slug: true },
          });
          logServerEvent("BUSINESS_CREATE_BUSINESS_CREATED", {
            creationAttemptId,
            businessId: business.id,
          });

          const owner = await transaction.user.create({
            data: {
              firstName: parsed.data.ownerFirstName,
              lastName: parsed.data.ownerLastName || null,
              email: ownerEmail,
              phone: optionalOwnerPhoneValue(parsed.data.ownerPhone),
              passwordHash: ownerPasswordHash,
              role: "OWNER",
              businessId: business.id,
              isActive: true,
            },
          });
          logServerEvent("BUSINESS_CREATE_OWNER_CREATED", {
            creationAttemptId,
            businessId: business.id,
            ownerId: owner.id,
          });

          await transaction.$executeRaw`
            INSERT INTO "EmailVerificationState" (
              "userId", "verifiedAt", "createdAt", "updatedAt"
            ) VALUES (
              ${owner.id}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
          `;

          const integrationJob = await enqueueIntegrationJob(transaction, {
            businessId: business.id,
            kind: "GOOGLE_SHEETS_BUSINESS_SYNC",
            idempotencyKey: `business-created:${business.id}`,
          });

          return { business, integrationJobId: integrationJob.id };
        }),
    );
    createdBusiness = creationResult.business;
    integrationJobId = creationResult.integrationJobId;
    logServerEvent("BUSINESS_CREATE_TX_COMMITTED", {
      creationAttemptId,
      businessId: createdBusiness.id,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "SAFE_SLUG_GENERATION_FAILED"
    ) {
      redirect("/businesses?error=slug-generation");
    }

    throw error;
  }

  scheduleBusinessGoogleSheetsSync(integrationJobId);
  logServerEvent("BUSINESS_CREATE_SYNC_SCHEDULED", {
    creationAttemptId,
    businessId: createdBusiness.id,
  });

  revalidatePath("/businesses");
  revalidatePath("/dashboard");

  logServerEvent("BUSINESS_CREATE_REDIRECT_STARTED", {
    creationAttemptId,
    businessId: createdBusiness.id,
  });
  redirect(`/businesses/${createdBusiness.slug}/users?created=business&sheetSync=pending`);
}
