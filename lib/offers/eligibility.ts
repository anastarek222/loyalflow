import type { OfferEligibility } from "@/generated/prisma/client";
import {
  customerMatchesSegment,
  customerSegments,
  type CustomerSegment,
  type CustomerSegmentContext,
} from "@/lib/customers/segments";

export const offerEligibilityValues = ["ALL", "SEGMENT", "VIP"] as const;

export type OfferEligibilityValue = (typeof offerEligibilityValues)[number];

type OfferEligibilityInput = {
  businessId: string;
  isActive: boolean;
  validFrom: Date | null;
  validUntil: Date | null;
  eligibility: OfferEligibility | OfferEligibilityValue;
  segment: string | null;
};

type OfferCustomer = {
  businessId: string;
  isActive: boolean;
  createdAt: Date;
  lifetimeEarned: number;
  lastActivityAt: Date | null;
};

type OfferBusiness = {
  id: string;
  rewardThreshold: number;
};

/** End instants are inclusive: an offer is valid while `now <= validUntil`. */
export function isOfferCurrentlyValid(
  offer: Pick<OfferEligibilityInput, "isActive" | "validFrom" | "validUntil">,
  now = new Date(),
) {
  return (
    offer.isActive &&
    (!offer.validFrom || offer.validFrom <= now) &&
    (!offer.validUntil || now <= offer.validUntil)
  );
}

/**
 * Read-only audience predicate shared by public visibility and previews.
 * Segment membership is dimensioned: lifecycle and traits can coexist.
 */
export function isOfferEligible(
  offer: OfferEligibilityInput,
  customer: OfferCustomer,
  business: OfferBusiness,
  now = new Date(),
  segmentContext: CustomerSegmentContext = {},
) {
  if (
    offer.businessId !== customer.businessId ||
    customer.businessId !== business.id ||
    !customer.isActive ||
    !isOfferCurrentlyValid(offer, now)
  ) {
    return false;
  }

  if (offer.eligibility === "ALL") return true;

  const segment =
    offer.eligibility === "VIP" ? "VIP" : offer.segment;

  if (!isOfferSegment(segment)) return false;

  return customerMatchesSegment(
    segment,
    {
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      lastActivityAt: customer.lastActivityAt,
      lifetimeEarned: customer.lifetimeEarned,
      rewardThreshold: business.rewardThreshold,
    },
    segmentContext,
    now,
  );
}

export function isOfferSegment(
  value: string | null | undefined,
): value is CustomerSegment {
  return Boolean(value) &&
    customerSegments.includes(value as CustomerSegment);
}
