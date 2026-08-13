import { isPublicCardToken } from "@/lib/cards/public-token";
import {
  isManagedCustomCardArtworkUrl,
  readPrivateCustomCardArtwork,
  type CustomCardSide,
} from "@/lib/cards/custom-card-storage";
import prisma from "@/lib/prisma";
import { getClientAddress, rateLimit } from "@/lib/utils/rate-limiter";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; side: string }> },
) {
  const { token, side } = await params;
  if (!isPublicCardToken(token) || !["front", "back"].includes(side)) {
    return new NextResponse(null, { status: 404 });
  }
  const limit = rateLimit(
    `public-card-artwork:${getClientAddress(request.headers)}:${token}`,
    { limit: 120, windowMs: 60_000 },
  );
  if (!limit.allowed) {
    return new NextResponse(null, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  const customer = await prisma.customer.findUnique({
    where: { publicToken: token },
    select: {
      isActive: true,
      business: {
        select: {
          id: true,
          isActive: true,
          cardDesignMode: true,
          customCardArtworkEnabled: true,
          customCardFrontArtworkUrl: true,
          customCardBackArtworkUrl: true,
        },
      },
    },
  });
  if (
    !customer?.isActive ||
    !customer.business.isActive ||
    customer.business.cardDesignMode !== "CUSTOM" ||
    !customer.business.customCardArtworkEnabled
  ) {
    return new NextResponse(null, { status: 404 });
  }
  const cardSide = side as CustomCardSide;
  const url =
    cardSide === "front"
      ? customer.business.customCardFrontArtworkUrl
      : customer.business.customCardBackArtworkUrl;
  if (!isManagedCustomCardArtworkUrl(url, customer.business.id)) {
    return new NextResponse(null, { status: 404 });
  }
  const blob = await readPrivateCustomCardArtwork(url!);
  if (!blob) return new NextResponse(null, { status: 404 });
  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
