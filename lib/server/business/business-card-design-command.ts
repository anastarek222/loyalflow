import type { getAuthorizedCardDesignUpdate } from "@/lib/cards/card-design-permissions";
import { updateBusinessSettingsCommand } from "@/lib/server/business/settings-command";

type AuthorizedCardDesignData = Extract<
  ReturnType<typeof getAuthorizedCardDesignUpdate>,
  { allowed: true }
>["data"];

export type BusinessCardDesignActor = Parameters<
  typeof updateBusinessSettingsCommand
>[0]["user"];

/**
 * Semantic TC5 boundary for an already-authorized loyalty-card design update.
 *
 * Role/current-mode authorization, file parsing and logo resolution stay in the
 * Server Action. The shared settings command remains the persistence authority
 * for persisted OPERATE enforcement and the atomic Business + audit write.
 */
export async function updateBusinessCardDesignCommand(input: {
  businessId: string;
  actor: BusinessCardDesignActor;
  authorizedData: AuthorizedCardDesignData;
  logoUrl: string | null;
}) {
  return updateBusinessSettingsCommand({
    businessId: input.businessId,
    user: input.actor,
    description: "تم تحديث تصميم بطاقة الولاء",
    data: {
      ...input.authorizedData,
      logoUrl: input.logoUrl,
    },
    enforceOperateEntitlement: true,
  });
}
