export const CUSTOMER_HIGHLIGHT_FRESHNESS_DAYS = 30;
export const CUSTOMER_HIGHLIGHT_LIMIT = 2;

type HighlightSource = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
};

export type CustomerHighlight = {
  sourceId: string;
  kind: "OFFER" | "REWARD";
  title: string;
  description: string | null;
  publishedAt: Date;
};

export function getRecentCustomerHighlights(input: {
  offers: readonly HighlightSource[];
  rewards: readonly HighlightSource[];
  now?: Date;
}): CustomerHighlight[] {
  const now = input.now ?? new Date();
  const cutoff = new Date(
    now.getTime() - CUSTOMER_HIGHLIGHT_FRESHNESS_DAYS * 24 * 60 * 60 * 1000,
  );
  const highlights: CustomerHighlight[] = [
    ...input.offers.map((offer) => ({
      sourceId: offer.id,
      kind: "OFFER" as const,
      title: offer.name,
      description: offer.description,
      publishedAt: offer.createdAt,
    })),
    ...input.rewards.map((reward) => ({
      sourceId: reward.id,
      kind: "REWARD" as const,
      title: reward.name,
      description: reward.description,
      publishedAt: reward.createdAt,
    })),
  ];

  return highlights
    .filter(
      (highlight) =>
        highlight.publishedAt >= cutoff && highlight.publishedAt <= now,
    )
    .sort(
      (left, right) =>
        right.publishedAt.getTime() - left.publishedAt.getTime() ||
        left.kind.localeCompare(right.kind) ||
        left.sourceId.localeCompare(right.sourceId),
    )
    .slice(0, CUSTOMER_HIGHLIGHT_LIMIT);
}
