const PUBLIC_TOKEN_PATTERN = /^[a-zA-Z0-9_-]{10,128}$/;

/**
 * Public-card route parameters are opaque identifiers, never paths or URLs.
 * Keep this separate from QR parsing so public route handlers can reject a
 * malformed dynamic segment before it reaches a database query.
 */
export function isPublicCardToken(value: unknown): value is string {
  return typeof value === "string" && PUBLIC_TOKEN_PATTERN.test(value);
}

export function extractPublicCardToken(value: string) {
  const trimmedValue = value.trim();

  if (isPublicCardToken(trimmedValue)) {
    return trimmedValue;
  }

  try {
    const url = new URL(trimmedValue);
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length !== 2 || parts[0] !== "card") {
      return null;
    }

    const token = decodeURIComponent(parts[1]);

    return isPublicCardToken(token) ? token : null;
  } catch {
    return null;
  }
}
