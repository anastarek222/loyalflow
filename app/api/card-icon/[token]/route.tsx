import { ImageResponse } from 'next/og';
import Image from 'next/image';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
// Removed unused variable

export const GET = async (request: Request, { params }: { params: Promise<{ token: string }> }) => {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) {
    return new Response('Token required', { status: 401 });
  }
  try {
    jwt.verify(token, JWT_SECRET as string || 'default-secret');
  } catch (error) {
    return new Response('Invalid token', { status: 401 });
  }
  const { token: cardToken } = await params;
  const requestedSize = new URL(request.url).searchParams.get('size');
  const iconSize = requestedSize === '192' ? 192 : 512;
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

  async function getLogoDataUrl(value: string | null | undefined, requestUrl: string) {
    if (!value) return null;
    try {
      const absoluteUrl = new URL(value, new URL(requestUrl).origin).toString();
      const response = await fetch(absoluteUrl, { cache: 'no-store' });
      if (!response.ok) return null;
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 2_000_000) return null;
      const contentType = response.headers.get('content-type') ?? 'image/png';
      const base64 = Buffer.from(bytes).toString('base64');
      return `data:${contentType};base64,${base64}`;
    } catch {
      return null;
    }
  }
  const logoDataUrl = await getLogoDataUrl(business?.logoUrl, request.url);
  const initials = getInitials(business?.name);
  return new ImageResponse(
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
