import { updateBusinessSettingsCommand } from "@/lib/server/business/settings-command";

export type BusinessCardDetailsActor = Parameters<
  typeof updateBusinessSettingsCommand
>[0]["user"];

/**
 * Semantic TC5 boundary for digital-card business details.
 *
 * The shared settings command remains the persistence authority. This wrapper
 * fixes the domain payload, audit description, and authoritative OPERATE
 * enforcement so the Server Action wiring can stay presentation-only.
 */
export async function updateBusinessCardDetailsCommand(input: {
  businessId: string;
  actor: BusinessCardDetailsActor;
  contactPhone: string;
  address: string;
  cardTerms: string;
}) {
  return updateBusinessSettingsCommand({
    businessId: input.businessId,
    user: input.actor,
    description: "تم تحديث بيانات التواصل وشروط الكارت الرقمي",
    data: {
      contactPhone: input.contactPhone,
      address: input.address,
      cardTerms: input.cardTerms,
    },
    enforceOperateEntitlement: true,
  });
}
