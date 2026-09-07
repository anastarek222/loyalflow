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
