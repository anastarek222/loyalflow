import type { NextConfig } from "next";

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
