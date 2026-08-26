import type { Metadata } from "next";
import Link from "next/link";
import CopyLinkButton from "@/components/copy-link-button";
import ShareLinkButton from "@/components/share-link-button";
import { getRequestBaseUrl } from "@/lib/app-url";
import { canApplyPublicReferral } from "@/lib/customers/public-membership-policy";
import { isPublicCardToken } from "@/lib/cards/public-token";
import { isOfferEligible } from "@/lib/offers/eligibility";
import { getRewardUnlockLifecycleState } from "@/lib/rewards/expiration";
import { getRewardAvailability } from "@/lib/rewards/availability";
import { getCustomerExperienceTheme } from "@/lib/theme";
import { getLanguageAttributes } from "@/lib/i18n";
import { getPublicCardLocalization } from "@/lib/cards/public-card-localization";
import { buildPublicCardProjection } from "@/lib/cards/public-card-projection";
import { publicCustomCardArtworkUrl } from "@/lib/cards/custom-card-storage";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import * as QRCode from "qrcode";
import { BadgeCheck, Gift, Sparkles, Users } from "lucide-react";

import SalesProgressPanel from "@/components/sales-progress-panel";
import { PublicCardActions } from "@/components/customer-experience/public-card-actions";
import { PublicLoyaltyCardViewer } from "@/components/customer-experience/public-loyalty-card-viewer";
import { PublicPageShell } from "@/components/customer-experience/public-page-shell";

// A publish changes the Business artwork pointers. Public cards must read those
// pointers on the next request instead of retaining a stale rendered page.
export const dynamic = "force-dynamic";

type PublicCardPageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    welcome?: string;
    lang?: string;
  }>;
};

export async function generateMetadata({
  params,
}: PublicCardPageProps): Promise<Metadata> {
  const { token } = await params;

  if (!isPublicCardToken(token)) {
    return { title: "كارت غير متاح" };
  }

  const customer = await prisma.customer.findUnique({
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
          isActive: true,
          cardDefaultLanguage: true,
        },
      },
    },
  });

  if (!customer || !customer.isActive || !customer.business.isActive) {
    return { title: "كارت غير متاح" };
  }

  const customerName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ");
  const { description } = getPublicCardLocalization(
    customer.business.cardDefaultLanguage,
    customerName,
  );

  return {
    title: `${customer.business.name} - ${customerName}`,
    description,
    manifest: `/api/card-manifest/${token}`,
    icons: {
      icon: `/api/card-icon/${token}?size=512&purpose=any`,
      apple: `/api/card-icon/${token}?size=180&purpose=any`,
    },
    appleWebApp: {
      capable: true,
      title: customer.business.name,
      statusBarStyle: "black-translucent",
    },
  };
}

