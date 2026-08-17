import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import {
  getPlaybookBusinessUpdate,
  isBusinessConfiguredForPlaybook,
  playbookMatchesBusiness,
  type BusinessPlaybook,
  type PlaybookBusinessState,
} from "@/lib/playbooks/catalog";
import prisma from "@/lib/prisma";

function playbookStateFromBusiness(business: {
  loyaltyMode: PlaybookBusinessState["loyaltyMode"];
  unitName: string;
  rewardName: string;
  rewardType: PlaybookBusinessState["rewardType"];
  rewardDescription: string | null;
  rewardThreshold: number;
  earnAmount: number;
  loyaltyProgramName: string | null;
  pointsName: string | null;
  membershipName: string | null;
  rewardCode: string | null;
  welcomeMessage: string | null;
  whatsappWelcomeMessage: string | null;
  whatsappBalanceMessage: string | null;
  whatsappRewardMessage: string | null;
  _count: {
    customers: number;
    transactions: number;
    rewards: number;
    promotions: number;
    offers: number;
  };
  activities: Array<{ id: string }>;
}): PlaybookBusinessState {
  return {
    loyaltyMode: business.loyaltyMode,
    unitName: business.unitName,
    rewardName: business.rewardName,
    rewardType: business.rewardType,
    rewardDescription: business.rewardDescription,
    rewardThreshold: business.rewardThreshold,
    earnAmount: business.earnAmount,
    loyaltyProgramName: business.loyaltyProgramName,
    pointsName: business.pointsName,
    membershipName: business.membershipName,
    rewardCode: business.rewardCode,
    welcomeMessage: business.welcomeMessage,
    whatsappWelcomeMessage: business.whatsappWelcomeMessage,
    whatsappBalanceMessage: business.whatsappBalanceMessage,
    whatsappRewardMessage: business.whatsappRewardMessage,
    businessSettingsActivityCount: business.activities.length,
    customerCount: business._count.customers,
    transactionCount: business._count.transactions,
    rewardCount: business._count.rewards,
    promotionCount: business._count.promotions,
    offerCount: business._count.offers,
  };
}

export type PlaybookApplicationCommandResult =
  | "subscription-restricted"
  | "missing"
  | "confirmation-required"
  | "already-applied"
  | "applied";

/**
 * Authoritative non-financial playbook application boundary.
 *
 * The caller keeps authentication, tenant authorization, canonical playbook
 * lookup, presentation preflight, post-commit integrations, redirects and
 * revalidation. This command owns the persisted maintenance entitlement,
 * current-state overwrite safety, idempotency, settings update and audit.
 */
export async function applyBusinessPlaybookCommand(input: {
  businessId: string;
  playbook: BusinessPlaybook;
  confirmedExisting: boolean;
  actorId: string;
}): Promise<PlaybookApplicationCommandResult> {
  return prisma.$transaction(async (transaction) => {
    if (
      !(await canBusinessPerformSubscriptionOperation(
        transaction,
        input.businessId,
        "OPERATE",
      ))
    ) {
      return "subscription-restricted" as const;
    }

    const current = await transaction.business.findUnique({
      where: { id: input.businessId },
      select: {
        loyaltyMode: true,
        unitName: true,
        rewardName: true,
        rewardType: true,
        rewardDescription: true,
        rewardThreshold: true,
        earnAmount: true,
        loyaltyProgramName: true,
        pointsName: true,
        membershipName: true,
        rewardCode: true,
        welcomeMessage: true,
        whatsappWelcomeMessage: true,
        whatsappBalanceMessage: true,
        whatsappRewardMessage: true,
        activities: {
          where: { type: "BUSINESS_SETTINGS_UPDATED" },
          select: { id: true },
        },
        _count: {
          select: {
            customers: true,
            transactions: true,
            rewards: true,
            promotions: true,
            offers: true,
          },
        },
      },
    });
    if (!current) return "missing" as const;

    const state = playbookStateFromBusiness(current);
    if (playbookMatchesBusiness(input.playbook, state)) {
      return "already-applied" as const;
    }
    if (isBusinessConfiguredForPlaybook(state) && !input.confirmedExisting) {
      return "confirmation-required" as const;
    }

    // Normal settings update + activity are committed together. Playbooks do
    // not create a reward, promotion, offer, campaign, or paid integration.
    await transaction.business.update({
      where: { id: input.businessId },
      data: getPlaybookBusinessUpdate(input.playbook),
    });
    await transaction.businessActivity.create({
      data: {
        type: "BUSINESS_SETTINGS_UPDATED",
        description: `تم تطبيق قالب تشغيل قابل للتعديل: ${input.playbook.name}`,
        businessId: input.businessId,
        createdById: input.actorId,
      },
    });

    return "applied" as const;
  });
}
