import type { Metadata } from "next";
import DigitalLoyaltyCard from "@/components/digital-loyalty-card";
import CopyLinkButton from "@/components/copy-link-button";
import { getRequestBaseUrl } from "@/lib/app-url";
import { calculateRewardProgress } from "@/lib/loyalty/progress";
import { isOfferEligible } from "@/lib/offers/eligibility";
import { getPersistedRewardUnlockState } from "@/lib/rewards/expiration";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import * as QRCode from "qrcode";

import SalesProgressPanel from "@/components/sales-progress-panel";
import AutoFlipMembershipCard from "@/components/auto-flip-membership-card";
type PublicCardPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export async function generateMetadata({
  params,
}: PublicCardPageProps): Promise<Metadata> {
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

  return {
    title:
      `${customer.business.name} - ${customerName}`,

    description:
      `بطاقة الولاء الرقمية الخاصة بـ ${customerName}`,

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
}: PublicCardPageProps) {
  const { token } = await params;

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

  const qrCode =
    await QRCode.toDataURL(
      cardUrl,
      {
        width: 360,
        margin: 2,
        errorCorrectionLevel:
          "M",
      }
    );

  /*
   * البيانات المحسوبة لا يتم تخزينها،
   * بل يتم حسابها مباشرة حتى تظل محدثة.
   */
  const {
    progress,
    remaining,
    rewardAvailable,
  } = calculateRewardProgress(
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
      (transaction) => {
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
          id: transaction.id,
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
    <main className="min-h-screen bg-slate-950 px-4 py-5 sm:py-10">

      <div className="mx-auto mb-6 w-full max-w-md">
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
            business.primaryColor
          }
          secondaryColor={
            business.secondaryColor
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
      </div>

      <h1 className="sr-only">
        كارت الولاء الخاص بـ{" "}
        {customerName}
      </h1>

      {referralLink ? (
        <section className="mx-auto mb-6 w-full max-w-md rounded-3xl bg-white p-5 text-right shadow-sm" dir="rtl">
          <h2 className="font-black text-slate-950">ادعُ صديقًا</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            شارك الرابط. يتم تسجيل الإحالة فقط عند انضمام عميل جديد لهذا النشاط؛ لا تُمنح أي نقاط تلقائيًا.
          </p>
          <div className="mt-4">
            <CopyLinkButton value={referralLink} label="نسخ رابط الدعوة" />
          </div>
        </section>
      ) : null}

      <section className="mx-auto mb-6 w-full max-w-md rounded-3xl bg-white p-5 text-right shadow-sm" dir="rtl">
        <h2 className="font-black text-slate-950">عروض متاحة لك</h2>
        {publicOffers.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-slate-500">لا توجد عروض متاحة لك حاليًا.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {publicOffers.map((offer) => (
              <article key={offer.id} className="rounded-2xl bg-violet-50 px-4 py-3">
                <p className="font-black text-slate-950">{offer.name}</p>
                {offer.description ? <p className="mt-1 text-sm leading-6 text-slate-600">{offer.description}</p> : null}
                {offer.validUntil ? <p className="mt-2 text-xs font-bold text-violet-700">متاح حتى {dateFormatter.format(offer.validUntil)}</p> : null}
              </article>
            ))}
          </div>
        )}
      </section>

      {rewardExpiryStatuses.length > 0 ? (
        <section className="mx-auto mb-6 w-full max-w-md rounded-3xl bg-white p-5 text-right shadow-sm" dir="rtl">
          <h2 className="font-black text-slate-950">حالة المكافآت</h2>
          <div className="mt-3 space-y-2">
            {rewardExpiryStatuses.map((reward) => (
              <div key={reward.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                <span className="font-bold text-slate-800">{reward.name}</span>
                {reward.state === "EXPIRED" ? (
                  <span className="font-black text-rose-700">منتهية</span>
                ) : (
                  <span className="font-bold text-emerald-700">
                    صالحة حتى {dateFormatter.format(reward.expiresAt)}
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
                business.primaryColor
              }
            />
          )}

      <DigitalLoyaltyCard
        /* ثابت من بيانات البراند */
        businessName={
          business.name
        }
        logoUrl={
          business.logoUrl
        }
        primaryColor={
          business.primaryColor
        }
        businessPhone={
          business.contactPhone?.trim() ||
          "01033196610"
        }
        businessAddress={
          business.address?.trim() ||
          "١ شارع دكتور لاشين، المريوطية الرئيسي، فيصل، الجيزة"
        }
        terms={renderedTerms}

        /* متغير تلقائيًا حسب العميل */
        customerName={
          customerName
        }
        customerCode={
          customer.customerCode
        }
        balance={
          customer.balance
        }
        qrCode={qrCode}
        cardUrl={cardUrl}
        activities={activities}
        redemptions={
          customer._count
            .redemptions
        }

        /* إعدادات برنامج الولاء */
        unitName={
          business.unitName
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

        /* قيم محسوبة تلقائيًا */
        progress={progress}
        remaining={remaining}
        rewardAvailable={
          cardRewardAvailable
        }
      />
    </main>
  );
}
