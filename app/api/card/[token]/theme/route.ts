import { isPublicCardToken } from "@/lib/cards/public-token";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { token } = await params;
  if (!isPublicCardToken(token)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const customer = await prisma.customer.findUnique({
    where: { publicToken: token },
    select: {
      isActive: true,
      business: {
        select: {
          isActive: true,
          secondaryColor: true,
        },
      },
    },
  });

  if (!customer || !customer.isActive || !customer.business.isActive) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const response = NextResponse.json({
    secondaryColor: /^#[0-9a-fA-F]{6}$/.test(customer.business.secondaryColor)
      ? customer.business.secondaryColor.toUpperCase()
      : "#60A5FA",
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
