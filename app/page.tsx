import { auth } from "@/auth";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { ProductPreview } from "@/components/marketing/product-preview";
import { TaneeLogo } from "@/components/marketing/tanee-logo";
import { getLocaleDirection, type SupportedLocale } from "@/lib/i18n/config";
import { getPublicMarketingNavigation } from "@/lib/marketing/public-navigation";
import { getMarketingRequestLocale } from "@/lib/marketing/request-locale";
import type { Metadata } from "next";
import { Alexandria } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Gift,
  ScanLine,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";

const alexandria = Alexandria({
  subsets: ["latin", "arabic"],
  display: "swap",
});

const brand = {
  coral: "#FF6652",
  amber: "#FFB547",
  mint: "#78E3C5",
  charcoal: "#171717",
  canvas: "#FFF9F5",
};

const copy = {
  en: {
    title: "Built for the next visit.",
    arabicTagline: "للزيارة الجاية.",
    body:
      "Tanee helps local businesses give customers a clear reason to come back—and makes loyalty simple to run.",
    primary: "Get started",
    secondary: "See how Tanee works",
    proofEyebrow: "Merchant reality + product proof",
    proofTitle: "Make loyalty feel simple in the flow of the day.",
    proofBody:
      "Scan, reward, understand activity, and keep the merchant relationship front and center.",
    reasonOne: "Loyalty Cards",
    reasonOneBody: "Clear progress and rewards without payment-style confusion.",
    reasonTwo: "Rewards",
    reasonTwoBody: "Simple offers and rewards customers can understand.",
    reasonThree: "Customers",
    reasonThreeBody: "Useful activity and return context for the team.",
    reasonFour: "Scan",
    reasonFourBody: "Fast daily loyalty operation at the counter.",
    reasonFive: "Reports",
    reasonFiveBody: "See return activity without turning Tanee into a heavy CRM.",
    reasonSix: "Secure",
    reasonSixBody: "Role-aware access and clear operational boundaries.",
    storyEyebrow: "Built around return",
    storyTitle: "Not another points app. A simple return cycle.",
    storyBody:
      "Tanee combines merchant-branded loyalty, real customer activity, rewards, and practical visibility into one warm operating layer.",
    ctaTitle: "Give the next visit a reason to happen.",
    ctaBody: "Start with Tanee and keep loyalty simple for your team and customers.",
  },
  ar: {
    title: "للزيارة الجاية.",
    arabicTagline: "Built for the next visit.",
    body:
      "تاني تساعد الأعمال المحلية على منح عملائها سببًا واضحًا للعودة، وتبسّط إدارة الولاء يوميًا.",
    primary: "ابدأ مع تاني",
    secondary: "شوف تاني بتشتغل إزاي",
    proofEyebrow: "واقع التاجر + دليل المنتج",
    proofTitle: "خلي إدارة الولاء بسيطة وسط شغل اليوم.",
    proofBody:
      "امسح، كافئ، تابع النشاط، وخلي علاقة العميل بالتاجر هي الأساس.",
    reasonOne: "بطاقات الولاء",
    reasonOneBody: "تقدم ومكافآت واضحة من غير إحساس الدفع أو البطاقات البنكية.",
    reasonTwo: "المكافآت",
    reasonTwoBody: "عروض ومكافآت بسيطة يفهمها العميل بسرعة.",
    reasonThree: "العملاء",
    reasonThreeBody: "نشاط وسياق عودة مفيد للفريق.",
    reasonFour: "المسح",
    reasonFourBody: "تشغيل سريع للولاء في نقطة الخدمة.",
    reasonFive: "التقارير",
    reasonFiveBody: "رؤية نشاط العودة من غير ما تتحول تاني إلى CRM معقد.",
    reasonSix: "الأمان",
    reasonSixBody: "صلاحيات واضحة وحدود تشغيلية مفهومة.",
    storyEyebrow: "مبنية على العودة",
    storyTitle: "مش تطبيق نقاط وخلاص. دورة عودة بسيطة.",
    storyBody:
      "تاني تجمع الولاء بهوية التاجر، نشاط العملاء، المكافآت والرؤية العملية في تجربة واحدة دافئة وواضحة.",
    ctaTitle: "خلي الزيارة الجاية ليها سبب.",
    ctaBody: "ابدأ مع تاني وخلي الولاء بسيط لفريقك وعملائك.",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingRequestLocale();
  const c = copy[locale];

  return {
    title: locale === "ar" ? "تاني | للزيارة الجاية" : "Tanee | Built for the next visit",
    description: c.body,
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
  };
}

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const locale = await getMarketingRequestLocale();
  const direction = getLocaleDirection(locale);
  const navigation = getPublicMarketingNavigation(locale);
  const c = copy[locale];

  const features = [
    [WalletCards, c.reasonOne, c.reasonOneBody],
    [Gift, c.reasonTwo, c.reasonTwoBody],
    [Users, c.reasonThree, c.reasonThreeBody],
    [ScanLine, c.reasonFour, c.reasonFourBody],
    [BarChart3, c.reasonFive, c.reasonFiveBody],
    [ShieldCheck, c.reasonSix, c.reasonSixBody],
  ] as const;

  return (
    <main
      lang={locale}
      dir={direction}
      className={`${alexandria.className} min-h-screen bg-[#FFF9F5] text-[#171717]`}
    >
      <MarketingHeader
        locale={locale}
        brand="Tanee"
        signIn={locale === "ar" ? "تسجيل الدخول" : "Log in"}
        primaryCta={c.primary}
        menuLabel={locale === "ar" ? "فتح القائمة" : "Open navigation menu"}
        closeLabel={locale === "ar" ? "إغلاق القائمة" : "Close navigation menu"}
        navigation={navigation}
      />

      <section className="relative overflow-hidden border-b border-[#E6DED6]">
        <div className="absolute inset-0 -z-20 bg-[#FFF9F5]" />
        <div className="absolute -start-28 top-28 -z-10 h-72 w-72 rounded-full bg-[#FF6652]/10 blur-3xl" />
        <div className="absolute -end-20 top-10 -z-10 h-80 w-80 rounded-full bg-[#78E3C5]/16 blur-3xl" />

        <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-[1440px] items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:px-12 lg:py-20">
          <div>
            <div className="mb-7 flex items-center gap-4">
              <TaneeLogo locale={locale} className="h-12 w-auto sm:h-14" />
              <span className="hidden h-8 w-px bg-[#E6DED6] sm:block" />
              <p className="hidden text-sm font-semibold text-[#6F6862] sm:block">
                {locale === "ar"
                  ? "ولاء واحتفاظ بالعملاء للأعمال المحلية"
                  : "Customer loyalty & retention for local businesses"}
              </p>
            </div>

            <p className="inline-flex min-h-10 items-center rounded-full border border-[#E6DED6] bg-white px-4 text-sm font-bold text-[#A84724] shadow-sm">
              {locale === "ar" ? "ولاء أبسط للأعمال المحلية" : "Loyalty made simple for local businesses"}
            </p>

            <h1 className="mt-6 max-w-3xl text-[clamp(3rem,7vw,5.8rem)] font-extrabold leading-[0.98] tracking-[-0.05em] text-[#171717]">
              {c.title}
            </h1>
            <p className="mt-3 text-[clamp(1.4rem,3vw,2.2rem)] font-semibold leading-tight text-[#FF6652]">
              {c.arabicTagline}
            </p>
            <p className="mt-7 max-w-2xl text-base leading-8 text-[#3F3B38] sm:text-lg sm:leading-9">
              {c.body}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/get-started"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#FF6652] px-6 py-3 font-bold text-white shadow-[0_14px_30px_rgb(255_102_82/0.24)] transition hover:-translate-y-0.5 hover:bg-[#f45d4b]"
              >
                {c.primary}
              </Link>
              <Link
                href="/features"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#CFC3B8] bg-white px-6 py-3 font-bold text-[#171717] transition hover:-translate-y-0.5 hover:border-[#FF6652]"
              >
                {c.secondary}
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 sm:max-w-xl">
              {[
                [brand.coral, locale === "ar" ? "عودة" : "Return"],
                [brand.amber, locale === "ar" ? "مكافأة" : "Reward"],
                [brand.mint, locale === "ar" ? "بساطة" : "Simple"],
              ].map(([color, label]) => (
                <div key={label} className="rounded-2xl border border-[#E6DED6] bg-white p-3">
                  <span className="block h-2 rounded-full" style={{ backgroundColor: color }} />
                  <p className="mt-3 text-sm font-bold">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div
              className="absolute -start-7 top-16 z-10 hidden h-24 w-40 rounded-[999px_999px_999px_40px] border-[14px] border-[#FF6652] border-e-transparent bg-transparent lg:block"
              aria-hidden="true"
            />
            <div className="relative overflow-hidden rounded-[2rem] border border-[#E6DED6] bg-white shadow-[0_32px_80px_rgb(23_23_23/0.12)]">
              <Image
                src="/brand/tanee-merchant-photo.jpg"
                alt={
                  locale === "ar"
                    ? "تاجر يستخدم تجربة الولاء مع عميل"
                    : "Local merchant using a loyalty experience with a customer"
                }
                width={900}
                height={720}
                priority
                className="h-[31rem] w-full object-cover object-center sm:h-[36rem]"
              />
              <div className="absolute inset-x-4 bottom-4 sm:inset-x-6 sm:bottom-6">
                <ProductPreview locale={locale} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#E6DED6] bg-white">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-[#E6DED6] px-5 sm:grid-cols-3 lg:grid-cols-6 lg:px-12">
          {features.map(([Icon, title]) => (
            <div key={title} className="flex min-h-28 items-center gap-3 px-4 py-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E6DED6] bg-[#FFF9F5] text-[#171717]">
                <Icon size={21} aria-hidden="true" />
              </span>
              <span className="text-sm font-bold leading-5">{title}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="product" className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#FF6652]">
                {c.proofEyebrow}
              </p>
              <h2 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">
                {c.proofTitle}
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-[#6F6862] lg:justify-self-end sm:text-lg">
              {c.proofBody}
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map(([Icon, title, body], index) => (
              <article
                key={title}
                className="group relative overflow-hidden rounded-3xl border border-[#E6DED6] bg-white p-6 shadow-[0_14px_36px_rgb(23_23_23/0.05)]"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ backgroundColor: [brand.coral, brand.amber, brand.mint][index % 3] }}
                />
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF9F5] text-[#171717]">
                  <Icon size={23} aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-xl font-extrabold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#6F6862]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#E6DED6] bg-[#171717] px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#FFB547]">
              {c.storyEyebrow}
            </p>
            <h2 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">
              {c.storyTitle}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/75 sm:text-lg">
              {c.storyBody}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [brand.coral, locale === "ar" ? "العودة أولًا" : "Return First"],
              [brand.mint, locale === "ar" ? "سهلة في الشغل" : "Easy in the Flow"],
              [brand.amber, locale === "ar" ? "دليل قبل المبالغة" : "Proof Over Hype"],
            ].map(([color, label]) => (
              <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                <span className="block h-3 w-14 rounded-full" style={{ backgroundColor: color }} />
                <p className="mt-5 text-base font-bold">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[1440px] rounded-[2rem] border border-[#E6DED6] bg-white p-7 shadow-[0_28px_70px_rgb(23_23_23/0.08)] sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#FF6652]">Tanee</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              {c.ctaTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[#6F6862]">{c.ctaBody}</p>
          </div>
          <div className="mt-6 flex shrink-0 flex-col gap-3 sm:flex-row lg:mt-0">
            <Link
              href="/get-started"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#FF6652] px-6 py-3 font-bold text-white"
            >
              {c.primary}
            </Link>
            <Link
              href="/features"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#CFC3B8] bg-white px-6 py-3 font-bold text-[#171717]"
            >
              {c.secondary}
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} />
    </main>
  );
}
