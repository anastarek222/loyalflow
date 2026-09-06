import { createHash } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import type { AutomaticCustomerMessageEvent } from "@/lib/server/integrations/customer-messaging";

export const WHATSAPP_TEMPLATE_APPROVAL_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;

export type WhatsAppTemplateApprovalStatus =
  (typeof WHATSAPP_TEMPLATE_APPROVAL_STATUSES)[number];

export type BusinessWhatsAppTemplateBinding = Readonly<{
  businessId: string;
  event: AutomaticCustomerMessageEvent;
  language: "AR" | "EN";
  templateName: string;
  templateLanguageCode: string;
  contentSha256: string;
  approvalStatus: WhatsAppTemplateApprovalStatus;
  providerTemplateId: string | null;
  providerStatusUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>;

type BindingClient = Pick<Prisma.TransactionClient, "$queryRaw">;

export function hashBusinessWhatsAppTemplate(template: string) {
  return createHash("sha256").update(template.trim(), "utf8").digest("hex");
}

export async function getBusinessWhatsAppTemplateBinding(
  client: BindingClient,
  input: Readonly<{
    businessId: string;
    event: AutomaticCustomerMessageEvent;
    language: "AR" | "EN";
  }>,
): Promise<BusinessWhatsAppTemplateBinding | null> {
  const rows = await client.$queryRaw<BusinessWhatsAppTemplateBinding[]>`
    SELECT
      "businessId",
      "event",
      "language",
      "templateName",
      "templateLanguageCode",
      "contentSha256",
      "approvalStatus",
      "providerTemplateId",
      "providerStatusUpdatedAt",
      "createdAt",
      "updatedAt"
    FROM "BusinessWhatsAppTemplateBinding"
    WHERE "businessId" = ${input.businessId}
      AND "event" = ${input.event}
      AND "language" = ${input.language}
    LIMIT 1
  `;
  return rows[0] ?? null;
}
