import type { OfferEligibility } from "@/generated/prisma/client";
import {
  customerMatchesSegment,
  customerSegments,
  type CustomerSegment,
  type CustomerSegmentContext,
} from "@/lib/customers/segments";

export const offerEligibilityValues = ["ALL", "SEGMENT", "VIP"] as const;

export type OfferEligibilityValue = (typeof offerEligibilityValues)[number];

export const OFFER_TAG_AUDIENCE_PREFIX = "TAG:";

export function encodeOfferTagAudience(tagId: string) {
  return `${OFFER_TAG_AUDIENCE_PREFIX}${tagId.trim()}`;
}

export function getOfferTagAudienceId(value: string | null | undefined) {
  if (!value?.startsWith(OFFER_TAG_AUDIENCE_PREFIX)) return null;

  const tagId = value.slice(OFFER_TAG_AUDIENCE_PREFIX.length).trim();
  return tagId.length > 0 && tagId.length <= 128 ? tagId : null;
}

export function isOfferAudienceSelector(
  value: string | null | undefined,
) {
  return isOfferSegment(value) || getOfferTagAudienceId(value) !== null;
}

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
 * Segment membership is dimensioned: lifecycle, computed traits, and private
 * tenant-scoped tag audiences can coexist without exposing tag metadata.
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

  const selector = offer.eligibility === "VIP" ? "VIP" : offer.segment;
  const tagId = getOfferTagAudienceId(selector);

  if (tagId) {
    return segmentContext.customerTagIds?.includes(tagId) ?? false;
  }

  if (!isOfferSegment(selector)) return false;

  return customerMatchesSegment(
    selector,
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
