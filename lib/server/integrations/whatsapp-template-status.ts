import prisma from "@/lib/prisma";
import type { WhatsAppTemplateApprovalStatus } from "@/lib/server/integrations/business-whatsapp-template-bindings";

type TemplateStatusUpdate = Readonly<{
  wabaId: string;
  templateName: string;
  templateLanguageCode: string;
  providerTemplateId: string | null;
  approvalStatus: WhatsAppTemplateApprovalStatus;
}>;

function normalizeText(value: unknown, maxLength: number) {
  const text =
    typeof value === "string"
      ? value.trim()
      : typeof value === "number" && Number.isFinite(value)
        ? String(value)
        : "";
  return text.length > 0 && text.length <= maxLength ? text : null;
}

function normalizeTemplateStatus(value: unknown): WhatsAppTemplateApprovalStatus {
  const status = typeof value === "string" ? value.trim().toUpperCase() : "";
  return status === "APPROVED" || status === "PENDING" || status === "REJECTED"
    ? status
    : "UNKNOWN";
}

export function extractWhatsAppTemplateStatusUpdates(
  payload: unknown,
): TemplateStatusUpdate[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const payloadRecord = payload as Record<string, unknown>;
  if (payloadRecord.object !== "whatsapp_business_account") return [];
  const entries = payloadRecord.entry;
  if (!Array.isArray(entries)) return [];

  const updates: TemplateStatusUpdate[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const entryRecord = entry as Record<string, unknown>;
    const wabaId = normalizeText(entryRecord.id, 80);
    if (!wabaId) continue;
    const changes = entryRecord.changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      if (!change || typeof change !== "object" || Array.isArray(change)) continue;
      const changeRecord = change as Record<string, unknown>;
      if (changeRecord.field !== "message_template_status_update") continue;
      const value = changeRecord.value;
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const valueRecord = value as Record<string, unknown>;

      const templateName = normalizeText(valueRecord.message_template_name, 512);
      const templateLanguageCode = normalizeText(
        valueRecord.message_template_language,
        32,
      );
      if (!templateName || !templateLanguageCode) continue;

      updates.push({
        wabaId,
        templateName,
        templateLanguageCode,
        providerTemplateId: normalizeText(valueRecord.message_template_id, 128),
        approvalStatus: normalizeTemplateStatus(
          valueRecord.event ?? valueRecord.status,
        ),
      });
    }
  }

  return updates;
}

export async function persistWhatsAppTemplateStatusFromWebhook(payload: unknown) {
  const updates = extractWhatsAppTemplateStatusUpdates(payload);
  let updatedCount = 0;

  for (const update of updates) {
    const changed = update.providerTemplateId
      ? await prisma.$executeRaw`
          UPDATE "BusinessWhatsAppTemplateBinding"
          SET
            "approvalStatus" = ${update.approvalStatus},
            "providerTemplateId" = COALESCE(
              "providerTemplateId",
              ${update.providerTemplateId}
            ),
            "providerStatusUpdatedAt" = CURRENT_TIMESTAMP,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "wabaId" = ${update.wabaId}
            AND "templateName" = ${update.templateName}
            AND "templateLanguageCode" = ${update.templateLanguageCode}
            AND (
              "providerTemplateId" IS NULL
              OR "providerTemplateId" = ${update.providerTemplateId}
            )
        `
      : await prisma.$executeRaw`
          UPDATE "BusinessWhatsAppTemplateBinding"
          SET
            "approvalStatus" = ${update.approvalStatus},
            "providerStatusUpdatedAt" = CURRENT_TIMESTAMP,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "wabaId" = ${update.wabaId}
            AND "templateName" = ${update.templateName}
            AND "templateLanguageCode" = ${update.templateLanguageCode}
        `;

    updatedCount += changed;
  }

  return updatedCount;
}
