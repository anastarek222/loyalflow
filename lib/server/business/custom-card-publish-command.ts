import { updateBusinessSettingsCommand } from "@/lib/server/business/settings-command";

export type CustomCardPublishActor = Parameters<
  typeof updateBusinessSettingsCommand
>[0]["user"];

/**
 * Semantic TC5 persistence boundary for publishing an already-resolved Custom
 * Card artwork version.
 *
 * SUPER_ADMIN authorization, version parsing, storage lookup and artwork URL
 * resolution remain in the Server Action. This command owns only the Business
 * persistence payload, persisted OPERATE enforcement and atomic settings audit
 * through the shared settings authority. A null back URL intentionally selects
 * the canonical renderer-generated safe back rather than another stored asset.
 */
export async function publishCustomCardArtworkCommand(input: {
  businessId: string;
  actor: CustomCardPublishActor;
  version: string;
  frontUrl: string;
  backUrl: string | null;
}) {
  return updateBusinessSettingsCommand({
    businessId: input.businessId,
    user: input.actor,
    description: `تم نشر نسخة جديدة من تصميم بطاقة الولاء (${input.version})`,
    data: {
      cardDesignMode: "CUSTOM",
      customCardArtworkEnabled: true,
      customCardFrontArtworkUrl: input.frontUrl,
      customCardBackArtworkUrl: input.backUrl,
      customCardSafeZoneVersion: "ID1_V1",
    },
    enforceOperateEntitlement: true,
  });
}
