import type { OfferEligibility } from "@/generated/prisma/client";
import {
  getCustomerSegment,
  type CustomerSegment,
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
  now = new Date()
) {
  return (
    offer.isActive &&
    (!offer.validFrom || offer.validFrom <= now) &&
    (!offer.validUntil || now <= offer.validUntil)
  );
}

/**
 * This is deliberately a read-only predicate. It is shared by the public card
 * and offer previews, so eligibility can never mutate loyalty state.
 */
export function isOfferEligible(
  offer: OfferEligibilityInput,
  customer: OfferCustomer,
  business: OfferBusiness,
  now = new Date()
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

  const customerSegment = getCustomerSegment(
    {
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      lastActivityAt: customer.lastActivityAt,
      lifetimeEarned: customer.lifetimeEarned,
      rewardThreshold: business.rewardThreshold,
    },
    now
  );

  if (offer.eligibility === "VIP") return customerSegment === "VIP";

  return offer.segment === customerSegment;
}

export function isOfferSegment(value: string | null | undefined): value is CustomerSegment {
  return Boolean(value) && [
    "NEW",
    "ACTIVE",
    "VIP",
    "AT_RISK",
    "INACTIVE",
    "REWARD_READY",
    "HIGH_SPENDER",
    "FREQUENT_VISITOR",
  ].includes(value as CustomerSegment);
}
