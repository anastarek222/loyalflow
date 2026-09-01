import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import type { MessageKey } from "@/lib/i18n/catalog";
import type { SupportedLocale } from "@/lib/i18n/config";
import { getLocaleDirection } from "@/lib/i18n/config";
import { getPublicMarketingNavigation } from "@/lib/marketing/public-navigation";

type LegalSection = Readonly<{
  title: MessageKey;
  body: MessageKey;
}>;

type LegalDocumentPageProps = Readonly<{
  locale: SupportedLocale;
  copy: (key: MessageKey) => string;
  eyebrow: MessageKey;
  title: MessageKey;
  introduction: MessageKey;
  sections: readonly LegalSection[];
  isPublished: boolean;
  entityName: string | null;
  country: string | null;
  contactEmail: string | null;
  effectiveDate: string | null;
}>;

export function LegalDocumentPage({
  locale,
  copy,
  eyebrow,
  title,
  introduction,
  sections,
  isPublished,
  entityName,
  country,
  contactEmail,
  effectiveDate,
}: LegalDocumentPageProps) {
  const direction = getLocaleDirection(locale);

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
            {copy(eyebrow)}
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            {copy(title)}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-foreground-muted sm:text-lg">
            {copy(introduction)}
          </p>

          {!isPublished ? (
            <div
              role="status"
              className="mt-8 rounded-[var(--lf-radius-input)] border border-amber-300 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-950"
            >
              <strong className="block font-black">
                {copy("marketing.legal.draftTitle")}
              </strong>
              {copy("marketing.legal.draftBody")}
            </div>
          ) : (
            <dl className="mt-8 grid gap-4 rounded-[var(--lf-radius-card)] border border-border bg-surface-subtle p-5 text-sm sm:grid-cols-2 sm:p-6">
              <div>
                <dt className="font-black">
                  {copy("marketing.legal.entityLabel")}
                </dt>
                <dd className="mt-1 text-foreground-muted">{entityName}</dd>
              </div>
              <div>
                <dt className="font-black">
                  {copy("marketing.legal.countryLabel")}
                </dt>
                <dd className="mt-1 text-foreground-muted">{country}</dd>
              </div>
              <div>
                <dt className="font-black">
                  {copy("marketing.legal.contactLabel")}
                </dt>
                <dd className="mt-1 text-foreground-muted">
                  <a
                    className="hover:text-primary hover:underline"
                    href={`mailto:${contactEmail}`}
                  >
                    {contactEmail}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-black">
                  {copy("marketing.legal.effectiveLabel")}
                </dt>
                <dd className="mt-1 text-foreground-muted">{effectiveDate}</dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto w-full max-w-4xl divide-y divide-border rounded-[var(--lf-radius-card)] border border-border bg-white px-5 sm:px-8">
          {sections.map((section) => (
            <article key={section.title} className="py-7 sm:py-8">
              <h2 className="text-xl font-black">{copy(section.title)}</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-8 text-foreground-muted sm:text-base">
                {copy(section.body)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <MarketingFooter locale={locale} />
    </main>
  );
}
