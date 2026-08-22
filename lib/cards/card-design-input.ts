import { isValidRemoteImageUrl } from "@/lib/branding/image-data";
import { z } from "zod";

export const cardDesignInputSchema = z
  .object({
    logoUrl: z
      .string()
      .trim()
      .max(500)
      .refine((value) => value === "" || isValidRemoteImageUrl(value)),
    cardDesignMode: z.enum(["STANDARD", "CUSTOM"]),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    themePreset: z.enum(["DEFAULT", "DARK"]),
    standardCardArtworkEnabled: z.preprocess(
      (value) => value === "on" || value === "true" || value === true,
      z.boolean(),
    ),
    standardCardArtworkCategory: z.enum([
      "BARBER",
      "CAFE",
      "RESTAURANT",
      "FASHION",
      "BEAUTY",
      "GYM",
      "RETAIL",
      "OTHER",
    ]),
    customCardArtworkEnabled: z.preprocess(
      (value) => value === "true" || value === true,
      z.boolean(),
    ),
    customCardFrontArtworkUrl: z
      .string()
      .trim()
      .max(500)
      .refine((value) => value === "" || isValidRemoteImageUrl(value)),
    customCardBackArtworkUrl: z
      .string()
      .trim()
      .max(500)
      .refine((value) => value === "" || isValidRemoteImageUrl(value)),
    customCardSafeZoneVersion: z.literal("ID1_V1"),
  })
  .superRefine((value, context) => {
    if (
      value.cardDesignMode === "CUSTOM" &&
      (!value.customCardFrontArtworkUrl || !value.customCardBackArtworkUrl)
    ) {
      context.addIssue({
        code: "custom",
        path: ["cardDesignMode"],
        message: "Custom Card requires an approved Front + Back artwork pair.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    customCardArtworkEnabled:
      value.cardDesignMode === "CUSTOM"
        ? Boolean(
            value.customCardFrontArtworkUrl && value.customCardBackArtworkUrl,
          )
        : value.customCardArtworkEnabled,
  }));

export function parseCardDesignFormData(formData: FormData) {
  return cardDesignInputSchema.safeParse({
    logoUrl: formData.get("logoUrl") ?? "",
    cardDesignMode: formData.get("cardDesignMode") ?? "STANDARD",
    primaryColor: formData.get("primaryColor"),
    themePreset: formData.get("themePreset") ?? "DEFAULT",
    standardCardArtworkEnabled:
      formData.get("standardCardArtworkEnabled") ?? false,
    standardCardArtworkCategory:
      formData.get("standardCardArtworkCategory") ?? "OTHER",
    customCardArtworkEnabled:
      formData.get("customCardArtworkEnabled") ?? false,
    customCardFrontArtworkUrl:
      formData.get("customCardFrontArtworkUrl") ?? "",
    customCardBackArtworkUrl:
      formData.get("customCardBackArtworkUrl") ?? "",
    customCardSafeZoneVersion:
      formData.get("customCardSafeZoneVersion") ?? "ID1_V1",
  });
}
