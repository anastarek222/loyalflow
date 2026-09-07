import type { LoyaltyMode, Prisma } from "@/generated/prisma/client";
import { getCustomerSegmentWhere } from "@/lib/customers/segments";
import { renderWhatsAppTemplate } from "@/lib/whatsapp-templates";

export const winBackAudiences = ["INACTIVE", "AT_RISK"] as const;

export type WinBackAudience = (typeof winBackAudiences)[number];

export function getWinBackAudienceWhere(
  audience: WinBackAudience,
  input: {
    rewardThreshold: number;
    earnAmount: number;
    now?: Date;
  }
): Prisma.CustomerWhereInput {
  return getCustomerSegmentWhere(
    audience,
    input.rewardThreshold,
    input.now,
    input.earnAmount
  );
}

export function getWinBackMessage(input: {
  customer: string;
  business: string;
  balance: number;
  unit: string;
  reward: string;
  cardLink: string;
  remaining: number;
  loyaltyMode: LoyaltyMode;
  template?: string | null;
}) {
  const template = input.template?.trim() ?? "";
  return template ? renderWhatsAppTemplate(template, input) : "";
}
