import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

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

  const manifest = {
    id: `/card/${token}`,

    name:
      `${customer.business.name} - ${customerName}`,

    short_name:
      customer.business.name.slice(
        0,
        18
      ),

    description:
      `بطاقة الولاء الرقمية الخاصة بـ ${customerName}`,

    start_url:
      `/card/${token}`,

    scope: "/card/",

    display: "standalone",

    orientation: "portrait",

    lang: "ar",

    dir: "rtl",

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
