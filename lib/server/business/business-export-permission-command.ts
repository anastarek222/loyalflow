import { updateBusinessSettingsCommand } from "@/lib/server/business/settings-command";

export type BusinessExportPermissionActor = Parameters<
  typeof updateBusinessSettingsCommand
>[0]["user"];

/**
 * Semantic TC5 boundary for the owner data-export permission.
 *
 * SUPER_ADMIN authorization and unchanged-value replay stay in the action.
 * The shared settings command remains the persistence authority for the
 * changed permission, persisted OPERATE enforcement, and atomic settings audit.
 */
export async function updateBusinessExportPermissionCommand(input: {
  businessId: string;
  actor: BusinessExportPermissionActor;
  allowOwnerDataExport: boolean;
}) {
  return updateBusinessSettingsCommand({
    businessId: input.businessId,
    user: input.actor,
    description: input.allowOwnerDataExport
      ? "تم السماح لمالك النشاط بتصدير البيانات"
      : "تم إيقاف صلاحية تصدير البيانات عن مالك النشاط",
    data: {
      allowOwnerDataExport: input.allowOwnerDataExport,
    },
    enforceOperateEntitlement: true,
  });
}
