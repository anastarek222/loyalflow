import type { Prisma } from "@/generated/prisma/client";

export type CustomerWhatsAppConsentState = Readonly<{
  whatsappPhoneE164: string | null;
  whatsappOptInAt: Date | null;
  whatsappOptedOutAt: Date | null;
}>;

type CustomerWhatsAppConsentRow = Readonly<{
  whatsappPhoneE164: string | null;
  whatsappOptInAt: Date | null;
  whatsappOptedOutAt: Date | null;
}>;

export async function getCustomerWhatsAppConsentState(
  client: Prisma.TransactionClient,
  input: Readonly<{ businessId: string; customerId: string }>,
): Promise<CustomerWhatsAppConsentState | null> {
  const rows = await client.$queryRaw<CustomerWhatsAppConsentRow[]>`
    SELECT
      customer."whatsappPhoneE164",
      customer."whatsappOptInAt",
      customer."whatsappOptedOutAt"
    FROM "Customer" AS customer
    WHERE customer."businessId" = ${input.businessId}
      AND customer."id" = ${input.customerId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function persistCustomerWhatsAppPhone(
  client: Prisma.TransactionClient,
  input: Readonly<{
    businessId: string;
    customerId: string;
    whatsappPhoneE164: string;
  }>,
) {
  return client.$executeRaw`
    UPDATE "Customer"
    SET "whatsappPhoneE164" = ${input.whatsappPhoneE164}
    WHERE "businessId" = ${input.businessId}
      AND "id" = ${input.customerId}
  `;
}

export async function setCustomerWhatsAppConsent(
  client: Prisma.TransactionClient,
  input: Readonly<{
    businessId: string;
    customerId: string;
    consent: "OPT_IN" | "OPT_OUT";
    changedAt: Date;
  }>,
) {
  if (input.consent === "OPT_IN") {
    return client.$executeRaw`
      UPDATE "Customer"
      SET
        "whatsappOptInAt" = COALESCE("whatsappOptInAt", ${input.changedAt}),
        "whatsappOptedOutAt" = NULL
      WHERE "businessId" = ${input.businessId}
        AND "id" = ${input.customerId}
    `;
  }

  return client.$executeRaw`
    UPDATE "Customer"
    SET "whatsappOptedOutAt" = COALESCE("whatsappOptedOutAt", ${input.changedAt})
    WHERE "businessId" = ${input.businessId}
      AND "id" = ${input.customerId}
  `;
}

export function canDeliverAutomaticWhatsApp(
  state: CustomerWhatsAppConsentState | null,
) {
  return Boolean(
    state?.whatsappPhoneE164 &&
      state.whatsappOptInAt &&
      !state.whatsappOptedOutAt,
  );
}
