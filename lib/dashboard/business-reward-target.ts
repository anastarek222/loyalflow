import prisma from "@/lib/prisma";

export async function getBusinessRewardTargetCost(input: {
  businessId: string;
  fallbackThreshold: number;
}) {
  const reward = await prisma.reward.findFirst({
    where: { businessId: input.businessId, isActive: true },
    orderBy: [{ cost: "asc" }, { id: "asc" }],
    select: { cost: true },
  });

  return Math.max(1, Math.trunc(reward?.cost ?? input.fallbackThreshold));
}
