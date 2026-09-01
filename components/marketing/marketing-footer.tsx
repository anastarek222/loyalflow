import { TaneeLogo } from "@/components/marketing/tanee-logo";
import type { SupportedLocale } from "@/lib/i18n/config";
import Link from "next/link";

export function MarketingFooter({ locale }: { locale: SupportedLocale }) {
  const isArabic = locale === "ar";

  return (
    <footer className="border-t border-[#E6DED6] bg-white px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/" className="inline-flex items-center">
            <TaneeLogo locale={locale} className="h-8" />
          </Link>
          <p className="mt-4 max-w-md text-sm leading-7 text-[#6F6862]">
            {isArabic
              ? "تاني تساعد الأعمال المحلية على منح عملائها سببًا واضحًا للعودة، وتبسّط إدارة الولاء يوميًا."
              : "Tanee helps local businesses give customers a clear reason to come back—and makes loyalty simple to run."}
          </p>
          <p className="mt-3 text-sm font-bold text-[#FF6652]">
            {isArabic ? "للزيارة الجاية." : "Built for the next visit."}
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-[#6F6862]">
          <Link href="/features" className="hover:text-[#FF6652]">{isArabic ? "المميزات" : "Features"}</Link>
          <Link href="/pricing" className="hover:text-[#FF6652]">{isArabic ? "الأسعار" : "Pricing"}</Link>
          <Link href="/about" className="hover:text-[#FF6652]">{isArabic ? "عن تاني" : "About"}</Link>
          <Link href="/faq" className="hover:text-[#FF6652]">{isArabic ? "الأسئلة الشائعة" : "FAQ"}</Link>
          <Link href="/contact" className="hover:text-[#FF6652]">{isArabic ? "تواصل معنا" : "Contact"}</Link>
          <Link href="/privacy" className="hover:text-[#FF6652]">{isArabic ? "الخصوصية" : "Privacy"}</Link>
          <Link href="/terms" className="hover:text-[#FF6652]">{isArabic ? "الشروط" : "Terms"}</Link>
        </nav>
      </div>
    </footer>
  );
}
