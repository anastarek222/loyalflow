import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Gift,
  PauseCircle,
  Plus,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { GrowthShell } from "@/components/growth/growth-shell";
import {
  customerSegments,
  getCustomerSegmentLabel,
} from "@/lib/customers/segments";
import {
  getExperienceModeCookieName,
  resolveExperienceMode,
} from "@/lib/experience-mode";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import { isOfferCurrentlyValid } from "@/lib/offers/eligibility";
import { canAccessBusiness, canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";

import {
  createOfferAction,
  toggleOfferStatusAction,
  updateOfferAction,
} from "./actions";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

type Language = "AR" | "EN";

type OfferFormValue = {
  name: string;
  description: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  eligibility: string;
  segment: string | null;
};

function formatDate(value: Date | null, language: Language) {
  return value
    ? new Intl.DateTimeFormat(getLanguageLocale(language), {
        dateStyle: "medium",
        timeZone: "Africa/Cairo",
      }).format(value)
    : language === "AR"
      ? "بدون حد"
      : "Open-ended";
}

function getEligibilityLabel(
  value: string,
  segment: string | null,
  language: Language,
) {
  if (value === "VIP") return language === "AR" ? "عملاء VIP" : "VIP customers";
  if (value === "SEGMENT") {
    return language === "AR" ? `شريحة: ${segment}` : `Segment: ${segment}`;
  }
  return language === "AR" ? "كل العملاء النشطين" : "All active customers";
}

export default async function OffersPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const query = await searchParams;
  const [user, business] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true, role: true, experienceAccess: true },
    }),
    prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        offers: { orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }] },
      },
    }),
  ]);

  if (!business) notFound();
  if (!canAccessBusiness(session.user, business.id)) redirect("/dashboard");

  const manage = canManageBusiness(session.user, business.id);
  const language = normalizeLanguage(user?.language);
  const mode = resolveExperienceMode(
    (await cookies()).get(getExperienceModeCookieName(session.user.id))?.value,
    user?.role ?? session.user.role,
    user?.experienceAccess,
  );
  const simple = mode === "SIMPLE";
  const now = new Date();
  const activeNow = business.offers.filter((offer) =>
    isOfferCurrentlyValid(offer, now),
  ).length;
  const upcoming = business.offers.filter(
    (offer) => offer.isActive && offer.validFrom && offer.validFrom > now,
  ).length;
  const expired = business.offers.filter(
    (offer) => offer.validUntil && offer.validUntil < now,
  ).length;
  const inactive = business.offers.filter((offer) => !offer.isActive).length;

  return (
    <GrowthShell
      slug={business.slug}
      businessName={business.name}
      area="offers"
      language={language}
      experienceMode={mode}
      title={language === "AR" ? "العروض" : "Offers"}
      description={
        language === "AR"
          ? "أنشئ حوافز موجهة تظهر للعملاء المؤهلين من دون تغيير الأرصدة أو قواعد الولاء."
          : "Create targeted incentives for eligible customers without changing balances or loyalty rules."
      }
    >
      {query.success ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-[var(--lf-radius-input)] border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"
        >
          <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
          {language === "AR" ? "تم حفظ العرض." : "Offer saved."}
        </p>
      ) : null}
      {query.error ? (
        <p
          role="alert"
          className="rounded-[var(--lf-radius-input)] border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900"
        >
          {query.error === "subscription-restricted"
              ? language === "AR"
              ? "لا تسمح حالة الاشتراك الحالية بإنشاء عرض أو تغيير بياناته أو حالته. تظل العروض والبيانات الحالية متاحة للقراءة."
              : "The current subscription state does not allow creating or changing an offer. Existing offers and data remain readable."
            : language === "AR"
              ? "تعذر حفظ العرض. راجع الجمهور والتواريخ."
              : "We could not save the offer. Review audience and dates."}
        </p>
      ) : null}

      <section
        data-offers-workspace="true"
        className="relative overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6"
      >
        <div className="pointer-events-none absolute end-0 top-0 size-48 rounded-full bg-[radial-gradient(circle,var(--lf-primary-soft),transparent_68%)] opacity-80" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
              <Sparkles className="size-4" aria-hidden="true" />
              {language === "AR" ? "مركز العروض" : "Offer studio"}
            </span>
            <h2 className="mt-4 text-xl font-black tracking-tight text-foreground sm:text-2xl">
              {language === "AR"
                ? "العرض المناسب، للجمهور المناسب"
                : "The right offer for the right audience"}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-foreground-muted">
              {language === "AR"
                ? "حدد الجمهور وفترة الظهور، ثم راجع الحالة من مكان واحد. العرض يظل حافزًا بصريًا ولا ينفذ أي حركة مالية."
                : "Set the audience and visibility window, then review status in one place. Offers remain visual incentives and never create financial movements."}
            </p>
          </div>
          <div className="inline-flex items-center gap-3 rounded-[var(--lf-radius-input)] border border-border bg-surface/90 px-4 py-3">
            <Eye className="size-5 text-primary" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-foreground-subtle">
                {language === "AR" ? "ظاهرة الآن" : "Visible now"}
              </p>
              <p className="lf-type-numeric text-lg font-black text-foreground">
                {activeNow}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label={language === "AR" ? "ملخص العروض" : "Offer summary"}
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <Metric
          icon={CheckCircle2}
          label={language === "AR" ? "نشطة الآن" : "Active now"}
          value={activeNow}
          tone="success"
        />
        <Metric
          icon={Clock3}
          label={language === "AR" ? "قادمة" : "Upcoming"}
          value={upcoming}
          tone="primary"
        />
        <Metric
          icon={CalendarDays}
          label={language === "AR" ? "منتهية" : "Expired"}
          value={expired}
          tone="neutral"
        />
        <Metric
          icon={PauseCircle}
          label={language === "AR" ? "غير نشطة" : "Inactive"}
          value={inactive}
          tone="neutral"
        />
      </section>

      {manage && !simple ? (
        <details className="group rounded-[var(--lf-radius-card)] border border-border bg-surface shadow-sm">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <span className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Plus className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-black text-foreground">
                  {language === "AR" ? "إنشاء عرض جديد" : "Create a new offer"}
                </span>
                <span className="mt-0.5 block text-xs text-foreground-subtle">
                  {language === "AR"
                    ? "حدد المحتوى والجمهور وفترة الظهور."
                    : "Define the content, audience, and visibility window."}
                </span>
              </span>
            </span>
            <span
              className="text-lg font-bold text-primary transition-transform group-open:rotate-45"
              aria-hidden="true"
            >
              +
            </span>
          </summary>
          <div className="border-t border-border p-5 sm:p-6">
            <OfferForm
              action={createOfferAction.bind(null, business.slug)}
              language={language}
            />
          </div>
        </details>
      ) : null}

      <section aria-labelledby="offer-catalog-title">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              {language === "AR" ? "الكتالوج" : "Catalog"}
            </p>
            <h2
              id="offer-catalog-title"
              className="mt-1 text-lg font-black text-foreground"
            >
              {language === "AR" ? "كل العروض" : "All offers"}
            </h2>
          </div>
          <span className="lf-type-numeric rounded-full bg-surface-subtle px-3 py-1 text-sm font-bold text-foreground-muted">
            {business.offers.length}
          </span>
        </div>

        {business.offers.length === 0 ? (
          <Empty language={language} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {business.offers.map((offer) => {
              const current = isOfferCurrentlyValid(offer, now);
              const state = !offer.isActive
                ? language === "AR"
                  ? "غير نشط"
                  : "Inactive"
                : offer.validFrom && offer.validFrom > now
                  ? language === "AR"
                    ? "قادم"
                    : "Upcoming"
                  : offer.validUntil && offer.validUntil < now
                    ? language === "AR"
                      ? "منتهٍ"
                      : "Expired"
                    : language === "AR"
                      ? "نشط"
                      : "Active";

              return (
                <article
                  key={offer.id}
                  className="flex flex-col rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                      <Gift className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words font-black text-foreground">
                          {offer.name}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${current ? "bg-emerald-100 text-emerald-900" : "bg-surface-subtle text-foreground-muted"}`}
                        >
                          {state}
                        </span>
                      </div>
                      {offer.description ? (
                        <p className="mt-2 text-sm leading-6 text-foreground-muted">
                          {offer.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <InfoItem
                      icon={Users}
                      label={language === "AR" ? "الجمهور" : "Audience"}
                      value={getEligibilityLabel(
                        offer.eligibility,
                        offer.segment,
                        language,
                      )}
                    />
                    <InfoItem
                      icon={CalendarDays}
                      label={
                        language === "AR" ? "فترة الظهور" : "Visibility window"
                      }
                      value={`${formatDate(offer.validFrom, language)} — ${formatDate(offer.validUntil, language)}`}
                    />
                  </div>

                  <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-foreground-subtle">
                      <Target
                        className="size-4 text-primary"
                        aria-hidden="true"
                      />
                      {language === "AR"
                        ? "لا يؤثر على رصيد العميل"
                        : "Does not affect customer balances"}
                    </span>
                    {manage ? (
                      <form
                        action={toggleOfferStatusAction.bind(
                          null,
                          business.slug,
                          offer.id,
                          !offer.isActive,
                        )}
                      >
                        <button
                          type="submit"
                          className="min-h-10 rounded-[var(--lf-radius-input)] border border-border px-4 text-sm font-bold text-primary transition-colors hover:bg-primary-soft"
                        >
                          {offer.isActive
                            ? language === "AR"
                              ? "إيقاف"
                              : "Deactivate"
                            : language === "AR"
                              ? "تفعيل"
                              : "Activate"}
                        </button>
                      </form>
                    ) : (
                      <span className="text-sm font-semibold text-foreground-subtle">
                        {language === "AR" ? "عرض فقط" : "View only"}
                      </span>
                    )}
                  </div>

                  {manage && !simple ? (
                    <details className="group mt-4 rounded-[var(--lf-radius-input)] bg-surface-subtle">
                      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-primary">
                        {language === "AR"
                          ? "تعديل ومعاينة"
                          : "Edit and preview"}
                      </summary>
                      <div className="border-t border-border p-4">
                        <p className="text-sm leading-6 text-foreground-muted">
                          {current
                            ? language === "AR"
                              ? "سيظهر العرض فقط للعملاء المؤهلين."
                              : "The offer is visible only to eligible customers."
                            : language === "AR"
                              ? "العرض غير ظاهر للعملاء حاليًا."
                              : "This offer is not currently visible to customers."}
                        </p>
                        <div className="mt-4">
                          <OfferForm
                            action={updateOfferAction.bind(
                              null,
                              business.slug,
                              offer.id,
                            )}
                            language={language}
                            offer={offer}
                          />
                        </div>
                      </div>
                    </details>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </GrowthShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  tone: "success" | "primary" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "primary"
        ? "bg-primary-soft text-primary"
        : "bg-surface-subtle text-foreground-muted";
  return (
    <div className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-4 shadow-sm">
      <div className={`grid size-9 place-items-center rounded-xl ${toneClass}`}>
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <p className="mt-4 text-xs font-semibold text-foreground-subtle">
        {label}
      </p>
      <p className="lf-type-numeric mt-1 text-2xl font-black text-foreground">
        {value}
      </p>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--lf-radius-input)] bg-surface-subtle p-3">
      <p className="flex items-center gap-2 text-xs font-semibold text-foreground-subtle">
        <Icon className="size-4 text-primary" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function Empty({ language }: { language: Language }) {
  return (
    <section className="rounded-[var(--lf-radius-card)] border border-dashed border-border bg-surface-subtle p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Gift className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-black text-foreground">
        {language === "AR" ? "لا توجد عروض بعد" : "No offers yet"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-foreground-muted">
        {language === "AR"
          ? "أضف عرضًا عند الحاجة، من دون أي تأثير مالي."
          : "Add an offer when needed, without any financial effect."}
      </p>
    </section>
  );
}

function OfferForm({
  action,
  language,
  offer,
}: {
  action: (data: FormData) => void;
  language: Language;
  offer?: OfferFormValue;
}) {
  const label = (ar: string, en: string) => (language === "AR" ? ar : en);
  const fieldClass =
    "mt-2 min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft";
  return (
    <form action={action} className="grid gap-4" data-offer-form="true">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="text-sm font-bold text-foreground-muted">
          {label("اسم العرض", "Offer name")}
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            defaultValue={offer?.name}
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-bold text-foreground-muted">
          {label("الأهلية", "Eligibility")}
          <select
            name="eligibility"
            defaultValue={offer?.eligibility ?? "ALL"}
            className={fieldClass}
          >
            <option value="ALL">
              {label("كل العملاء النشطين", "All active customers")}
            </option>
            <option value="VIP">VIP</option>
            <option value="SEGMENT">{label("شريحة", "Segment")}</option>
          </select>
        </label>
      </div>
      <label className="text-sm font-bold text-foreground-muted">
        {label("الوصف", "Description")}
        <textarea
          name="description"
          rows={3}
          maxLength={500}
          defaultValue={offer?.description ?? ""}
          className={`${fieldClass} py-3`}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-bold text-foreground-muted">
          {label("يبدأ", "Starts")}
          <input
            name="validFrom"
            type="date"
            defaultValue={offer?.validFrom?.toISOString().slice(0, 10)}
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-bold text-foreground-muted">
          {label("ينتهي", "Ends")}
          <input
            name="validUntil"
            type="date"
            defaultValue={offer?.validUntil?.toISOString().slice(0, 10)}
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-bold text-foreground-muted sm:col-span-2 lg:col-span-1">
          {label("الشريحة (عند الاختيار)", "Segment (when selected)")}
          <select
            name="segment"
            defaultValue={offer?.segment ?? ""}
            className={fieldClass}
          >
            <option value="">—</option>
            {customerSegments.map((segment) => (
              <option key={segment} value={segment}>
                {getCustomerSegmentLabel(segment, language)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="submit"
        className="min-h-11 rounded-[var(--lf-radius-input)] bg-primary px-5 font-bold text-white transition-colors hover:bg-primary-hover sm:justify-self-start"
      >
        {label(
          offer ? "حفظ التعديلات" : "إضافة عرض",
          offer ? "Save changes" : "Add offer",
        )}
      </button>
    </form>
  );
}
