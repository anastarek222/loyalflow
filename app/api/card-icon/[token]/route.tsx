/* eslint-disable @next/next/no-img-element -- ImageResponse only supports standard image elements. */

import { ImageResponse } from "next/og";
import { getSafeImageDataUrl } from "@/lib/branding/image-data";
import { isPublicCardToken } from "@/lib/cards/public-token";
import { safePublicCardColor } from "@/lib/cards/public-card-projection";
import prisma from "@/lib/prisma";
import { getClientAddress, rateLimit } from "@/lib/utils/rate-limiter";

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) => {
  const { token: cardToken } = await params;
  if (!isPublicCardToken(cardToken)) {
    return new Response("Not found", { status: 404 });
  }

  const limit = rateLimit(
    `public-card-icon:${getClientAddress(request.headers)}:${cardToken}`,
    { limit: 60, windowMs: 60_000 }
  );

  if (!limit.allowed) {
    return new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  const requestUrl = new URL(request.url);
  const requestedSize = requestUrl.searchParams.get("size");
  const iconSize =
    requestedSize === "180" ? 180 : requestedSize === "192" ? 192 : 512;
  const maskable = requestUrl.searchParams.get("purpose") === "maskable";
  const scale = iconSize / 512;
  const scaled = (value: number) => Math.round(value * scale);
  const logoFrameSize = maskable ? scaled(390) : iconSize;
  const customer = await prisma.customer.findUnique({
    where: {
      publicToken: cardToken,
    },
    select: {
      isActive: true,
      business: {
        select: {
          name: true,
          logoUrl: true,
          primaryColor: true,
          isActive: true,
        },
      },
    },
  });
  if (!customer || !customer.isActive || !customer.business?.isActive) {
    return new Response('Card not found', { status: 404 });
  }
  const business = customer?.business;
  const primaryColor = safePublicCardColor(business?.primaryColor);

  const logoDataUrl = getSafeImageDataUrl(business?.logoUrl, 500 * 1024);
  const initials = getInitials(business?.name);
  const response = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: "0",
          color: '#ffffff',
          background: `linear-gradient(145deg, ${primaryColor} 0%, #020617 100%)`,
          boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
        }}
      >
        <div
          style={{
            width: `${logoFrameSize}px`,
            height: `${logoFrameSize}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderRadius: maskable ? `${scaled(78)}px` : "0",
            backgroundColor: logoDataUrl ? '#ffffff' : '#000000',
            boxShadow: maskable ? '0 24px 70px rgba(0,0,0,0.35)' : 'none',
          }}
        >
          {logoDataUrl ? (
            <img
              src={logoDataUrl}
              alt=""
              width={logoFrameSize}
              height={logoFrameSize}
              style={{
                width: `${logoFrameSize}px`,
                height: `${logoFrameSize}px`,
                objectFit: maskable ? 'contain' : 'cover',
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${scaled(120)}px`,
                fontWeight: 900,
                color: primaryColor,
              }}
            >
              {initials}
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: iconSize,
      height: iconSize,
    }
  );
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'LF';
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
}

// Removed deprecated config export
