import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: {
        publicToken: token,
      },
      include: {
        business: true,
        transactions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: `${customer.firstName} ${customer.lastName ?? ""}`.trim(),
      loyaltyBalance: customer.balance,
      lifetimeEarned: customer.lifetimeEarned,
      lifetimeRedeemed: customer.lifetimeRedeemed,

      recentTransactions: customer.transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        timestamp: t.createdAt,
      })),

      business: {
        name: customer.business.name,
        branding: {
          primaryColor: customer.business.primaryColor,
          secondaryColor: customer.business.secondaryColor,
          logoUrl: customer.business.logoUrl,
          coverImageUrl: customer.business.coverImageUrl,
          loyaltyProgramName:
            customer.business.loyaltyProgramName,
          pointsName: customer.business.pointsName,
          membershipName:
            customer.business.membershipName,
          welcomeMessage:
            customer.business.welcomeMessage,
        },
      },
    });

  } catch (error) {
    console.error("Card API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
