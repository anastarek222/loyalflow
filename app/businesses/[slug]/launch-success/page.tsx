import { auth } from "@/auth";
import { PrimaryBusinessJoinQr } from "@/components/primary-business-join-qr";
import { normalizeLanguage } from "@/lib/i18n";
import { canAccessBusiness, canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { CheckCircle2 } from "lucide-react";
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
        nextTitle: "أول خطوة تشغيلية",
        nextDescription:
          "افتح صفحة الانضمام من القسم التالي وسجّل أول عميل تجريبي. بعد التأكد أن الرحلة صحيحة، انتقل إلى لوحة النشاط.",
        dashboard: "الانتقال إلى لوحة النشاط",
      }
    : {
        eyebrow: "Programme launched",
        title: "Your loyalty programme is ready",
        description:
          "Start here: use the Join QR or Join Link to add your first customer or test the joining journey yourself.",
        nextTitle: "Your first operational step",
        nextDescription:
          "Open the join page below and register your first test customer. Once the journey looks right, continue to the business dashboard.",
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
      select: { id: true, name: true, slug: true },
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
