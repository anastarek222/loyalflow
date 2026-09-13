import { z } from "zod";

import { customerSegments } from "@/lib/customers/segments";
import { localOfferDayBoundaryToUtc } from "@/lib/offers/date-window";
import { offerEligibilityValues } from "@/lib/offers/eligibility";

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();

export const offerInputSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).optional(),
    validFrom: optionalDate,
    validUntil: optionalDate,
    eligibility: z.enum(offerEligibilityValues),
    segment: z.enum(customerSegments).optional(),
  })
  .superRefine((value, context) => {
    if (value.validFrom && value.validUntil && value.validFrom > value.validUntil) {
      context.addIssue({ code: "custom", message: "Offer end must not precede its start." });
    }
    if (value.eligibility === "SEGMENT" && !value.segment) {
      context.addIssue({ code: "custom", message: "Segment eligibility needs a segment." });
    }
    if (value.eligibility !== "SEGMENT" && value.segment) {
      context.addIssue({ code: "custom", message: "Only segment offers can store a segment." });
    }
  });

/** Date-only inputs represent a whole calendar day in the Business timezone. */
export function normalizeOfferInput(
  input: z.infer<typeof offerInputSchema>,
  timeZone = "UTC",
) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    validFrom: input.validFrom
      ? localOfferDayBoundaryToUtc(input.validFrom, timeZone, "start")
      : null,
    validUntil: input.validUntil
      ? localOfferDayBoundaryToUtc(input.validUntil, timeZone, "end")
      : null,
    eligibility: input.eligibility,
    segment: input.eligibility === "SEGMENT" ? input.segment ?? null : null,
  };
}
