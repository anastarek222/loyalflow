import { headers } from "next/headers";

type HeaderReader = {
  get(name: string): string | null;
};

export type ActivityRequestContext = {
  deviceName?: string;
  ipAddress?: string;
};

function clean(
  value: string | null | undefined,
  maxLength: number
) {
  const normalized = value?.trim();

  if (!normalized) {
    return undefined;
  }

  return normalized.slice(0, maxLength);
}

export function getClientIpFromHeaders(
  requestHeaders: HeaderReader
) {
  const forwardedFor =
    requestHeaders
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim();

  return clean(
    requestHeaders.get(
      "x-vercel-forwarded-for"
    ) ??
      forwardedFor ??
      requestHeaders.get("x-real-ip"),
    100
  );
}

export function getDeviceNameFromUserAgent(
  userAgent: string | null
) {
  if (!userAgent) {
    return undefined;
  }

  let device = "Unknown device";
  let browser = "Browser";

  if (/iPhone/i.test(userAgent)) {
    device = "iPhone";
  } else if (/iPad/i.test(userAgent)) {
    device = "iPad";
  } else if (/Android/i.test(userAgent)) {
    device = "Android";
  } else if (/Windows/i.test(userAgent)) {
    device = "Windows";
  } else if (
    /Macintosh|Mac OS X/i.test(
      userAgent
    )
  ) {
    device = "Mac";
  } else if (/Linux/i.test(userAgent)) {
    device = "Linux";
  }

  if (/Edg\//i.test(userAgent)) {
    browser = "Edge";
  } else if (/Chrome\//i.test(userAgent)) {
    browser = "Chrome";
  } else if (/Firefox\//i.test(userAgent)) {
    browser = "Firefox";
  } else if (/Safari\//i.test(userAgent)) {
    browser = "Safari";
  }

  return `${device} · ${browser}`;
}

export function parseActivityRequestContext(
  requestHeaders: HeaderReader
): ActivityRequestContext {
  return {
    ipAddress:
      getClientIpFromHeaders(
        requestHeaders
      ),
    deviceName:
      getDeviceNameFromUserAgent(
        requestHeaders.get(
          "user-agent"
        )
      ),
  };
}

export async function getActivityRequestContext() {
  const requestHeaders =
    await headers();

  return parseActivityRequestContext(
    requestHeaders
  );
}
