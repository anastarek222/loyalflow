import type { Metadata } from "next";
import CopyLinkButton from "@/components/copy-link-button";
import ShareLinkButton from "@/components/share-link-button";
import { getRequestBaseUrl } from "@/lib/app-url";
import { isPublicCardToken } from "@/lib/cards/public-token";
import { calculateRewardProgress } from "@/lib/loyalty/progress";
import { isOfferEligible } from "@/lib/offers/eligibility";
import { getPersistedRewardUnlockState } from "@/lib/rewards/expiration";
import { getBusinessTheme } from "@/lib/theme";
import { getLanguageAttributes } from "@/lib/i18n";
import { getPublicCardLocalization } from "@/lib/cards/public-card-localization";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import * as QRCode from "qrcode";

import SalesProgressPanel from "@/components/sales-progress-panel";
import AutoFlipMembershipCard from "@/components/auto-flip-membership-card";
import { PublicCardActions } from "@/components/customer-experience/public-card-actions";
import { PublicPageShell } from "@/components/customer-experience/public-page-shell";
type PublicCardPageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    welcome?: string;
  }>;
};

export async function generateMetadata({
  params,
}: PublicCardPageProps): Promise<Metadata> {
  const { token } = await params;

  if (!isPublicCardToken(token)) {
    return { title: "كارت غير متاح" };
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
    return {
      title: "كارت غير متاح",
    };
  }

  const customerName = [
    customer.firstName,
    customer.lastName,
  ]
    .filter(Boolean)
    .join(" ");
  const { description } = getPublicCardLocalization(
    customer.business.cardDefaultLanguage,
    customerName
  );

  return {
    title:
      `${customer.business.name} - ${customerName}`,

    description,

    manifest:
      `/api/card-manifest/${token}`,

    icons: {
      icon:
        `/api/card-icon/${token}`,

      apple:
        `/api/card-icon/${token}`,
    },

    appleWebApp: {
      capable: true,
      title:
        customer.business.name,
      statusBarStyle:
        "black-translucent",
    },
  };
}

const dateFormatter =
  new Intl.DateTimeFormat(
    "ar-EG",
    {
      dateStyle: "medium",
      timeZone:
        "Africa/Cairo",
    }
  );

function normalizeArabicVisitGrammar(
  value: string
) {
  return value
    .replace(
      /\b1\s+زيارة\b/g,
      "زيارة واحدة"
    )
    .replace(
      /\b2\s+زيارة\b/g,
      "زيارتان"
    )
    .replace(
      /\b(3|4|5|6|7|8|9|10)\s+زيارة\b/g,
      "$1 زيارات"
    );
}

function renderCardTemplate(
  template: string,
  values: {
    reward: string;
    threshold: number;
    unit: string;
    earn: number;
  }
) {
  const replacements = {
    reward: values.reward,
    threshold: String(
      values.threshold
    ),
    unit: values.unit,
    earn: String(values.earn),
  };

  return template.replace(
    /\{([a-z_]+)\}/g,
    (match, key: string) => {
      if (
        Object.prototype.hasOwnProperty.call(
          replacements,
          key
        )
      ) {
        return replacements[
          key as keyof typeof replacements
        ];
      }

      return match;
    }
  );
}

