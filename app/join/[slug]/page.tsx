import type { Metadata } from "next";
import JoinSubmitButton from "@/components/join-submit-button";
import { BusinessLogoImage } from "@/components/business-logo-image";
import { joinBusinessAction } from "@/app/join/[slug]/actions";
import { normalizeReferralCode } from "@/lib/referrals/code";
import { canApplyPublicReferral } from "@/lib/customers/public-membership-policy";
import prisma from "@/lib/prisma";
import { getCustomerExperienceTheme } from "@/lib/theme";
import { getLanguageAttributes } from "@/lib/i18n";
import { formatLoyaltyAmount } from "@/lib/loyalty/presentation";
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
      id: true,
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
      loyaltyMode: true,
      unitName: true,
      currency: true,
      rewardName: true,
      rewardThreshold: true,
      cardDefaultLanguage: true,
      isActive: true,
      plan: true,
    },
  });

  if (!business?.isActive) {
    notFound();
  }

  const theme = getCustomerExperienceTheme(business);
  const headerForegroundColor = business.coverImageUrl
    ? "#FFFFFF"
    : theme.primaryForegroundColor;

  const joinBusiness = joinBusinessAction.bind(null, business.slug);
  const referralCandidate = canApplyPublicReferral(business.plan)
    ? normalizeReferralCode(query.ref)
    : null;
  const validReferral = referralCandidate
    ? await prisma.customerReferralCode.findFirst({
        where: {
          businessId: business.id,
          code: referralCandidate,
          isActive: true,
          customer: { isActive: true },
        },
        select: { id: true },
      })
    : null;
  const appliedReferralCode = validReferral ? referralCandidate : null;
  const { language, lang, dir } = getLanguageAttributes(
    business.cardDefaultLanguage,
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
          whatsappConsent:
            "أوافق على استلام تحديثات برنامج الولاء والمكافآت تلقائيًا عبر واتساب. يمكن إيقافها لاحقًا.",
          referralApplied: "تم تطبيق كود الإحالة على تسجيلك.",
          createCard: "إنشاء الكارت الرقمي",
          creatingCard: "جاري إنشاء الكارت...",
          privacy:
            "بإكمال التسجيل، ستنشئ حساب عميل وكارت ولاء رقمي لهذا النشاط فقط.",
          errors: {
            invalid: "راجع الاسم ورقم الهاتف ثم حاول مرة أخرى.",
            duplicate: "رقم الهاتف مسجل بالفعل لدى هذا النشاط.",
            "rate-limit": "تم تجاوز عدد المحاولات. حاول مرة أخرى بعد قليل.",
            "plan-limit": "وصل النشاط إلى الحد الحالي لعدد العملاء.",
            unavailable: "التسجيل غير متاح حاليًا.",
            failed: "تعذر إكمال التسجيل الآن. حاول مرة أخرى لاحقًا.",
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
          whatsappConsent:
            "I agree to receive automatic loyalty and reward updates on WhatsApp. I can opt out later.",
          referralApplied: "A referral code has been applied to your registration.",
          createCard: "Create digital card",
          creatingCard: "Creating your card...",
          privacy:
            "By registering, you create a customer profile and digital loyalty card for this business only.",
          errors: {
            invalid: "Check your name and phone number, then try again.",
            duplicate: "This phone number is already registered with this business.",
            "rate-limit": "Too many attempts. Please try again shortly.",
            "plan-limit": "This business has reached its current customer limit.",
            unavailable: "Registration is unavailable right now.",
            failed: "We could not complete registration right now. Please try again later.",
          },
        };
  const programName =
    business.loyaltyProgramName?.trim() || copy.programFallback;
  const message = business.welcomeMessage?.trim() || copy.messageFallback;
  const rewardTarget = formatLoyaltyAmount({
    loyaltyMode: business.loyaltyMode,
    language,
    unitName: business.unitName,
    currency: business.currency,
    amount: business.rewardThreshold,
  });

  return (
    <main
      lang={lang}
      dir={dir}
      className="flex min-h-screen items-start justify-center px-0 py-0 sm:items-center sm:px-6 sm:py-10"
      style={{
        backgroundColor: theme.backgroundColor,
        fontFamily: theme.fontFamily,
      }}
    >
      <section
        className={`w-full max-w-lg overflow-hidden border-x-0 border-y bg-white shadow-sm sm:border ${theme.cardClass} ${theme.borderClass}`}
      >
        <div
          className="relative overflow-hidden px-4 py-4 sm:px-7 sm:py-7"
          style={{ color: headerForegroundColor }}
        >
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
              <BusinessLogoImage
                src={business.logoUrl}
                alt={business.name}
                className="mb-3 size-10 rounded-[var(--lf-radius-input)] bg-white/95 sm:mb-4 sm:size-12"
              />
            ) : null}

            <p className="text-sm font-semibold opacity-80">{programName}</p>

            <h1 className="mt-1 text-xl font-black sm:text-3xl">
              {copy.join} {business.name}
            </h1>

            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold opacity-[0.85] sm:mt-3">
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

            <p className="mt-2 text-sm leading-6 opacity-90 sm:mt-3 sm:text-base sm:leading-7">
              {message}
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-7">
          {query.error && copy.errors[query.error as keyof typeof copy.errors] ? (
            <p
              className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 sm:mb-6"
              role="alert"
            >
              {copy.errors[query.error as keyof typeof copy.errors]}
            </p>
          ) : null}

          <div
            dir="auto"
            className="mb-4 rounded-[var(--lf-radius-input)] px-4 py-3 text-sm leading-6 [hyphens:none] [overflow-wrap:normal] [word-break:normal] sm:mb-5"
            style={{
              backgroundColor: `${theme.secondaryColor}CC`,
              color: theme.secondaryForegroundColor,
            }}
          >
            {copy.reward} {rewardTarget} {copy.rewardSuffix} {business.rewardName}.
          </div>

          {appliedReferralCode ? (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {copy.referralApplied}
            </div>
          ) : null}

          <form action={joinBusiness} className="space-y-3 sm:space-y-4">
            {appliedReferralCode ? (
              <input type="hidden" name="ref" value={appliedReferralCode} />
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
                className="min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-3 outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/15"
              />
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                {copy.lastName}{" "}
                <span className="font-normal text-slate-500">{copy.optional}</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                maxLength={50}
                autoComplete="family-name"
                dir="auto"
                placeholder={language === "AR" ? "أحمد" : "Smith"}
                className="min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-3 outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/15"
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
                className="min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-3 outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/15"
              />
              <p
                id="phone-hint"
                className="mt-2 text-xs leading-5 text-slate-500"
              >
                {copy.phoneHint}
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-4 py-3 text-sm leading-6 text-foreground-muted">
              <input
                name="whatsappOptIn"
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-[var(--lf-primary)]"
              />
              <span>{copy.whatsappConsent}</span>
            </label>

            <JoinSubmitButton
              label={copy.createCard}
              pendingLabel={copy.creatingCard}
              primaryColor={theme.primaryColor}
              foregroundColor={theme.primaryForegroundColor}
            />
          </form>

          <p className="mt-5 text-center text-xs leading-5 text-foreground-subtle">
            {copy.privacy}
          </p>
        </div>
      </section>
    </main>
  );
}
