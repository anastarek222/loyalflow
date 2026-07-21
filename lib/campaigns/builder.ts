export const campaignTriggers = [
  "WELCOME",
  "BALANCE_UPDATED",
  "REWARD_READY",
  "ONE_AWAY",
  "WIN_BACK",
] as const;

export type CampaignTrigger = (typeof campaignTriggers)[number];

export const campaignAudiences = [
  "ALL",
  "NEW",
  "ACTIVE",
  "AT_RISK",
  "INACTIVE",
  "REWARD_READY",
  "ONE_AWAY",
] as const;

export type CampaignAudience = (typeof campaignAudiences)[number];

export const ONE_AWAY_TEMPLATE =
  "أهلاً {customer} 👋\n\n" +
  "أنت على بُعد خطوة واحدة من {reward} لدى {business}.\n" +
  "متبقي {remaining} {unit}.\n\n" +
  "تابع كارتك من هنا:\n{card_link}";

export function getDefaultCampaignAudience(
  trigger: CampaignTrigger
): CampaignAudience {
  switch (trigger) {
    case "WELCOME":
      return "NEW";
    case "REWARD_READY":
      return "REWARD_READY";
    case "ONE_AWAY":
      return "ONE_AWAY";
    case "WIN_BACK":
      return "INACTIVE";
    default:
      return "ACTIVE";
  }
}

export function appendCampaignOffer(message: string, offer: string) {
  const normalizedOffer = offer.trim();
  if (!normalizedOffer) return message;

  return `${message.trim()}\n\n${normalizedOffer}`;
}
