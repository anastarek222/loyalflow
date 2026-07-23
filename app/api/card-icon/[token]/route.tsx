/* eslint-disable @next/next/no-img-element -- ImageResponse only supports standard image elements. */

import { ImageResponse } from "next/og";
import { getSafeImageDataUrl } from "@/lib/branding/image-data";
import { isPublicCardToken } from "@/lib/cards/public-token";
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

  const requestedSize = new URL(request.url).searchParams.get("size");
  const iconSize = requestedSize === "192" ? 192 : 512;
  const scale = iconSize / 512;
  const scaled = (value: number) => Math.round(value * scale);
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
  const primaryColor = getSafeColor(business?.primaryColor, '#2563eb');

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
          padding: `${scaled(42)}px`,
          color: '#ffffff',
          background: `linear-gradient(145deg, ${primaryColor} 0%, #020617 100%)`,
          boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
        }}
      >
        <div
          style={{
            width: `${scaled(390)}px`,
            height: `${scaled(390)}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderRadius: `${scaled(78)}px`,
            backgroundColor: '#000000',
            boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
          }}
        >
          {logoDataUrl ? (
            <img
              src={logoDataUrl}
              alt=""
              width={scaled(390)}
              height={scaled(390)}
              style={{
                width: `${scaled(390)}px`,
                height: `${scaled(390)}px`,
                objectFit: 'contain',
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

function getSafeColor(value: string | null | undefined, fallback: string) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'LF';
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
}

// Removed deprecated config export
