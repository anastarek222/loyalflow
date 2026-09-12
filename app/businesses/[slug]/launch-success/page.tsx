import { auth } from "@/auth";
import { PrimaryBusinessJoinQr } from "@/components/primary-business-join-qr";
import { normalizeLanguage } from "@/lib/i18n";
import { canAccessBusiness, canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getTrialState } from "@loyalflow/domain/billing/trial-core";
import { ArrowRight, CheckCircle2, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type OwnerLaunchSuccessPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sheetSync?: string | string[] }>;
};

function copy(language: "AR" | "EN") {
  return language === "AR"
    ? {
        eyebrow: "تم إطلاق البرنامج",
        title: "برنامج الولاء جاهز",
        description:
          "ابدأ من هنا: استخدم كود QR أو رابط الانضمام لإضافة أول عميل أو لتجربة رحلة الانضمام بنفسك.",
        trialTitle: "الفترة التجريبية بدأت عند الإطلاق",
        trialActive: (days: number) =>
          `لديك ${days} يومًا متبقيًا في الفترة التجريبية الحالية ذات 14 يومًا.`,
        trialExpired: "انتهت الفترة التجريبية الحالية.",
        nextTitle: "أول رحلة تشغيلية",
        nextDescription:
          "اختبر مسار الانضمام أولًا، ثم افتح قائمة العملاء للتأكد من إنشاء العضوية والوصول إلى ملف العميل وكارته قبل الانتقال للاستخدام اليومي.",
        firstCustomerTitle: "بعد تسجيل أول عميل",
        firstCustomerDescription:
          "افتح العملاء، ادخل إلى ملف العميل، وتأكد من أن العضوية والكارت والرصيد الابتدائي يظهرون بشكل صحيح.",
        customers: "فتح العملاء",
        dashboard: "الانتقال إلى لوحة النشاط",
      }
    : {
        eyebrow: "Programme launched",
        title: "Your loyalty programme is ready",
        description:
          "Start here: use the Join QR or Join Link to add your first customer or test the joining journey yourself.",
        trialTitle: "Your trial started at launch",
        trialActive: (days: number) =>
          `You have ${days} day${days === 1 ? "" : "s"} remaining in the current 14-day trial.`,
        trialExpired: "The current trial has ended.",
        nextTitle: "Your first operational journey",
        nextDescription:
          "Test the joining flow first, then open Customers to confirm the membership was created and the customer profile and card are available before moving into daily use.",
        firstCustomerTitle: "After your first customer joins",
        firstCustomerDescription:
          "Open Customers, enter the customer profile, and confirm the membership, card, and opening balance are correct.",
        customers: "Open customers",
        dashboard: "Continue to business dashboard",
      };
}

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OwnerLaunchSuccessPage({
  params,
  searchParams,
}: OwnerLaunchSuccessPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { slug } = await params;
  const [business, user] = await Promise.all([
    prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        trialEndsAt: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, businessId: true, language: true },
    }),
  ]);

  if (!business) notFound();
  if (!user || !canAccessBusiness(user, business.id)) redirect("/dashboard");
  if (!canManageBusiness(user, business.id))
    redirect(`/businesses/${business.slug}`);

  const language = normalizeLanguage(user.language);
  const dictionary = copy(language);
  const query = await searchParams;
  const sheetSyncPending = firstQueryValue(query.sheetSync) === "pending";
  const dashboardHref = sheetSyncPending
    ? `/businesses/${business.slug}?sheetSync=pending`
    : `/businesses/${business.slug}`;
  const customersHref = `/businesses/${business.slug}/customers`;
  const trialState = getTrialState({ trialEndsAt: business.trialEndsAt });

  return (
    <main
      className="min-h-full bg-surface-subtle px-4 py-8 sm:px-6 sm:py-12"
      data-owner-launch-success
    >
      <div className="mx-auto max-w-5xl">
        <section className="mb-6 rounded-[var(--lf-radius-card)] border border-primary/20 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="size-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                {dictionary.eyebrow}
              </p>
              <h1 className="mt-1 text-2xl font-black text-foreground sm:text-3xl">
                {dictionary.title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground-muted sm:text-base">
                {dictionary.description}
              </p>
            </div>
          </div>
        </section>

        {trialState.daysRemaining !== null ? (
          <section className="mb-6 rounded-[var(--lf-radius-card)] border border-border bg-white p-5 sm:p-6">
            <h2 className="text-base font-black text-foreground">
              {dictionary.trialTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-foreground-muted">
              {trialState.isTrialExpired
                ? dictionary.trialExpired
                : dictionary.trialActive(trialState.daysRemaining)}
            </p>
          </section>
        ) : null}

        <section className="mb-6 rounded-[var(--lf-radius-card)] border border-border bg-white p-5 sm:p-6">
          <h2 className="text-lg font-black text-foreground">
            {dictionary.nextTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            {dictionary.nextDescription}
          </p>
        </section>

        <PrimaryBusinessJoinQr
          businessName={business.name}
          slug={business.slug}
          language={language}
        />

        <section className="mb-6 rounded-[var(--lf-radius-card)] border border-border bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-foreground">
              <Users className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black text-foreground">
                {dictionary.firstCustomerTitle}
              </h2>
              <p className="mt-1 text-sm leading-6 text-foreground-muted">
                {dictionary.firstCustomerDescription}
              </p>
              <Link
                href={customersHref}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary-hover"
              >
                {dictionary.customers}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <Link
            href={dashboardHref}
            className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] border border-border bg-white px-4 text-sm font-bold text-foreground transition hover:border-primary/30 hover:text-primary"
          >
            {dictionary.dashboard}
          </Link>
        </div>
      </div>
    </main>
  );
}
