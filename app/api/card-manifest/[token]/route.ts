import { NextResponse } from "next/server";

import { isPublicCardToken } from "@/lib/cards/public-token";
import { getPublicCardLocalization } from "@/lib/cards/public-card-localization";
import prisma from "@/lib/prisma";
import { getClientAddress, rateLimit } from "@/lib/utils/rate-limiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ManifestRouteProps = {
  params: Promise<{
    token: string;
  }>;
};

function getThemeColor(
  value: string | null
) {
  if (
    value &&
    /^#[0-9a-fA-F]{6}$/.test(value)
  ) {
    return value;
  }

  return "#2563eb";
}

export async function GET(
  _request: Request,
  { params }: ManifestRouteProps
) {
  const { token } = await params;

  if (!isPublicCardToken(token)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const limit = rateLimit(
    `public-card-manifest:${getClientAddress(_request.headers)}:${token}`,
    { limit: 30, windowMs: 60_000 }
  );

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  const customer =
    await prisma.customer.findUnique({
      where: {
        publicToken: token,
      },

      select: {
        firstName: true,
        lastName: true,
        isActive: true,

        business: {
          select: {
            name: true,
            primaryColor: true,
            isActive: true,
            cardDefaultLanguage: true,
          },
        },
      },
    });

  if (
    !customer ||
    !customer.isActive ||
    !customer.business.isActive
  ) {
    return NextResponse.json(
      {
        error:
          "Card is not available",
      },
      {
        status: 404,
      }
    );
  }

  const customerName = [
    customer.firstName,
    customer.lastName,
  ]
    .filter(Boolean)
    .join(" ");
  const { lang, dir, description } = getPublicCardLocalization(
    customer.business.cardDefaultLanguage,
    customerName
  );

  const manifest = {
    id: `/card/${token}`,

    name:
      `${customer.business.name} - ${customerName}`,

    short_name:
      customer.business.name.slice(
        0,
        18
      ),

    description,

    start_url:
      `/card/${token}`,

    scope: "/card/",

    display: "standalone",

    orientation: "portrait",

    lang,

    dir,

    background_color:
      "#020617",

    theme_color:
      getThemeColor(
        customer.business.primaryColor
      ),

    icons: [
      {
        src: `/api/card-icon/${token}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };

  const response =
    NextResponse.json(manifest);

  response.headers.set(
    "Cache-Control",
    "no-store, max-age=0"
  );

  return response;
}
