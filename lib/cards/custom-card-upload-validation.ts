import {
  getCustomCardArtworkDimensions,
  hasStandardCustomCardAspectRatio,
} from "@/lib/cards/custom-card-geometry";

export const CUSTOM_CARD_MAX_FILE_BYTES = 4 * 1024 * 1024;
export const CUSTOM_CARD_MAX_PAIR_BYTES = 4 * 1024 * 1024;
export const CUSTOM_CARD_ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type CustomCardUploadValidationReason =
  | "MISSING_FRONT"
  | "MISSING_BACK"
  | "UNSUPPORTED_TYPE"
  | "PAIR_TOO_LARGE"
  | "UNREADABLE_IMAGE"
  | "DIMENSIONS_MISMATCH"
  | "WRONG_ASPECT_RATIO";

export type CustomCardUploadValidationResult =
  | Readonly<{ ok: true; front: File; back: File }>
  | Readonly<{ ok: false; reason: CustomCardUploadValidationReason }>;

function providedFile(value: unknown): value is File {
  return value instanceof File && value.size > 0;
}

export function validateCustomCardArtworkFile(file: unknown): file is File {
  return (
    providedFile(file) &&
    file.size <= CUSTOM_CARD_MAX_FILE_BYTES &&
    CUSTOM_CARD_ALLOWED_TYPES.includes(
      file.type as (typeof CUSTOM_CARD_ALLOWED_TYPES)[number],
    )
  );
}

export async function validateCustomCardUploadPair(
  front: unknown,
  back: unknown,
): Promise<CustomCardUploadValidationResult> {
  if (!providedFile(front)) return { ok: false, reason: "MISSING_FRONT" };
  if (!providedFile(back)) return { ok: false, reason: "MISSING_BACK" };

  if (
    !CUSTOM_CARD_ALLOWED_TYPES.includes(
      front.type as (typeof CUSTOM_CARD_ALLOWED_TYPES)[number],
    ) ||
    !CUSTOM_CARD_ALLOWED_TYPES.includes(
      back.type as (typeof CUSTOM_CARD_ALLOWED_TYPES)[number],
    )
  ) {
    return { ok: false, reason: "UNSUPPORTED_TYPE" };
  }

  if (
    front.size > CUSTOM_CARD_MAX_FILE_BYTES ||
    back.size > CUSTOM_CARD_MAX_FILE_BYTES ||
    front.size + back.size > CUSTOM_CARD_MAX_PAIR_BYTES
  ) {
    return { ok: false, reason: "PAIR_TOO_LARGE" };
  }

  const [frontDimensions, backDimensions] = await Promise.all([
    getCustomCardArtworkDimensions(front),
    getCustomCardArtworkDimensions(back),
  ]);
  if (!frontDimensions || !backDimensions) {
    return { ok: false, reason: "UNREADABLE_IMAGE" };
  }
  if (
    frontDimensions.width !== backDimensions.width ||
    frontDimensions.height !== backDimensions.height
  ) {
    return { ok: false, reason: "DIMENSIONS_MISMATCH" };
  }
  if (!hasStandardCustomCardAspectRatio(frontDimensions)) {
    return { ok: false, reason: "WRONG_ASPECT_RATIO" };
  }

  return { ok: true, front, back };
}
