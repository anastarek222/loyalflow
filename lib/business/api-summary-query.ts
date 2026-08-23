import { toApiBusinessSummary } from "@/lib/business/api-summary";
import prisma from "@/lib/prisma";

export async function getApiBusinessSummary(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      loyaltyMode: true,
      unitName: true,
      rewardName: true,
      rewardThreshold: true,
      _count: { select: { customers: true, branches: true } },
    },
  });

  return business ? toApiBusinessSummary(business) : null;
}
