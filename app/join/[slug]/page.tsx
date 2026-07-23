import type { Metadata } from "next";
import JoinSubmitButton from "@/components/join-submit-button";
import { joinBusinessAction } from "@/app/join/[slug]/actions";
import { normalizeReferralCode } from "@/lib/referrals/code";
import prisma from "@/lib/prisma";
import { getBusinessTheme } from "@/lib/theme";
import { getLanguageAttributes } from "@/lib/i18n";
import { notFound } from "next/navigation";

type JoinBusinessPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; ref?: string }>;
};

export async function generateMetadata({
  params,
}: JoinBusinessPageProps): Promise<Metadata> {
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      name: true,
      cardDefaultLanguage: true,
      isActive: true,
    },
  });

  if (!business?.isActive) {
    return { title: "Registration unavailable" };
  }

  const isArabic = business.cardDefaultLanguage === "AR";

  return {
    title: isArabic
      ? `انضم إلى برنامج ${business.name}`
      : `Join ${business.name}`,
    description: isArabic
      ? `سجل في برنامج الولاء الخاص بـ ${business.name}.`
      : `Register for ${business.name}'s loyalty program.`,
  };
}

export default async function JoinBusinessPage({
  params,
  searchParams,
}: JoinBusinessPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      logoUrl: true,
      coverImageUrl: true,
      industry: true,
      city: true,
      country: true,
      welcomeMessage: true,
      primaryColor: true,
      secondaryColor: true,
      themePreset: true,
      cardStyle: true,
      fontFamily: true,
      loyaltyProgramName: true,
      unitName: true,
      rewardName: true,
      rewardThreshold: true,
      cardDefaultLanguage: true,
      isActive: true,
    },
  });

  if (!business?.isActive) {
    notFound();
  }

  const theme =
    getBusinessTheme(business);

  const joinBusiness = joinBusinessAction.bind(null, business.slug);
  const referralCode = normalizeReferralCode(query.ref);
  const { language, lang, dir } = getLanguageAttributes(
    business.cardDefaultLanguage
  );
  const copy =
    language === "AR"
      ? {
          programFallback: "برنامج الولاء",
          messageFallback: "سجل الآن واحصل على كارتك الرقمي مباشرة.",
          join: "انضم إلى",
          reward: "عند جمع",
          rewardSuffix: "تحصل على",
          firstName: "الاسم الأول",
          lastName: "اسم العائلة",
          optional: "(اختياري)",
          phone: "رقم الهاتف",
          phoneHint: "اكتب الرقم مع كود الدولة، مثال: +201000000000",
          referralApplied: "تم تطبيق كود الإحالة على تسجيلك.",
          createCard: "إنشاء الكارت الرقمي",
          creatingCard: "جاري إنشاء الكارت...",
          privacy:
            "بإكمال التسجيل، ستنشئ حساب عميل وكارت ولاء رقمي لهذا النشاط فقط.",
          errors: {
            invalid: "راجع الاسم ورقم الهاتف ثم حاول مرة أخرى.",
            duplicate: "رقم الهاتف مسجل بالفعل لدى هذا النشاط.",
            "rate-limit": "تم تجاوز عدد المحاولات. حاول مرة أخرى بعد قليل.",
            unavailable: "التسجيل غير متاح حاليًا.",
          },
        }
      : {
          programFallback: "Loyalty program",
          messageFallback: "Register now and receive your digital card instantly.",
          join: "Join",
          reward: "Collect",
          rewardSuffix: "to receive",
          firstName: "First name",
          lastName: "Last name",
          optional: "(optional)",
          phone: "Phone number",
          phoneHint: "Include the country code, for example: +201000000000",
          referralApplied: "A referral code has been applied to your registration.",
          createCard: "Create digital card",
          creatingCard: "Creating your card...",
          privacy:
            "By registering, you create a customer profile and digital loyalty card for this business only.",
          errors: {
            invalid: "Check your name and phone number, then try again.",
            duplicate: "This phone number is already registered with this business.",
            "rate-limit": "Too many attempts. Please try again shortly.",
            unavailable: "Registration is unavailable right now.",
          },
        };
  const programName =
    business.loyaltyProgramName?.trim() || copy.programFallback;
  const message =
    business.welcomeMessage?.trim() ||
    copy.messageFallback;

  return (
    <main
      lang={lang}
      dir={dir}
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{
        backgroundColor: theme.backgroundColor,
        fontFamily: theme.fontFamily,
      }}
    >
      <section
        className={`w-full max-w-lg overflow-hidden border bg-white ${theme.cardClass} ${theme.borderClass}`}
      >
        <div className="relative overflow-hidden px-6 py-8 text-white sm:px-8">
          {business.coverImageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={business.coverImageUrl}
                alt={`${business.name} cover`}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/55" />
            </>
          ) : (
            <div
              className="absolute inset-0"
              style={{ backgroundColor: theme.primaryColor }}
            />
          )}

          <div className="relative">
            {business.logoUrl ? (
              // The logo may be a data URL configured by the business owner.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logoUrl}
                alt={business.name}
                className="mb-5 h-14 w-14 rounded-2xl bg-white/95 object-contain p-1 shadow-lg"
              />
            ) : null}

            <p className="text-sm font-semibold text-white/80">
              {programName}
            </p>

            <h1 className="mt-1 text-3xl font-black">
              {copy.join} {business.name}
            </h1>

            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-white/85">
              {business.industry ? (
                <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">
                  {business.industry}
                </span>
              ) : null}

              {business.city || business.country ? (
                <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">
                  {[business.city, business.country]
                    .filter(Boolean)
                    .join(language === "AR" ? "، " : ", ")}
                </span>
              ) : null}
            </div>

            <p className="mt-3 leading-7 text-white/90">
              {message}
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {query.error && copy.errors[query.error as keyof typeof copy.errors] ? (
            <p
              className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
              role="alert"
            >
              {copy.errors[query.error as keyof typeof copy.errors]}
            </p>
          ) : null}

          <div
            className="mb-6 rounded-2xl px-4 py-3 text-sm leading-6"
            style={{
              backgroundColor: `${theme.secondaryColor}CC`,
              color: theme.primaryColor,
            }}
          >
            {copy.reward} {business.rewardThreshold} {business.unitName} {copy.rewardSuffix} {business.rewardName}.
          </div>

          {referralCode ? (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {copy.referralApplied}
            </div>
          ) : null}

          <form action={joinBusiness} className="space-y-5">
            {referralCode ? (
              <input type="hidden" name="ref" value={referralCode} />
            ) : null}
            <div>
              <label
                htmlFor="firstName"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                {copy.firstName}
              </label>
              <input
                id="firstName"
                name="firstName"
                required
                minLength={2}
                maxLength={50}
                autoComplete="given-name"
                dir="auto"
                placeholder={language === "AR" ? "محمد" : "Jane"}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                {copy.lastName} <span className="font-normal text-slate-500">{copy.optional}</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                maxLength={50}
                autoComplete="family-name"
                dir="auto"
                placeholder={language === "AR" ? "أحمد" : "Smith"}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                {copy.phone}
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                required
                minLength={8}
                maxLength={25}
                autoComplete="tel"
                dir="ltr"
                placeholder="+201000000000"
                aria-describedby="phone-hint"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              />
              <p
                id="phone-hint"
                className="mt-2 text-xs leading-5 text-slate-500"
              >
                {copy.phoneHint}
              </p>
            </div>

            <JoinSubmitButton
              label={copy.createCard}
              pendingLabel={copy.creatingCard}
              primaryColor={theme.primaryColor}
            />
          </form>

          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            {copy.privacy}
          </p>
        </div>
      </section>
    </main>
  );
}
