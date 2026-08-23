import type { Prisma } from "@/generated/prisma/client";
import {
  Activity,
  ArchiveRestore,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Users,
} from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import CopyLinkButton from "@/components/copy-link-button";
import { GrowthShell } from "@/components/growth/growth-shell";
import { getRequestBaseUrl } from "@/lib/app-url";
import {
  getWinBackAudienceWhere,
  getWinBackMessage,
  type WinBackAudience,
  winBackAudiences,
} from "@/lib/campaigns/winback";
import { getCustomerSegmentLabel } from "@/lib/customers/segments";
import { hasFeatureEntitlement } from "@/lib/entitlements";
import {
  getExperienceModeCookieName,
  resolveExperienceMode,
} from "@/lib/experience-mode";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import { canExportBusinessData, canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getRewardAvailability } from "@/lib/rewards/availability";
import { buildWhatsAppUrl } from "@/lib/whatsapp-templates";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ audience?: string }>;
};

export default async function RecoveryPage({ params, searchParams }: Props) {
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
        loyaltyMode: true,
        unitName: true,
        rewardName: true,
        rewardThreshold: true,
        earnAmount: true,
        allowOwnerDataExport: true,
        whatsappBalanceMessage: true,
        plan: true,
        rewards: {
          where: { isActive: true },
          select: { id: true, name: true, cost: true, isActive: true },
        },
      },
    }),
  ]);

  if (!business) notFound();
  if (!canManageBusiness(session.user, business.id)) {
    redirect(`/businesses/${slug}`);
  }
  if (!hasFeatureEntitlement(business.plan, "CAMPAIGNS")) {
    redirect(`/businesses/${slug}?error=plan-feature`);
  }

  const language = normalizeLanguage(user?.language);
  const mode = resolveExperienceMode(
    (await cookies()).get(getExperienceModeCookieName(session.user.id))?.value,
    user?.role ?? session.user.role,
    user?.experienceAccess,
  );
  const audience: WinBackAudience = winBackAudiences.includes(
    query.audience as WinBackAudience,
  )
    ? (query.audience as WinBackAudience)
    : "INACTIVE";
  const now = new Date();
  const where: Prisma.CustomerWhereInput = {
    businessId: business.id,
    ...getWinBackAudienceWhere(audience, {
      rewardThreshold: business.rewardThreshold,
      earnAmount: business.earnAmount,
      now,
    }),
  };
  const customers = await prisma.customer.findMany({
    where,
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      balance: true,
      isActive: true,
      publicToken: true,
      transactions: {
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  const baseUrl = await getRequestBaseUrl();
  const canExport = canExportBusinessData(
    session.user,
    business.id,
    business.allowOwnerDataExport,
  );
  const options: WinBackAudience[] = ["INACTIVE", "AT_RISK"];
  const audienceLabel = (value: WinBackAudience) =>
    getCustomerSegmentLabel(value, language);
  const queueDescription =
    audience === "INACTIVE"
      ? language === "AR"
        ? "لا يوجد نشاط حديث وفق قواعد الشريحة."
        : "No recent activity under the segment rules."
      : language === "AR"
        ? "النشاط يتراجع وفق قواعد الشريحة."
        : "Activity is declining under the segment rules.";

  return (
    <GrowthShell
      slug={business.slug}
      businessName={business.name}
      area="recovery"
      language={language}
      experienceMode={mode}
      title={language === "AR" ? "استعادة العملاء" : "Customer recovery"}
      description={
        language === "AR"
          ? "راجع جمهور الاستعادة المحسوب بالقواعد نفسها المستخدمة في التقسيم، ثم تعامل مع كل مسودة يدويًا."
          : "Review a recovery audience calculated by the same segmentation rules, then handle every draft manually."
      }
    >
      <section
        data-recovery-workspace="true"
        className="overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-surface shadow-sm"
      >
        <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
          <div className="relative overflow-hidden p-5 sm:p-6">
            <div className="pointer-events-none absolute end-0 top-0 size-52 rounded-full bg-[radial-gradient(circle,var(--lf-primary-soft),transparent_68%)]" />
            <div className="relative max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                <ArchiveRestore className="size-4" aria-hidden="true" />
                {language === "AR" ? "قائمة الاستعادة" : "Recovery queue"}
              </span>
              <h2 className="mt-4 text-xl font-black tracking-tight text-foreground sm:text-2xl">
                {language === "AR"
                  ? "أعد فتح العلاقة في الوقت المناسب"
                  : "Reopen the relationship at the right time"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-foreground-muted">
                {language === "AR"
                  ? "رتّب العملاء الذين يحتاجون متابعة، راجع رصيد كل عميل ومسودته، ثم افتح WhatsApp عندما تكون مستعدًا."
                  : "Prioritize customers who need follow-up, review each balance and draft, then open WhatsApp when you are ready."}
              </p>
            </div>
          </div>
          <div className="border-t border-border bg-surface-subtle p-5 lg:border-s lg:border-t-0 lg:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-black text-foreground">
                  {language === "AR"
                    ? "تحكم يدوي كامل"
                    : "Fully manual control"}
                </p>
                <p className="mt-1 text-sm leading-6 text-foreground-muted">
                  {language === "AR"
                    ? "لا يتم حفظ حملة أو إرسال رسالة أو تسجيل نتيجة تسليم."
                    : "No campaign is saved, no message is sent, and no delivery result is recorded."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        data-recovery-audience-picker="true"
        aria-labelledby="recovery-audience-title"
        className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              {language === "AR" ? "الخطوة الأولى" : "Step one"}
            </p>
            <h2
              id="recovery-audience-title"
              className="mt-1 text-lg font-black text-foreground"
            >
              {language === "AR"
                ? "اختر جمهور الاستعادة"
                : "Choose a recovery audience"}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-foreground-muted">
              {language === "AR"
                ? "كل اختيار يستخدم قواعد التقسيم المركزية نفسها، وليس قائمة يدوية منفصلة."
                : "Each choice uses the same central segmentation rules, not a separate manual list."}
            </p>
          </div>
          {canExport ? (
            <a
              href={`/businesses/${business.slug}/recovery/export?audience=${audience}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--lf-radius-input)] border border-emerald-300 bg-emerald-50 px-4 text-sm font-bold text-emerald-900 transition-colors hover:bg-emerald-100"
            >
              <Download className="size-4" aria-hidden="true" />
              {language === "AR" ? "تصدير CSV" : "Export CSV"}
            </a>
          ) : null}
        </div>

        <div
          className="mt-5 grid gap-3 sm:grid-cols-2"
          aria-label={
            language === "AR"
              ? "تصفية جمهور الاستعادة"
              : "Recovery audience filter"
          }
        >
          {options.map((option) => {
            const selected = audience === option;
            const isInactive = option === "INACTIVE";
            return (
              <Link
                key={option}
                href={`/businesses/${business.slug}/recovery?audience=${option}`}
                aria-current={selected ? "page" : undefined}
                className={`flex min-h-20 items-center gap-3 rounded-[var(--lf-radius-input)] border p-4 transition-colors ${
                  selected
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-border bg-surface text-foreground hover:bg-surface-subtle"
                }`}
              >
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                    selected
                      ? "bg-white/15 text-white"
                      : "bg-primary-soft text-primary"
                  }`}
                >
                  {isInactive ? (
                    <CalendarClock className="size-5" aria-hidden="true" />
                  ) : (
                    <Activity className="size-5" aria-hidden="true" />
                  )}
                </span>
                <span>
                  <span className="block text-sm font-black">
                    {audienceLabel(option)}
                  </span>
                  <span
                    className={`mt-1 block text-xs ${selected ? "text-white/75" : "text-foreground-subtle"}`}
                  >
                    {isInactive
                      ? language === "AR"
                        ? "غاب نشاطهم لفترة"
                        : "No activity for a while"
                      : language === "AR"
                        ? "نشاطهم بدأ يتراجع"
                        : "Activity has started declining"}
                  </span>
                </span>
                {selected ? (
                  <CheckCircle2
                    className="ms-auto size-5 shrink-0"
                    aria-hidden="true"
                  />
                ) : null}
              </Link>
            );
          })}
        </div>
      </section>

      <section
        aria-label={
          language === "AR" ? "ملخص قائمة الاستعادة" : "Recovery queue summary"
        }
        className="grid gap-3 sm:grid-cols-3"
      >
        <SummaryItem
          icon={Users}
          label={
            language === "AR" ? "العملاء المعروضون" : "Displayed customers"
          }
          value={String(customers.length)}
        />
        <SummaryItem
          icon={Target}
          label={language === "AR" ? "الجمهور الحالي" : "Current audience"}
          value={audienceLabel(audience)}
        />
        <SummaryItem
          icon={MessageSquareText}
          label={language === "AR" ? "طريقة التواصل" : "Contact method"}
          value={language === "AR" ? "مسودة يدوية" : "Manual draft"}
        />
      </section>

      <section aria-labelledby="recovery-queue-title">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              {language === "AR" ? "الخطوة الثانية" : "Step two"}
            </p>
            <h2
              id="recovery-queue-title"
              className="mt-1 text-lg font-black text-foreground"
            >
              {language === "AR"
                ? "راجع قائمة العملاء"
                : "Review the customer queue"}
            </h2>
          </div>
          <p className="text-sm text-foreground-muted">
            {queueDescription}
            {customers.length === 100
              ? language === "AR"
                ? " يتم عرض أول 100 عميل."
                : " Showing the first 100 customers."
              : ""}
          </p>
        </div>

        {customers.length === 0 ? (
          <div className="rounded-[var(--lf-radius-card)] border border-dashed border-border bg-surface-subtle p-8 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
              <UserRound className="size-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-black text-foreground">
              {language === "AR"
                ? "لا يوجد عملاء في هذا الجمهور حاليًا"
                : "There are no customers in this audience right now"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-foreground-muted">
              {language === "AR"
                ? "جرّب الجمهور الآخر أو ارجع لاحقًا بعد تغير نشاط العملاء."
                : "Try the other audience or return later after customer activity changes."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {customers.map((customer) => {
              const name = [customer.firstName, customer.lastName]
                .filter(Boolean)
                .join(" ");
              const availability = getRewardAvailability({
                customerActive: customer.isActive,
                balance: customer.balance,
                rewardThreshold: business.rewardThreshold,
                fallbackReward: {
                  name: business.rewardName,
                  cost: business.rewardThreshold,
                },
                catalogueRewards: business.rewards,
              });
              const message = getWinBackMessage({
                customer: name,
                business: business.name,
                balance: customer.balance,
                unit: business.unitName,
                reward: availability.defaultReward.name,
                cardLink: `${baseUrl}/card/${customer.publicToken}`,
                remaining: availability.remaining,
                loyaltyMode: business.loyaltyMode,
                template: business.whatsappBalanceMessage,
              });
              const lastActivity = customer.transactions[0]?.createdAt;

              return (
                <article
                  key={customer.id}
                  className="flex flex-col rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-black text-primary">
                      {name.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-black text-foreground">
                        {name}
                      </h3>
                      <p
                        dir="ltr"
                        className="mt-1 text-start text-sm text-foreground-subtle"
                      >
                        {customer.phone}
                      </p>
                    </div>
                    <span className="ms-auto shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                      {audienceLabel(audience)}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <CustomerFact
                      label={language === "AR" ? "الرصيد" : "Balance"}
                      value={`${customer.balance} ${business.unitName}`}
                    />
                    <CustomerFact
                      label={language === "AR" ? "المتبقي" : "Remaining"}
                      value={`${availability.remaining} ${business.unitName}`}
                    />
                    <CustomerFact
                      label={language === "AR" ? "آخر نشاط" : "Last activity"}
                      value={
                        lastActivity
                          ? lastActivity.toLocaleDateString(
                              getLanguageLocale(language),
                              {
                                timeZone: "Africa/Cairo",
                              },
                            )
                          : language === "AR"
                            ? "لا يوجد"
                            : "None"
                      }
                    />
                  </div>

                  <details className="group mt-4 rounded-[var(--lf-radius-input)] bg-surface-subtle">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-foreground-muted">
                      <span className="inline-flex items-center gap-2">
                        <FileText
                          className="size-4 text-primary"
                          aria-hidden="true"
                        />
                        {language === "AR" ? "معاينة المسودة" : "Preview draft"}
                      </span>
                      <ChevronDown
                        className="size-4 transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <pre className="whitespace-pre-wrap border-t border-border p-4 font-sans text-sm leading-6 text-foreground-muted">
                      {message}
                    </pre>
                  </details>

                  <div className="mt-auto flex flex-col gap-2 pt-4 sm:flex-row">
                    <CopyLinkButton
                      value={message}
                      label={language === "AR" ? "نسخ المسودة" : "Copy draft"}
                      language={language}
                    />
                    <a
                      aria-label={
                        language === "AR"
                          ? `فتح مسودة WhatsApp لـ ${name}`
                          : `Open WhatsApp draft for ${name}`
                      }
                      href={buildWhatsAppUrl(customer.phone, message)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--lf-radius-input)] bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
                    >
                      <MessageSquareText
                        className="size-4"
                        aria-hidden="true"
                      />
                      {language === "AR"
                        ? "فتح مسودة WhatsApp"
                        : "Open WhatsApp draft"}
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex items-center gap-3 rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 py-3 text-sm text-foreground-muted">
        <Sparkles className="size-5 shrink-0 text-primary" aria-hidden="true" />
        {language === "AR"
          ? "القائمة تتغير تلقائيًا عندما يتغير نشاط العميل؛ لا يتم نقل العملاء أو وسمهم يدويًا."
          : "The queue updates automatically as activity changes; customers are not moved or tagged manually."}
      </div>
    </GrowthShell>
  );
}

function SummaryItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--lf-radius-input)] border border-border bg-surface p-4 shadow-sm">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground-subtle">{label}</p>
        <p className="mt-1 truncate text-sm font-black text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

function CustomerFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[var(--lf-radius-input)] bg-surface-subtle p-3">
      <p className="text-[11px] font-semibold text-foreground-subtle">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-foreground sm:text-sm">
        {value}
      </p>
    </div>
  );
}
