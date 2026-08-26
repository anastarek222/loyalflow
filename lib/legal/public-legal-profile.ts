type PublicLegalEnvironment = Readonly<{
  NEXT_PUBLIC_LEGAL_PUBLICATION_STATUS?: string;
  NEXT_PUBLIC_LEGAL_ENTITY_NAME?: string;
  NEXT_PUBLIC_LEGAL_COUNTRY?: string;
  NEXT_PUBLIC_LEGAL_CONTACT_EMAIL?: string;
  NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE?: string;
}>;

function boundedText(value: string | undefined, maximum: number) {
  const normalized = value?.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > maximum) return null;
  return normalized;
}

function validEmail(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function validDate(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized || !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

  const date = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== normalized
    ? null
    : normalized;
}

export function getPublicLegalProfile(environment?: PublicLegalEnvironment) {
  const source = environment ?? {
    NEXT_PUBLIC_LEGAL_PUBLICATION_STATUS:
      process.env.NEXT_PUBLIC_LEGAL_PUBLICATION_STATUS,
    NEXT_PUBLIC_LEGAL_ENTITY_NAME: process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME,
    NEXT_PUBLIC_LEGAL_COUNTRY: process.env.NEXT_PUBLIC_LEGAL_COUNTRY,
    NEXT_PUBLIC_LEGAL_CONTACT_EMAIL:
      process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL,
    NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE:
      process.env.NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE,
  };
  const entityName = boundedText(source.NEXT_PUBLIC_LEGAL_ENTITY_NAME, 120);
  const country = boundedText(source.NEXT_PUBLIC_LEGAL_COUNTRY, 80);
  const contactEmail = validEmail(source.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL);
  const effectiveDate = validDate(source.NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE);
  const publicationApproved =
    source.NEXT_PUBLIC_LEGAL_PUBLICATION_STATUS?.trim().toLowerCase() ===
    "published";

  return {
    entityName,
    country,
    contactEmail,
    effectiveDate,
    isPublished: Boolean(
      publicationApproved &&
      entityName &&
      country &&
      contactEmail &&
      effectiveDate,
    ),
  } as const;
}
