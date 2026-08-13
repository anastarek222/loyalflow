import { auth } from "@/auth";
import {
  findCustomCardArtworkVersion,
  isManagedCustomCardArtworkUrl,
  readPrivateCustomCardArtwork,
  type CustomCardSide,
} from "@/lib/cards/custom-card-storage";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ slug: string; version: string; side: string }>;
  },
) {
  const session = await auth();
  if (!session?.user) return new NextResponse(null, { status: 401 });
  const { slug, version, side } = await params;
  if (session.user.role !== "SUPER_ADMIN" || !["front", "back"].includes(side)) {
    return new NextResponse(null, { status: 404 });
  }
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      customCardFrontArtworkUrl: true,
      customCardBackArtworkUrl: true,
    },
  });
  if (!business || !canManageBusiness(session.user, business.id)) {
    return new NextResponse(null, { status: 404 });
  }

  const cardSide = side as CustomCardSide;
  let url: string | null | undefined;
  if (version === "published") {
    url =
      cardSide === "front"
        ? business.customCardFrontArtworkUrl
        : business.customCardBackArtworkUrl;
  } else {
    const artwork = await findCustomCardArtworkVersion(business.id, version);
    url = cardSide === "front" ? artwork?.frontUrl : artwork?.backUrl;
  }
  if (!url || !isManagedCustomCardArtworkUrl(url, business.id)) {
    return new NextResponse(null, { status: 404 });
  }
  const blob = await readPrivateCustomCardArtwork(url);
  if (!blob) return new NextResponse(null, { status: 404 });
  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
