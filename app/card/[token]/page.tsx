import type { Metadata } from "next";
import DigitalLoyaltyCard from "@/components/digital-loyalty-card";
import { getRequestBaseUrl } from "@/lib/app-url";
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
        business: true,

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
  const progress = Math.min(
    100,
    Math.max(
      0,
      Math.floor(
        (customer.balance /
          business.rewardThreshold) *
          100
      )
    )
  );

  const rewardAvailable =
    customer.balance >=
    business.rewardThreshold;

  const remaining = Math.max(
    0,
    business.rewardThreshold -
      customer.balance
  );

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
            rewardAvailable
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
          rewardAvailable
        }
      />
    </main>
  );
}
