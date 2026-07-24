import { auth } from "@/auth";
import BusinessSettingsForm from "@/components/business-settings-form";
import CardBusinessDetailsForm from "@/components/card-business-details-form";
import { AdministrationNavigation } from "@/components/administration/administration-navigation";
import { getRequestBaseUrl } from "@/lib/app-url";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { DEFAULT_WHATSAPP_TEMPLATES } from "@/lib/whatsapp-templates";
import { normalizeLanguage } from "@/lib/i18n";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import * as QRCode from "qrcode";

import {
  syncGoogleSheetAction,
  updateBusinessCardDetailsAction,
  updateBusinessSettingsAction,
  updateBusinessExportPermissionAction,
} from "./actions";

type BusinessSettingsPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    saved?: string;
    error?: string;
    sheetSync?: string;
    cardSaved?: string;
    cardError?: string;
  }>;
};

export default async function BusinessSettingsPage({
  params,
  searchParams,
}: BusinessSettingsPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { slug } = await params;
  const query = await searchParams;

  const business = await prisma.business.findUnique({
    where: {
      slug,
    },
  });

  if (!business) {
    notFound();
  }

  const canManage = canManageBusiness(session.user, business.id);

  if (!canManage) {
    redirect("/dashboard");
  }

  const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { language: true } });
  const language = normalizeLanguage(currentUser?.language);

  const updateSettings = updateBusinessSettingsAction.bind(null, business.slug);

  const syncGoogleSheet = syncGoogleSheetAction.bind(null, business.slug);

  const updateCardDetails = updateBusinessCardDetailsAction.bind(
    null,
    business.slug,
  );

  const joinUrl = `${await getRequestBaseUrl()}/join/${business.slug}`;
  const joinQrCode = await QRCode.toDataURL(joinUrl, {
    width: 360,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <AdministrationNavigation user={session.user} businessId={business.id} slug={business.slug} active="settings" language={language} />
        <Link
          href={`/businesses/${business.slug}`}
          className="text-sm font-medium text-violet-600 hover:text-violet-800"
        >
          → الرجوع إلى {business.name}
        </Link>

        <header className="mb-8 mt-4">
          <h1 className="text-3xl font-bold text-slate-950">إعدادات النشاط</h1>

          <p className="mt-1 text-slate-500">
            تخصيص برنامج الولاء والكارت الرقمي.
          </p>
        </header>

        {query.sheetSync === "success" && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            تمت مزامنة Google Sheets بنجاح.
          </div>
        )}

        {query.sheetSync === "error" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            تعذرت مزامنة Google Sheets. حاول مرة أخرى.
          </div>
        )}

        <section className="mb-8 rounded-3xl border border-violet-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-violet-700">
                التسجيل الذاتي
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-950">
                QR لانضمام العملاء
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                اطبع هذا الرمز أو شارك الرابط حتى يسجل العملاء بأنفسهم ويستلموا
                كارتهم الرقمي.
              </p>

              <a
                href={joinUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block break-all text-sm font-bold text-violet-700 underline underline-offset-4"
              >
                {joinUrl}
              </a>
            </div>

            {/* QR data URLs are generated on the server and cannot use next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={joinQrCode}
              alt={`QR للتسجيل الذاتي في ${business.name}`}
              className="h-48 w-48 rounded-2xl border border-slate-200 bg-white p-2"
            />
          </div>
        </section>

        <section className="mb-8 flex flex-col gap-4 rounded-3xl border border-amber-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-amber-700">كتالوج المكافآت</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              مكافآت متعددة قابلة للتفعيل
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              أضف مكافآت إضافية وحدد ما يظهر للموظفين عند استبدال رصيد العميل.
            </p>
          </div>

          <Link
            href={`/businesses/${business.slug}/rewards`}
            className="shrink-0 rounded-xl bg-amber-500 px-5 py-3 text-center font-black text-white transition hover:bg-amber-600"
          >
            إدارة المكافآت
          </Link>
        </section>

        <section className="mb-8 flex flex-col gap-4 rounded-3xl border border-violet-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-violet-700">انطلاقة أسرع</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              قوالب تشغيل النشاط
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              عاين إعدادات مناسبة لنشاطك ثم طبّقها صراحةً. القالب لا ينشئ عروضًا
              أو Promotions أو رسائل تلقائية.
            </p>
          </div>

          <Link
            href={`/businesses/${business.slug}/playbooks`}
            className="shrink-0 rounded-xl bg-violet-600 px-5 py-3 text-center font-black text-white transition hover:bg-violet-700"
          >
            استعرض القوالب
          </Link>
        </section>

        <section className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              النسخ الاحتياطي على Google Sheets
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              إرسال أحدث بيانات العملاء والأرصدة والمكافآت إلى ملف النشاط.
            </p>
          </div>

          <form action={syncGoogleSheet}>
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
            >
              مزامنة Google Sheets
            </button>
          </form>
        </section>

        {query.cardSaved === "1" && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            تم حفظ بيانات الكارت بنجاح.
          </div>
        )}

        {query.cardError === "invalid" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            راجع رقم الهاتف والعنوان وشروط الكارت.
          </div>
        )}

        <CardBusinessDetailsForm
          contactPhone={business.contactPhone ?? "01033196610"}
          address={
            business.address ??
            "١ شارع دكتور لاشين، المريوطية الرئيسي، فيصل، الجيزة"
          }
          cardTerms={
            business.cardTerms ??
            [
              "كل عملية مؤهلة تضيف {earn} {unit}.",
              "عند الوصول إلى {threshold} {unit} يحصل العميل على {reward}.",
              "لا يمكن استبدال الرصيد نقدًا.",
            ].join("\n")
          }
          action={updateCardDetails}
        />

        {session.user.role === "SUPER_ADMIN" ? (
          <section className="mb-6 rounded-3xl border border-violet-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-black text-violet-700">
                  إعدادات مدير النظام
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-950">
                  صلاحية تصدير البيانات
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  عند التفعيل يستطيع مالك النشاط تصدير العملاء وتقارير الحركات.
                  الموظفون لا يحصلون على صلاحية التصدير.
                </p>
              </div>

              <form
                action={updateBusinessExportPermissionAction.bind(
                  null,
                  business.slug,
                )}
                className="flex shrink-0 flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:min-w-72"
              >
                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <span className="font-black text-slate-800">
                    السماح للمالك بالتصدير
                  </span>

                  <input
                    type="checkbox"
                    name="allowOwnerDataExport"
                    defaultChecked={business.allowOwnerDataExport}
                    className="h-5 w-5 accent-violet-600"
                  />
                </label>

                <button
                  type="submit"
                  className="rounded-xl bg-violet-600 px-5 py-3 font-black text-white transition hover:bg-violet-700"
                >
                  حفظ صلاحية التصدير
                </button>
              </form>
            </div>
          </section>
        ) : (
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">تصدير البيانات</p>

            <p className="mt-2 font-black text-slate-950">
              {business.allowOwnerDataExport
                ? "مسموح بواسطة مدير النظام"
                : "غير مسموح بواسطة مدير النظام"}
            </p>
          </section>
        )}

        <BusinessSettingsForm
          business={{
            name: business.name,
            slug: business.slug,
            logoUrl: business.logoUrl,
            coverImageUrl: business.coverImageUrl,
            primaryColor: business.primaryColor,
            secondaryColor: business.secondaryColor,
            currency: business.currency,
            timezone: business.timezone,
        
            industry: business.industry, 
            website: business.website,
            email: business.email,
            country: business.country, 
            city: business.city,
            taxNumber: business.taxNumber,
            employeeCount: business.employeeCount,

            description: business.description,
            instagramUrl: business.instagramUrl,
            facebookUrl: business.facebookUrl,
            tiktokUrl: business.tiktokUrl,

            themePreset: business.themePreset,
            cardStyle: business.cardStyle,
            fontFamily: business.fontFamily,
            qrStyle: business.qrStyle,
            qrPosition: business.qrPosition,

            loyaltyProgramName: business.loyaltyProgramName,
            pointsName: business.pointsName,
            membershipName: business.membershipName,
            welcomeMessage: business.welcomeMessage,
            cardDefaultLanguage: business.cardDefaultLanguage,
            staffAttributionEnabled: business.staffAttributionEnabled,
            staffAttributionRequired: business.staffAttributionRequired,
            loyaltyMode: business.loyaltyMode,
            unitName: business.unitName,
            rewardName: business.rewardName,
            rewardType: business.rewardType,
            rewardCode: business.rewardCode,
            rewardDescription: business.rewardDescription,
            rewardThreshold: business.rewardThreshold,
            earnAmount: business.earnAmount,
            whatsappWelcomeMessage:
              business.whatsappWelcomeMessage ??
              DEFAULT_WHATSAPP_TEMPLATES.welcome,
            whatsappBalanceMessage:
              business.whatsappBalanceMessage ??
              DEFAULT_WHATSAPP_TEMPLATES.balance,
            whatsappRewardMessage:
              business.whatsappRewardMessage ??
              DEFAULT_WHATSAPP_TEMPLATES.reward,
          }}
          saved={query.saved === "1"}
          error={query.error === "invalid"}
          action={updateSettings}
        />
      </div>
    </main>
  );
}
