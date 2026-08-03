type PublicAppUrlOptions = Readonly<{
  production?: boolean;
}>;

const LOCAL_HOSTNAMES = new Set([
  "localhost",
  "0.0.0.0",
  "127.0.0.1",
  "::1",
]);

const RESERVED_EXAMPLE_HOSTS = [
  "example.com",
  "example.net",
  "example.org",
];

export function isLocalAppHostname(hostname: string) {
  const normalized = hostname.toLowerCase();

  return (
    LOCAL_HOSTNAMES.has(normalized) ||
    normalized.endsWith(".localhost") ||
    normalized.startsWith("192.168.") ||
    normalized.startsWith("10.")
  );
}

export function isPlaceholderAppHostname(hostname: string) {
  const normalized = hostname.toLowerCase();

  return (
    RESERVED_EXAMPLE_HOSTS.some(
      (reserved) =>
        normalized === reserved ||
        normalized.endsWith(`.${reserved}`),
    ) ||
    normalized.endsWith(".test") ||
    normalized.endsWith(".invalid") ||
    normalized.endsWith(".example")
  );
}

export function validatePublicAppOrigin(
  value: string,
  options: PublicAppUrlOptions = {},
) {
  const production = options.production === true;
  const trimmed = value.trim();

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Public application URL must be a valid absolute origin.");
  }

  const exactOrigin =
    url.origin === trimmed &&
    !url.username &&
    !url.password &&
    url.pathname === "/" &&
    !url.search &&
    !url.hash;

  if (!exactOrigin) {
    throw new Error(
      "Public application URL must be an exact origin without credentials, path, query, fragment, or trailing slash.",
    );
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Public application URL must use HTTP or HTTPS.");
  }

  if (isPlaceholderAppHostname(url.hostname)) {
    throw new Error(
      "Public application URL cannot use a placeholder or reserved example domain.",
    );
  }

  if (
    production &&
    (url.protocol !== "https:" || isLocalAppHostname(url.hostname))
  ) {
    throw new Error(
      "Production public application URL must be a non-local HTTPS origin.",
    );
  }

  return url.origin;
}

export function getConfiguredPublicAppUrl(
  environment: Record<string, string | undefined> = process.env,
) {
  const value = environment.NEXT_PUBLIC_APP_URL?.trim();

  if (!value) return null;

  return validatePublicAppOrigin(value, {
    production: environment.NODE_ENV === "production",
  });
}
