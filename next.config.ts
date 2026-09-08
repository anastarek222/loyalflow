import type { NextConfig } from "next";

const VERCEL_PROJECT_ID = "prj_XR2myqPuensw4MTYF5Rgi0w0MPMG";
const VERCEL_TEAM_ID = "team_JIxldEzYlted09P36umRYSLa";

function normalizeBlobStoreId(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("store_") ? trimmed.slice("store_".length) : trimmed;
}

function getConfiguredBlobStoreId() {
  const explicitStoreId = normalizeBlobStoreId(process.env.BLOB_STORE_ID);
  if (explicitStoreId) return explicitStoreId;

  const readWriteToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!readWriteToken) return null;

  const [, , , tokenStoreId = ""] = readWriteToken.split("_");
  return normalizeBlobStoreId(tokenStoreId);
}

if (process.env.VERCEL_ENV === "preview") {
  const blobStoreId = getConfiguredBlobStoreId();
  const blobHost = blobStoreId
    ? `${blobStoreId.toLowerCase()}.private.blob.vercel-storage.com`
    : "missing";
  const oidcConfigured = Boolean(process.env.VERCEL_OIDC_TOKEN?.trim());

  process.stdout.write(
    `[blob-isolation-cert] vercel_env=preview loyalflow_env=${process.env.LOYALFLOW_ENVIRONMENT?.trim() || "unset"} blob_configured=${Boolean(blobStoreId)} oidc_configured=${oidcConfigured} blob_host=${blobHost}\n`,
  );
}

let vercelRestAuthProbe: Promise<void> | undefined;

function probeVercelRestAuth() {
  if (process.env.VERCEL_ENV !== "preview") return Promise.resolve();
  if (vercelRestAuthProbe) return vercelRestAuthProbe;

  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (!oidcToken) {
    process.stdout.write(
      "[blob-isolation-cert] vercel_rest_auth=oidc_missing\n",
    );
    return Promise.resolve();
  }

  vercelRestAuthProbe = fetch(
    `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(VERCEL_PROJECT_ID)}&teamId=${encodeURIComponent(VERCEL_TEAM_ID)}&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${oidcToken}`,
      },
      cache: "no-store",
    },
  )
    .then((response) => {
      const classification =
        response.status === 200
          ? "accepted"
          : response.status === 401
            ? "unauthorized"
            : response.status === 403
              ? "forbidden"
              : `status_${response.status}`;
      process.stdout.write(
        `[blob-isolation-cert] vercel_rest_auth=${classification} status=${response.status}\n`,
      );
    })
    .catch(() => {
      process.stdout.write(
        "[blob-isolation-cert] vercel_rest_auth=network_error\n",
      );
    });

  return vercelRestAuthProbe;
}

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(self), microphone=(), geolocation=()",
  },
];

if (process.env.VERCEL_ENV === "preview") {
  securityHeaders.push({
    key: "X-Robots-Tag",
    value: "noindex, nofollow",
  });
}

if (process.env.NODE_ENV === "production") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  });
}

const configuredDevOrigin =
  process.env.NODE_ENV === "development"
    ? process.env.LOYALFLOW_DEV_ORIGIN?.trim()
    : undefined;

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // Custom Card artwork is uploaded as one Front + Back Server Action pair.
  // Application validation caps the pair at 4 MB total, leaving bounded
  // multipart overhead below Vercel Functions' 4.5 MB request ceiling.
  experimental: {
    serverActions: {
      bodySizeLimit: "4250kb",
    },
  },

  ...(configuredDevOrigin
    ? {
        allowedDevOrigins: [configuredDevOrigin],
      }
    : {}),

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};


const previousHeaders =
  nextConfig.headers;

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${
    process.env.NODE_ENV === "development"
      ? " 'unsafe-eval'"
      : ""
  }`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
].join("; ");

nextConfig.headers = async () => {
  await probeVercelRestAuth();

  const configuredHeaders =
    previousHeaders
      ? await previousHeaders()
      : [];

  return [
    ...configuredHeaders,
    {
      source: "/:path*",
      headers: [
        {
          key:
            "Content-Security-Policy",
          value:
            contentSecurityPolicy,
        },
      ],
    },
  ];
};

export default nextConfig;
