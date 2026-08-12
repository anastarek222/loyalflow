import { toApiBusinessAccess } from "@/lib/business/api-access";
import type { ApiActorContext } from "@/lib/api/v1/actor-context";
import prisma from "@/lib/prisma";

export async function getApiBusinessAccess(
  actor: ApiActorContext & { businessId: string },
) {
  const business = await prisma.business.findUnique({
    where: { id: actor.businessId },
    select: { plan: true },
  });

  return business
    ? toApiBusinessAccess({ actor, businessId: actor.businessId, plan: business.plan })
    : null;
}