export default async function PublicCardPage({
  params,
  searchParams,
}: PublicCardPageProps) {
  const { token } = await params;
  const query = await searchParams;
  const showWelcome = query.welcome === "1";

  if (!isPublicCardToken(token)) {
    notFound();
  }

  /*
   * publicToken مختلف لكل عميل،
   * ومنه يتم تحميل كل بيانات الكارت تلقائيًا.
   */
  const customer =
    await prisma.customer.findUnique({
      where: {
        publicToken: token,
      },

      include: {
        // Private staff notes and tag assignments are intentionally absent.
        // Public cards expose loyalty data only, never internal CRM metadata.
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

          take: 3,
        },

        _count: {
          select: {
            redemptions: true,
          },
        },
        rewardUnlocks: {
          where: {
            redeemedAt: null,
          },
          orderBy: {
            unlockedAt: "desc",
          },
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
          where: {
            isActive: true,
          },
          take: 1,
          select: {
            code: true,
          },
        },
      },
    });

  if (
    !customer ||
    !customer.isActive ||
    !customer.business.isActive
  ) {
    notFound();
  }

  const business =
    customer.business;

  const { language, lang, dir } = getLanguageAttributes(
    business.cardDefaultLanguage
  );

  const theme =
    getBusinessTheme(business);
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
      { id: business.id, rewardThreshold: business.rewardThreshold }
    )
  );

  const cardUnitName =
    business.pointsName?.trim() ||
    business.unitName;

  const baseUrl =
    await getRequestBaseUrl();

  /*
   * الرابط ورمز QR مختلفان تلقائيًا
   * حسب publicToken الخاص بالعميل.
   */
  const cardUrl =
    `${baseUrl}/card/${customer.publicToken}`;
  const referralLink = customer.referralCodes[0]
    ? `${baseUrl}/join/${business.slug}?ref=${customer.referralCodes[0].code}`
    : null;

  const qrStyle =
    business.qrStyle === "ROUNDED" ||
    business.qrStyle === "BRANDED"
      ? business.qrStyle
      : "CLASSIC";

  const qrPosition =
    business.qrPosition === "LEFT" ||
    business.qrPosition === "RIGHT"
      ? business.qrPosition
      : "CENTER";

  let qrCode: string | null = null;
  try {
    qrCode = await QRCode.toDataURL(cardUrl, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: qrStyle === "BRANDED" ? "H" : "M",
      // Stored QR style is presentation-only; the destination remains cardUrl.
      color: { dark: qrStyle === "BRANDED" ? theme.primaryColor : "#111827", light: "#FFFFFFFF" },
    });
  } catch {
    // The public page stays usable through its visible share/copy controls.
  }

  /*
   * البيانات المحسوبة لا يتم تخزينها،
   * بل يتم حسابها مباشرة حتى تظل محدثة.
   */
  const { rewardAvailable } =
    calculateRewardProgress(
      customer.balance,
      business.rewardThreshold
    );

  const rewardExpiryStatuses = customer.rewardUnlocks
    .filter((unlock) => unlock.businessId === business.id && unlock.reward.isActive)
    .map((unlock) => ({
      id: unlock.id,
      name: unlock.reward.name,
      expiresAt: unlock.expiresAt,
      state: getPersistedRewardUnlockState({
        expiresAt: unlock.expiresAt,
        redeemedAt: unlock.redeemedAt,
        expiredAt: unlock.expiredAt,
      }),
    }));
  const cardRewardAvailable =
    rewardAvailable &&
    (!rewardExpiryStatuses.some((reward) => reward.state === "EXPIRED") ||
      rewardExpiryStatuses.some((reward) => reward.state === "ACTIVE"));

  const customerName = [
    customer.firstName,
    customer.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  /*
   * شروط ثابتة لكل البراند،
   * لكنها تدعم متغيرات تتحدث تلقائيًا:
   *
   * {reward}
   * {threshold}
   * {unit}
   * {earn}
   */
  const defaultTerms = [
    "كل عملية مؤهلة تضيف {earn} {unit}.",
    "عند الوصول إلى {threshold} {unit} يحصل العميل على {reward}.",
    "لا يمكن استبدال الرصيد نقدًا.",
  ].join("\n");

  const renderedTerms =
    renderCardTemplate(
      business.cardTerms?.trim() ||
        defaultTerms,

      {
        reward:
          business.rewardName,

        threshold:
          business.rewardThreshold,

        unit:
          business.unitName,

        earn:
          business.earnAmount,
      }
    )
      .split(/\r?\n/)
      .map((term) =>
        normalizeArabicVisitGrammar(
          term.trim()
        )
      )
      .filter(Boolean);

  /*
   * آخر الحركات متغيرة تلقائيًا
   * حسب سجل العميل.
   */
  const activities =
    customer.transactions.map(
      (transaction, index) => {
        let label =
          "تم تعديل الرصيد";

        if (
          transaction.type ===
          "EARN"
        ) {
          label =
            business.loyaltyMode ===
            "VISITS"
              ? "تمت إضافة زيارة"
              : "تمت إضافة نقاط";
        }

        if (
          transaction.type ===
          "REDEEM"
        ) {
          label =
            "تم استبدال المكافأة";
        }

        return {
          id: `activity-${transaction.createdAt.getTime()}-${index}`,
          label,
          amount:
            transaction.amount,

          date:
            dateFormatter.format(
              transaction.createdAt
            ),
        };
      }
    );

  return (
    <PublicPageShell lang={lang} dir={dir} primaryColor={theme.primaryColor}>
      <div className="mb-6">
        {showWelcome ? (
          <section
            className="mb-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-4 text-center backdrop-blur-sm"
          >
            <h2 className="text-lg font-black text-emerald-100">
              {language === "AR"
                ? "🎉 تم إنشاء كارتك بنجاح"
                : "🎉 Your card is ready"}
            </h2>

            <p className="mt-1 text-sm leading-6 text-emerald-50/90">
              {language === "AR"
                ? `أهلاً بك في برنامج ولاء ${business.name}. كارتك جاهز للاستخدام.`
                : `Welcome to ${business.name}'s loyalty program. Your digital card is ready to use.`}
            </p>
          </section>
        ) : null}

        <AutoFlipMembershipCard
          businessName={
            business.name
          }
          logoUrl={
            business.logoUrl
          }
          coverImageUrl={
            business.coverImageUrl
          }
          primaryColor={
            theme.primaryColor
          }
          secondaryColor={
            business.secondaryColor
          }
          theme={
            theme
          }
          customerName={
            customerName
          }
          customerCode={
            customer.customerCode
          }
          loyaltyProgramName={
            business.loyaltyProgramName
          }
          membershipName={
            business.membershipName
          }
          welcomeMessage={
            business.welcomeMessage
          }
          balance={
            customer.balance
          }
          unitName={
            cardUnitName
          }
          loyaltyMode={
            business.loyaltyMode
          }
          rewardName={
            business.rewardName
          }
          rewardThreshold={
            business.rewardThreshold
          }
          rewardType={
            business.rewardType
          }
          rewardCode={
            business.rewardCode
          }
          rewardDescription={
            business.rewardDescription
          }
          rewardAvailable={
            cardRewardAvailable
          }
          qrCode={
            qrCode
          }
          qrStyle={
            qrStyle
          }
          qrPosition={
            qrPosition
          }
          terms={
            renderedTerms
          }
          activities={
            activities
          }
          redemptions={
            customer._count.redemptions
          }
          businessPhone={
            business.contactPhone ??
            ""
          }
          businessAddress={
            business.address ??
            ""
          }
          defaultLanguage={
            business.cardDefaultLanguage
          }
        />
        <PublicCardActions cardUrl={cardUrl} businessName={business.name} customerName={customerName} language={language} />
      </div>

      <h1 className="sr-only">
        {language === "AR" ? "كارت الولاء الخاص بـ" : "Loyalty card for"}{" "}
        {customerName}
      </h1>

      {referralLink ? (
        <section
          className="mx-auto mb-6 w-full max-w-md rounded-3xl bg-white p-5 shadow-sm"
        >
          <h2 className="font-black text-slate-950">
            {language === "AR"
              ? "ادعُ صديقًا"
              : "Invite a friend"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {language === "AR"
              ? "شارك رابط الدعوة مع أصدقائك. يتم تسجيل الإحالة عند انضمام عميل جديد لهذا النشاط."
              : "Share your invitation link with friends. The referral is recorded when a new customer joins this business."}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <ShareLinkButton
              value={referralLink}
              title={business.name}
              text={
                language === "AR"
                  ? `انضم إلى برنامج ولاء ${business.name}`
                  : `Join ${business.name}'s loyalty program`
              }
              label={
                language === "AR"
                  ? "مشاركة الدعوة"
                  : "Share invite"
              }
              className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            />

            <CopyLinkButton
              value={referralLink}
              label={
                language === "AR"
                  ? "نسخ رابط الدعوة"
                  : "Copy invite link"
              }
              copiedLabel={
                language === "AR"
                  ? "تم النسخ ✓"
                  : "Copied ✓"
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
            />
          </div>
        </section>
      ) : null}

      <section
        className="mx-auto mb-6 w-full max-w-md rounded-3xl bg-white p-5 shadow-sm"
      >
        <h2 className="font-black text-slate-950">
          {language === "AR"
            ? "عروض متاحة لك"
            : "Offers available to you"}
        </h2>

        {publicOffers.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {language === "AR"
              ? "لا توجد عروض متاحة لك حاليًا."
              : "There are no offers available to you right now."}
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {publicOffers.map((offer) => (
              <article
                key={offer.id}
                className="rounded-2xl bg-violet-50 px-4 py-3"
              >
                <p className="font-black text-slate-950">
                  {offer.name}
                </p>

                {offer.description ? (
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {offer.description}
                  </p>
                ) : null}

                {offer.validUntil ? (
                  <p className="mt-2 text-xs font-bold text-violet-700">
                    {language === "AR"
                      ? `متاح حتى ${dateFormatter.format(offer.validUntil)}`
                      : `Available until ${dateFormatter.format(offer.validUntil)}`}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      {rewardExpiryStatuses.length > 0 ? (
        <section
          className="mx-auto mb-6 w-full max-w-md rounded-3xl bg-white p-5 shadow-sm"
        >
          <h2 className="font-black text-slate-950">
            {language === "AR"
              ? "حالة المكافآت"
              : "Reward status"}
          </h2>

          <div className="mt-3 space-y-2">
            {rewardExpiryStatuses.map((reward) => (
              <div
                key={reward.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm"
              >
                <span className="font-bold text-slate-800">
                  {reward.name}
                </span>

                {reward.state === "EXPIRED" ? (
                  <span className="font-black text-rose-700">
                    {language === "AR"
                      ? "منتهية"
                      : "Expired"}
                  </span>
                ) : (
                  <span className="font-bold text-emerald-700">
                    {language === "AR"
                      ? `صالحة حتى ${dateFormatter.format(reward.expiresAt)}`
                      : `Valid until ${dateFormatter.format(reward.expiresAt)}`}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

        {business.loyaltyMode ===
          "SALES_AMOUNT" && (
            <SalesProgressPanel
              currentAmount={
                customer.balance
              }
              targetAmount={
                business.rewardThreshold
              }
              unitName={
                business.unitName
              }
              rewardName={
                business.rewardName
              }
              rewardType={
                business.rewardType
              }
              rewardCode={
                business.rewardCode
              }
              rewardDescription={
                business.rewardDescription
              }
              primaryColor={
                theme.primaryColor
              }
              defaultLanguage={
                 business.cardDefaultLanguage
              } 
            />
          )}


    </PublicPageShell>
  );
}
