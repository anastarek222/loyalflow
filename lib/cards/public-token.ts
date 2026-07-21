const PUBLIC_TOKEN_PATTERN = /^[a-zA-Z0-9_-]{10,128}$/;

export function extractPublicCardToken(value: string) {
  const trimmedValue = value.trim();

  if (PUBLIC_TOKEN_PATTERN.test(trimmedValue)) {
    return trimmedValue;
  }

  try {
    const url = new URL(trimmedValue);
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length !== 2 || parts[0] !== "card") {
      return null;
    }

    const token = decodeURIComponent(parts[1]);

    return PUBLIC_TOKEN_PATTERN.test(token) ? token : null;
  } catch {
    return null;
  }
}
