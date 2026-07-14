import { headers } from "next/headers";

function isLocalUrl(value: string) {
  try {
    const hostname =
      new URL(value).hostname;

    return (
      hostname === "localhost" ||
      hostname === "0.0.0.0" ||
      hostname === "127.0.0.1"
    );
  } catch {
    return true;
  }
}

function isLocalHost(host: string) {
  const hostname =
    host.split(":")[0];

  return (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.")
  );
}

export async function getRequestBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL
      ?.trim()
      .replace(/\/$/, "");

  if (
    configuredUrl &&
    !isLocalUrl(configuredUrl)
  ) {
    return configuredUrl;
  }

  const requestHeaders =
    await headers();

  const forwardedHost =
    requestHeaders
      .get("x-forwarded-host")
      ?.split(",")[0]
      .trim();

  const host =
    forwardedHost ||
    requestHeaders
      .get("host")
      ?.split(",")[0]
      .trim();

  if (host) {
    const forwardedProtocol =
      requestHeaders
        .get("x-forwarded-proto")
        ?.split(",")[0]
        .trim();

    const protocol =
      forwardedProtocol ||
      (isLocalHost(host)
        ? "http"
        : "https");

    return `${protocol}://${host}`;
  }

  return (
    configuredUrl ||
    "http://localhost:3000"
  );
}
