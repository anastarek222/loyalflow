import { headers } from "next/headers";
import {
  getConfiguredPublicAppUrl,
  isLocalAppHostname,
} from "@/lib/public-app-url";

function isLocalHost(host: string) {
  const hostname = host
    .replace(/^\[/, "")
    .replace(/\](:\d+)?$/, "")
    .split(":")[0];

  return isLocalAppHostname(hostname);
}

export async function getRequestBaseUrl() {
  const configuredUrl =
    getConfiguredPublicAppUrl();

  if (
    configuredUrl &&
    !isLocalAppHostname(
      new URL(configuredUrl).hostname
    )
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
