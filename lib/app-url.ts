import { headers } from "next/headers";

function trimUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function isLocalhostUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

export async function getRequestBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (
    configuredUrl &&
    !isLocalhostUrl(configuredUrl)
  ) {
    return trimUrl(configuredUrl);
  }

  const requestHeaders = await headers();

  const forwardedHost =
    requestHeaders
      .get("x-forwarded-host")
      ?.split(",")[0]
      ?.trim();

  const host =
    forwardedHost ??
    requestHeaders.get("host")?.trim();

  const forwardedProtocol =
    requestHeaders
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();

  const protocol =
    forwardedProtocol ||
    (host?.startsWith("localhost") ||
    host?.startsWith("127.0.0.1")
      ? "http"
      : "http");

  if (host) {
    return `${protocol}://${host}`;
  }

  return trimUrl(
    configuredUrl || "http://localhost:3000"
  );
}
