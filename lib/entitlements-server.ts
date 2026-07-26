import prisma from "@/lib/prisma";
import {
  planCatalog,
  type LoyalFlowPlan,
  type PlanLimits,
} from "@/lib/entitlements";

type PlanConfigurationRow = {
  customerLimit: number | null;
  userLimit: number | null;
  branchLimit: number | null;
  offerLimit: number | null;
  rewardLimit: number | null;
};

export function configurationToPlanLimits(
  row: PlanConfigurationRow | null | undefined,
  plan: LoyalFlowPlan,
): PlanLimits {
  if (!row) return planCatalog[plan].limits;

  return {
    CUSTOMERS: row.customerLimit,
    USERS: row.userLimit,
    BRANCHES: row.branchLimit,
    OFFERS: row.offerLimit,
    REWARDS: row.rewardLimit,
  };
}

export async function getEffectivePlanLimits(plan: LoyalFlowPlan) {
  const configuration = await prisma.planConfiguration.findUnique({
    where: { plan },
    select: {
      customerLimit: true,
      userLimit: true,
      branchLimit: true,
      offerLimit: true,
      rewardLimit: true,
    },
  });

  return configurationToPlanLimits(configuration, plan);
}

export async function getEffectivePlanLimitsMap() {
  const rows = await prisma.planConfiguration.findMany({
    select: {
      plan: true,
      customerLimit: true,
      userLimit: true,
      branchLimit: true,
      offerLimit: true,
      rewardLimit: true,
    },
  });

  const map = new Map<LoyalFlowPlan, PlanLimits>();

  for (const row of rows) {
    map.set(row.plan, configurationToPlanLimits(row, row.plan));
  }

  for (const plan of Object.keys(planCatalog) as LoyalFlowPlan[]) {
    if (!map.has(plan)) map.set(plan, planCatalog[plan].limits);
  }

  return map;
}