export default async function PublicCardPage({
  params,
  searchParams,
}: PublicCardPageProps) {
  const { token } = await params;
  const query = await searchParams;
  const showWelcome = query.welcome === "1";

  if (!isPublicCardToken(token)) notFound();

  const customer = await prisma.customer.findUnique({
    where: { publicToken: token },
    include: {
      // Private staff notes and tag assignments are intentionally absent.
      // Public cards expose loyalty data only, never internal CRM metadata.
      business: {
        include: {
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
          },
        },
      },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
      _count: {
        select: { redemptions: true },
      },
      rewardUnlocks: {
        where: { redeemedAt: null },
        orderBy: { unlockedAt: "desc" },
        include: {
          reward: {
            select: {
              name: true,
              isActive: true,
            },
          },
        },
      },
      referralCodes: {
        where: { isActive: true },
        take: 1,
        select: { code: true },
      },
    },
  });

  if (!customer || !customer.isActive || !customer.business.isActive) {
    notFound();
  }

  const business = customer.business;
  const requestedLanguage =
    query.lang === "AR" || query.lang === "EN"
      ? query.lang
      : business.cardDefaultLanguage;
  const { language, lang, dir } = getLanguageAttributes(requestedLanguage);
  const languageHref = (nextLanguage: "AR" | "EN") =>
    `/card/${encodeURIComponent(token)}?lang=${nextLanguage}${showWelcome ? "&welcome=1" : ""}`;

  const theme = getCustomerExperienceTheme(business);
  const publicOffers = business.offers.filter((offer) =>
    isOfferEligible(
      offer,
      {
        businessId: customer.businessId,
        isActive: customer.isActive,
        createdAt: customer.createdAt,
        lifetimeEarned: customer.lifetimeEarned,
        lastActivityAt: customer.transactions[0]?.createdAt ?? null,
      },
      { id: business.id, rewardThreshold: business.rewardThreshold },
    ),
  );

  const rewardAvailability = getRewardAvailability({
    customerActive: customer.isActive,
    balance: customer.balance,
    rewardThreshold: business.rewardThreshold,
    fallbackReward: {
      name: business.rewardName,
      cost: business.rewardThreshold,
    },
    catalogueRewards: business.rewards,
  });
  const cardReward =
    rewardAvailability.source === "CATALOGUE"
      ? rewardAvailability.defaultReward
      : {
          name: business.rewardName,
          cost: business.rewardThreshold,
          type: business.rewardType,
          code: business.rewardCode,
          description: business.rewardDescription,
        };

  const baseUrl = await getRequestBaseUrl();
  const cardUrl = `${baseUrl}/card/${customer.publicToken}`;
  const referralLink =
    canApplyPublicReferral(business.plan) && customer.referralCodes[0]
      ? `${baseUrl}/join/${business.slug}?ref=${customer.referralCodes[0].code}`
      : null;

  const qrStyle =
    business.qrStyle === "ROUNDED" || business.qrStyle === "BRANDED"
      ? business.qrStyle
      : "CLASSIC";

  let qrCode: string | null = null;
  try {
    qrCode = await QRCode.toDataURL(cardUrl, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: qrStyle === "BRANDED" ? "H" : "M",
      color: {
        dark: qrStyle === "BRANDED" ? theme.primaryColor : "#111827",
        light: "#FFFFFFFF",
      },
    });
  } catch {
    // The public page stays usable through its visible share/copy controls.
  }

  const rewardExpiryStatuses = customer.rewardUnlocks
    .filter(
      (unlock) => unlock.businessId === business.id && unlock.reward.isActive,
    )
    .map((unlock) => ({
      id: unlock.id,
      name: unlock.reward.name,
      expiresAt: unlock.expiresAt,
      state: getRewardUnlockLifecycleState({
        rewardActive: unlock.reward.isActive,
        expiresAt: unlock.expiresAt,
        redeemedAt: unlock.redeemedAt,
        expiredAt: unlock.expiredAt,
      }),
    }));

  const customerName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ");
  const card = buildPublicCardProjection({
    customer: {
      name: customerName,
      code: customer.customerCode,
      balance: customer.balance,
    },
    program: {
      name: business.loyaltyProgramName,
      mode: business.loyaltyMode,
      unitName: business.unitName,
      currency: business.currency,
      // This stays the Business card language. The page-language switch is
      // intentionally separate and cannot translate the final card object.
      defaultLanguage: business.cardDefaultLanguage,
      reward: cardReward,
    },
    business: {
      name: business.name,
      logoUrl: business.logoUrl,
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      themePreset: business.themePreset,
      phone: business.contactPhone,
      website: business.website,
      city: business.city,
      country: business.country,
      address: business.address,
      social: business.instagramUrl,
    },
    design: {
      mode: business.cardDesignMode,
      standardArtworkEnabled: business.standardCardArtworkEnabled,
      standardArtworkCategory: business.standardCardArtworkCategory,
      customArtworkEnabled: business.customCardArtworkEnabled,
      customFrontArtworkUrl: publicCustomCardArtworkUrl(
        token,
        "front",
        business.customCardFrontArtworkUrl,
        business.id,
      ),
      customBackArtworkUrl: publicCustomCardArtworkUrl(
        token,
        "back",
        business.customCardBackArtworkUrl,
        business.id,
      ),
      customSafeZoneVersion: business.customCardSafeZoneVersion,
    },
  });

  const localizedDateFormatter = new Intl.DateTimeFormat(
    language === "AR" ? "ar-EG" : "en-US",
    { dateStyle: "medium", timeZone: "Africa/Cairo" },
  );

  return (
    <PublicPageShell lang={lang} dir={dir} primaryColor={theme.primaryColor}>
      <header className="mb-5 flex items-center justify-between gap-3 px-1 sm:px-2">
        <div className="flex min-w-0 items-center gap-3">
          {business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logoUrl}
              alt=""
              className="size-11 shrink-0 rounded-2xl border border-white/80 bg-white object-cover shadow-sm"
            />
          ) : (
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-base font-black text-white shadow-sm"
              style={{ backgroundColor: theme.primaryColor }}
              aria-hidden="true"
            >
              {business.name.trim().slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500">
              {language === "AR" ? "برنامج الولاء" : "Loyalty program"}
            </p>
            <p dir="auto" className="truncate font-black text-slate-950">
              {business.name}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div
            role="group"
            aria-label={language === "AR" ? "لغة الصفحة" : "Page language"}
            className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
          >
            <Link
              href={languageHref("AR")}
              aria-current={language === "AR" ? "page" : undefined}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-black transition ${language === "AR" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              عربي
            </Link>
            <Link
              href={languageHref("EN")}
              aria-current={language === "EN" ? "page" : undefined}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-black transition ${language === "EN" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              EN
            </Link>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 sm:flex">
            <BadgeCheck className="size-4" aria-hidden="true" />
            {language === "AR" ? "كارت نشط" : "Active card"}
          </span>
        </div>
      </header>

      <h1 className="sr-only">
        {language === "AR" ? "كارت الولاء الخاص بـ" : "Loyalty card for"}{" "}
        {customerName}
      </h1>

      <div className="mb-6">
        {showWelcome ? (
          <section className="lf-card-reveal mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-5 py-4 text-center shadow-sm">
            <h2 className="text-base font-black text-emerald-800">
              {language === "AR"
                ? "🎉 تم إنشاء كارتك بنجاح"
                : "🎉 Your card is ready"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-emerald-700">
              {language === "AR"
                ? `أهلاً بك في برنامج ولاء ${business.name}. كارتك جاهز للاستخدام.`
                : `Welcome to ${business.name}'s loyalty program. Your digital card is ready to use.`}
            </p>
          </section>
        ) : null}

        <PublicLoyaltyCardViewer
          businessName={card.business.name}
          logoUrl={card.business.logoUrl}
          primaryColor={card.business.primaryColor}
          secondaryColor={card.business.secondaryColor}
          themePreset={card.business.themePreset}
          customerName={card.membership.customerName}
          customerId={card.membership.customerId}
          balance={card.membership.balance}
          loyaltyMode={card.program.mode}
          unitName={card.program.unitName}
          currency={card.program.currency}
          rewardName={card.program.reward.name}
          rewardThreshold={card.program.reward.cost}
          qrCode={qrCode}
          artworkEnabled={card.design.standardArtwork.enabled}
          artworkCategory={card.design.standardArtwork.category}
          businessPhone={card.business.phone}
          businessWebsite={card.business.website}
          businessLocation={card.business.location}
          businessAddress={card.business.address}
          businessSocial={card.business.social}
          language={language}
          designMode={card.design.mode}
          customDesignEnabled={card.design.customArtwork.enabled}
          customFrontArtworkUrl={card.design.customArtwork.frontUrl}
          customBackArtworkUrl={card.design.customArtwork.backUrl}
          customSafeZoneVersion={card.design.customArtwork.safeZoneVersion}
        />
        <PublicCardActions
          cardUrl={cardUrl}
          businessName={business.name}
          customerName={customerName}
          language={language}
          primaryColor={theme.primaryColor}
        />
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.45)]">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <h2 className="font-black text-slate-950">
              {language === "AR" ? "عروض متاحة لك" : "Offers for you"}
            </h2>
          </div>

          {publicOffers.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-slate-500">
              {language === "AR"
                ? "لا توجد عروض متاحة لك حاليًا."
                : "There are no offers available to you right now."}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {publicOffers.map((offer) => (
                <article
                  key={offer.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <p dir="auto" className="font-black text-slate-950">
                    {offer.name}
                  </p>
                  {offer.description ? (
                    <p dir="auto" className="mt-1 text-sm leading-6 text-slate-600">
                      {offer.description}
                    </p>
                  ) : null}
                  {offer.validUntil ? (
                    <p className="mt-2 text-xs font-bold text-slate-500">
                      {language === "AR"
                        ? `متاح حتى ${localizedDateFormatter.format(offer.validUntil)}`
                        : `Available until ${localizedDateFormatter.format(offer.validUntil)}`}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        {referralLink ? (
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.45)]">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <Users className="size-5" aria-hidden="true" />
              </span>
              <h2 className="font-black text-slate-950">
                {language === "AR" ? "ادعُ صديقًا" : "Invite a friend"}
              </h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {language === "AR"
                ? "شارك رابط الدعوة مع أصدقائك. تُسجّل الإحالة عند انضمام عميل جديد لهذا النشاط."
                : "Share your invitation link. The referral is recorded when a new customer joins this business."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ShareLinkButton
                value={referralLink}
                title={business.name}
                text={
                  language === "AR"
                    ? `انضم إلى برنامج ولاء ${business.name}`
                    : `Join ${business.name}'s loyalty program`
                }
                label={language === "AR" ? "مشاركة الدعوة" : "Share invite"}
                className="rounded-xl bg-slate-950 px-3 py-3 text-sm font-black text-white transition hover:bg-slate-800"
              />
              <CopyLinkButton
                value={referralLink}
                label={language === "AR" ? "نسخ الرابط" : "Copy link"}
                copiedLabel={language === "AR" ? "تم النسخ ✓" : "Copied ✓"}
                className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
              />
            </div>
          </section>
        ) : null}

        {rewardExpiryStatuses.length > 0 ? (
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.45)] md:col-span-2">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Gift className="size-5" aria-hidden="true" />
              </span>
              <h2 className="font-black text-slate-950">
                {language === "AR" ? "حالة المكافآت" : "Reward status"}
              </h2>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {rewardExpiryStatuses.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm"
                >
                  <span dir="auto" className="font-bold text-slate-800">
                    {reward.name}
                  </span>
                  {reward.state === "EXPIRED" ? (
                    <span className="shrink-0 font-black text-rose-700">
                      {language === "AR" ? "منتهية" : "Expired"}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs font-bold text-emerald-700">
                      {language === "AR"
                        ? `صالحة حتى ${localizedDateFormatter.format(reward.expiresAt)}`
                        : `Valid until ${localizedDateFormatter.format(reward.expiresAt)}`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {business.loyaltyMode === "SALES_AMOUNT" ? (
        <div className="mt-4">
          <SalesProgressPanel
            currentAmount={customer.balance}
            targetAmount={cardReward.cost}
            currency={business.currency}
            rewardName={cardReward.name}
            rewardType={cardReward.type ?? business.rewardType}
            rewardCode={cardReward.code ?? null}
            rewardDescription={cardReward.description ?? null}
            primaryColor={theme.primaryColor}
            defaultLanguage={language}
          />
        </div>
      ) : null}
    </PublicPageShell>
  );
}
