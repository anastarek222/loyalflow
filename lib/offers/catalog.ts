import { z } from "zod";

import { customerSegments } from "@/lib/customers/segments";
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

function startOfUtcDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfUtcDay(value: string) {
  return new Date(`${value}T23:59:59.999Z`);
}

/** Admin date inputs consistently represent a whole UTC calendar day. */
export function normalizeOfferInput(input: z.infer<typeof offerInputSchema>) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    validFrom: input.validFrom ? startOfUtcDay(input.validFrom) : null,
    validUntil: input.validUntil ? endOfUtcDay(input.validUntil) : null,
    eligibility: input.eligibility,
    segment: input.eligibility === "SEGMENT" ? input.segment ?? null : null,
  };
}
