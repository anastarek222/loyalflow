import { NextRequest, NextResponse } from "next/server";
import { isOfferEligible } from "@/lib/offers/eligibility";
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
        // Keep tenant-private notes/tags out of every public-card response.
        business: {
          include: {
            offers: {
              orderBy: [{ validUntil: "asc" }, { createdAt: "asc" }],
            },
          },
        },
        transactions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
    });

    if (!customer || !customer.isActive || !customer.business.isActive) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    const offers = customer.business.offers
      .filter((offer) => isOfferEligible(
        offer,
        {
          businessId: customer.businessId,
          isActive: customer.isActive,
          createdAt: customer.createdAt,
          lifetimeEarned: customer.lifetimeEarned,
          lastActivityAt: customer.transactions[0]?.createdAt ?? null,
        },
        {
          id: customer.business.id,
          rewardThreshold: customer.business.rewardThreshold,
        }
      ))
      .map((offer) => ({
        id: offer.id,
        name: offer.name,
        description: offer.description,
        validUntil: offer.validUntil,
      }));

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

      // Deliberately public-safe: no internal eligibility or audience rule.
      offers,

      business: {
        name: customer.business.name,
        branding: {
          primaryColor: customer.business.primaryColor,
          secondaryColor: customer.business.secondaryColor,
          logoUrl: customer.business.logoUrl,
          coverImageUrl: customer.business.coverImageUrl,
          qrStyle: customer.business.qrStyle,
          qrPosition: customer.business.qrPosition,
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
