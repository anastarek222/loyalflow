import { offerInputSchema } from "@/lib/offers/catalog";

/**
 * Normalize browser form state before applying the strict Offer domain input schema.
 * A previously selected segment can remain in the DOM after eligibility changes;
 * only SEGMENT eligibility is allowed to carry that value into the domain boundary.
 */
export function parseOfferFormInput(formData: FormData) {
  const eligibility = formData.get("eligibility")?.toString();

  return offerInputSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    validFrom: formData.get("validFrom") || undefined,
    validUntil: formData.get("validUntil") || undefined,
    eligibility,
    segment:
      eligibility === "SEGMENT"
        ? formData.get("segment") || undefined
        : undefined,
  });
}
