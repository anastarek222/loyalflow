import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { translate, type MessageKey } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { getPublicMarketingNavigation } from "@/lib/marketing/public-navigation";
import { getMarketingRequestLocale } from "@/lib/marketing/request-locale";
import type { Metadata } from "next";
import Link from "next/link";

const pageCopy = {
  en: {
    metaTitle: "Tanee | Meta data deletion instructions",
    metaDescription:
      "How business users can request deletion of Meta-linked WhatsApp connection data stored by Tanee.",
    eyebrow: "Data deletion",
    title: "Request deletion of Meta-linked Tanee data.",
    introduction:
      "This page explains how a Tanee business user can request deletion of data associated with the Meta and WhatsApp connection for their workspace.",
    sections: [
      {
        title: "Who this applies to",
        body:
          "These instructions are for authorised Tanee business users who connected a WhatsApp Business account to Tanee through Meta. They do not replace Meta's own privacy or account controls.",
      },
      {
        title: "How to request deletion",
        body:
          "Open the Tanee Contact page and identify the request as \"Meta data deletion\". Include the Tanee business or workspace name and the account email needed to verify your authority. Do not send passwords, access tokens, recovery codes, or other secrets.",
      },
      {
        title: "What Tanee can remove",
        body:
          "After verifying the requester's authority for the workspace, Tanee will remove or disable Meta-linked connection data that Tanee controls and no longer needs to provide the service, including stored WhatsApp connection credentials and identifiers where applicable. Limited security or audit records may be retained where required to protect the service or satisfy applicable obligations.",
      },
      {
        title: "Data controlled by Meta",
        body:
          "Deleting data from Tanee does not automatically delete information that Meta or WhatsApp controls independently. Use Meta's own privacy, account, and support tools for data held directly by Meta.",
      },
      {
        title: "Confirmation",
        body:
          "Tanee support will confirm the outcome of the request after verification and processing, or explain any limited records that must be retained.",
      },
    ],
    cta: "Open Tanee Contact",
  },
  ar: {
    metaTitle: "Tanee | تعليمات حذف البيانات المرتبطة بـ Meta",
    metaDescription:
      "طريقة طلب حذف بيانات ربط WhatsApp المرتبطة بـ Meta والمحفوظة داخل Tanee.",
    eyebrow: "حذف البيانات",
    title: "اطلب حذف بيانات Tanee المرتبطة بـ Meta.",
    introduction:
      "الصفحة دي بتوضح إزاي مستخدم مخوّل داخل نشاط على Tanee يطلب حذف البيانات المرتبطة بربط Meta وWhatsApp الخاص بالنشاط.",
    sections: [
      {
        title: "مين يقدر يستخدم التعليمات دي",
        body:
          "التعليمات دي مخصصة لمستخدمي Tanee المخوّلين اللي ربطوا حساب WhatsApp Business بالنشاط من خلال Meta. وهي لا تستبدل أدوات الخصوصية وإدارة الحساب الخاصة بـ Meta.",
      },
      {
        title: "إزاي تطلب الحذف",
        body:
          "افتح صفحة Contact في Tanee ووضّح إن الطلب هو \"Meta data deletion\". اذكر اسم النشاط أو الـworkspace على Tanee وإيميل الحساب المطلوب للتحقق من صلاحيتك. ما تبعتش Password أو Access Token أو Recovery Code أو أي بيانات سرية.",
      },
      {
        title: "إيه اللي Tanee يقدر يحذفه",
        body:
          "بعد التحقق من صلاحية صاحب الطلب على الـworkspace، Tanee هيحذف أو يعطّل بيانات الربط مع Meta اللي تحت تحكم Tanee ومبقاش محتاجها لتقديم الخدمة، بما في ذلك بيانات اعتماد وربط WhatsApp والمعرّفات المرتبطة بها عند انطباق ذلك. قد يتم الاحتفاظ بقدر محدود من سجلات الأمان أو التدقيق عند الحاجة لحماية الخدمة أو للالتزام بمتطلبات واجبة التطبيق.",
      },
      {
        title: "البيانات اللي Meta بتتحكم فيها",
        body:
          "حذف البيانات من Tanee لا يعني تلقائيًا حذف البيانات اللي Meta أو WhatsApp بيتحكموا فيها بشكل مستقل. استخدم أدوات الخصوصية والحساب والدعم التابعة لـ Meta للبيانات الموجودة عند Meta نفسها.",
      },
      {
        title: "تأكيد تنفيذ الطلب",
        body:
          "فريق دعم Tanee هيأكد نتيجة الطلب بعد التحقق والتنفيذ، أو يوضح لو فيه سجلات محدودة لازم يتم الاحتفاظ بيها.",
      },
    ],
    cta: "افتح صفحة التواصل مع Tanee",
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingRequestLocale();
  const content = pageCopy[locale];

  return {
    title: content.metaTitle,
    description: content.metaDescription,
    alternates: { canonical: "/data-deletion" },
    robots: { index: false, follow: false },
  };
}

export default async function DataDeletionPage() {
  const locale = await getMarketingRequestLocale();
  const direction = getLocaleDirection(locale);
  const content = pageCopy[locale];
  const copy = (key: MessageKey) => translate(locale, key);

  return (
    <main
      lang={locale}
      dir={direction}
      className="min-h-screen overflow-x-clip bg-[var(--lf-marketing-canvas)] text-foreground [overflow-wrap:anywhere]"
    >
      <MarketingHeader
        locale={locale}
        brand={copy("common.brand")}
        signIn={copy("auth.signIn")}
        primaryCta={copy("marketing.primaryCta")}
        menuLabel={copy("marketing.menuOpen")}
        closeLabel={copy("marketing.menuClose")}
        navigation={getPublicMarketingNavigation(locale)}
      />

      <section className="border-b border-border bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto w-full max-w-4xl">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-primary">
            {content.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            {content.title}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-foreground-muted sm:text-lg">
            {content.introduction}
          </p>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto w-full max-w-4xl divide-y divide-border rounded-[var(--lf-radius-card)] border border-border bg-white px-5 sm:px-8">
          {content.sections.map((section) => (
            <article key={section.title} className="py-7 sm:py-8">
              <h2 className="text-xl font-black">{section.title}</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-8 text-foreground-muted sm:text-base">
                {section.body}
              </p>
            </article>
          ))}
        </div>

        <div className="mx-auto mt-8 w-full max-w-4xl">
          <Link
            href="/contact"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover"
          >
            {content.cta}
          </Link>
        </div>
      </section>

      <MarketingFooter locale={locale} />
    </main>
  );
}
