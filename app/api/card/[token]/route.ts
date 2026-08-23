import { NextRequest, NextResponse } from "next/server";
import { isPublicCardToken } from "@/lib/cards/public-token";
import { buildPublicCardProjection } from "@/lib/cards/public-card-projection";
import { publicCustomCardArtworkUrl } from "@/lib/cards/custom-card-storage";
import { isOfferEligible } from "@/lib/offers/eligibility";
import { getRewardAvailability } from "@/lib/rewards/availability";
import prisma from "@/lib/prisma";
import { logServerError } from "@/lib/server/logging";
import { getClientAddress, rateLimit } from "@/lib/utils/rate-limiter";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!isPublicCardToken(token)) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    const limit = rateLimit(
      `public-card-api:${getClientAddress(request.headers)}:${token}`,
      { limit: 60, windowMs: 60_000 }
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

    const customer = await prisma.customer.findUnique({
      where: {
        publicToken: token,
      },
      select: {
        firstName: true,
        lastName: true,
        customerCode: true,
        balance: true,
        lifetimeEarned: true,
        lifetimeRedeemed: true,
        businessId: true,
        createdAt: true,
        isActive: true,
        business: {
          select: {
            id: true,
            name: true,
            isActive: true,
            rewardThreshold: true,
            rewardName: true,
            rewardType: true,
            rewardCode: true,
            rewardDescription: true,
            loyaltyMode: true,
            unitName: true,
            currency: true,
            primaryColor: true,
            secondaryColor: true,
            themePreset: true,
            logoUrl: true,
            coverImageUrl: true,
            qrStyle: true,
            qrPosition: true,
            loyaltyProgramName: true,
            pointsName: true,
            membershipName: true,
            welcomeMessage: true,
            cardDefaultLanguage: true,
            contactPhone: true,
            website: true,
            city: true,
            country: true,
            address: true,
            instagramUrl: true,
            cardDesignMode: true,
            standardCardArtworkEnabled: true,
            standardCardArtworkCategory: true,
            customCardArtworkEnabled: true,
            customCardFrontArtworkUrl: true,
            customCardBackArtworkUrl: true,
            customCardSafeZoneVersion: true,
            rewards: {
              where: { isActive: true },
              select: {
                id: true,
                name: true,
                cost: true,
                isActive: true,
                type: true,
                code: true,
                description: true,
              },
            },
            offers: {
              orderBy: [{ validUntil: "asc" }, { createdAt: "asc" }],
              select: {
                businessId: true,
                name: true,
                description: true,
                isActive: true,
                validFrom: true,
                validUntil: true,
                eligibility: true,
                segment: true,
              },
            },
          },
        },
        transactions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
          select: {
            type: true,
            amount: true,
            createdAt: true,
          },
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
        name: offer.name,
        description: offer.description,
        validUntil: offer.validUntil,
      }));
    const rewardAvailability = getRewardAvailability({
      customerActive: customer.isActive,
      balance: customer.balance,
      rewardThreshold: customer.business.rewardThreshold,
      fallbackReward: {
        name: customer.business.rewardName,
        cost: customer.business.rewardThreshold,
        type: customer.business.rewardType,
        code: customer.business.rewardCode,
        description: customer.business.rewardDescription,
      },
      catalogueRewards: customer.business.rewards,
    });
    const card = buildPublicCardProjection({
      customer: {
        name: `${customer.firstName} ${customer.lastName ?? ""}`.trim(),
        code: customer.customerCode,
        balance: customer.balance,
      },
      program: {
        name: customer.business.loyaltyProgramName,
        mode: customer.business.loyaltyMode,
        unitName: customer.business.unitName,
        currency: customer.business.currency,
        defaultLanguage: customer.business.cardDefaultLanguage,
        reward: rewardAvailability.defaultReward,
      },
      business: {
        name: customer.business.name,
        logoUrl: customer.business.logoUrl,
        primaryColor: customer.business.primaryColor,
        themePreset: customer.business.themePreset,
        phone: customer.business.contactPhone,
        website: customer.business.website,
        city: customer.business.city,
        country: customer.business.country,
        address: customer.business.address,
        social: customer.business.instagramUrl,
      },
      design: {
        mode: customer.business.cardDesignMode,
        standardArtworkEnabled:
          customer.business.standardCardArtworkEnabled,
        standardArtworkCategory:
          customer.business.standardCardArtworkCategory,
        customArtworkEnabled: customer.business.customCardArtworkEnabled,
        customFrontArtworkUrl: publicCustomCardArtworkUrl(
          token,
          "front",
          customer.business.customCardFrontArtworkUrl,
          customer.business.id,
        ),
        customBackArtworkUrl: publicCustomCardArtworkUrl(
          token,
          "back",
          customer.business.customCardBackArtworkUrl,
          customer.business.id,
        ),
        customSafeZoneVersion: customer.business.customCardSafeZoneVersion,
      },
    });

    const response = NextResponse.json({
      name: `${customer.firstName} ${customer.lastName ?? ""}`.trim(),
      loyaltyBalance: customer.balance,
      lifetimeEarned: customer.lifetimeEarned,
      lifetimeRedeemed: customer.lifetimeRedeemed,

      recentTransactions: customer.transactions.map((t) => ({
        type: t.type,
        amount: t.amount,
        timestamp: t.createdAt,
      })),

      // Deliberately public-safe: no internal eligibility or audience rule.
      offers,

      // Canonical additive contract. Legacy branding fields remain below for
      // compatibility until their consumers are measured and migrated.
      card,

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
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;

  } catch (error) {
    logServerError("public_card_api_failed", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
