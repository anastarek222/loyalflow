import type { ApiBusinessSummaryRead } from "@loyalflow/contracts/api/v1";

export type BusinessSummarySource = Readonly<{
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  loyaltyMode: "VISITS" | "POINTS" | "SALES_AMOUNT";
  unitName: string;
  rewardName: string;
  rewardThreshold: number;
  _count: Readonly<{ customers: number; branches: number }>;
}>;

export function toApiBusinessSummary(
  source: BusinessSummarySource,
): ApiBusinessSummaryRead {
  return {
    business: {
      id: source.id,
      name: source.name,
      slug: source.slug,
      isActive: source.isActive,
    },
    program: {
      loyaltyMode: source.loyaltyMode,
      unitName: source.unitName,
      rewardName: source.rewardName,
      rewardThreshold: source.rewardThreshold,
    },
    counts: {
      customers: source._count.customers,
      branches: source._count.branches,
    },
  };
}
