import { auth } from "@/auth";
import { Avatar, Badge, Card } from "@/components/ui/surface";
import { ListPageTemplate, PageHeader } from "@/components/page-layout";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import { getGlobalDashboardMode } from "@/lib/dashboard/overview";
import { canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { ArrowUpRight, Building2, ScanLine } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

function roleLabel(role: string, language: "AR" | "EN") {
  const labels = {
    AR: { OWNER: "مالك", MANAGER: "مدير", STAFF: "موظف", VIEWER: "مشاهد", SUPER_ADMIN: "مدير النظام" },
    EN: { OWNER: "Owner", MANAGER: "Manager", STAFF: "Staff", VIEWER: "Viewer", SUPER_ADMIN: "Super admin" },
  } as const;
  return labels[language][role as keyof typeof labels.EN] ?? role;
}

function copy(language: "AR" | "EN") {
  return language === "AR"
    ? {
        eyebrow: "مساحة العمل", title: "مرحبًا", description: "اختر النشاط الذي تريد العمل عليه أو تابع من حيث توقفت.",
        businesses: "الأنشطة المتاحة", oneBusiness: "نشاطك", noBusiness: "لا توجد مساحة عمل متاحة", noBusinessDescription: "اطلب من مدير النظام إضافتك إلى نشاط حتى تتمكن من البدء.",
        open: "فتح النشاط", scan: "مسح عميل", active: "نشط", inactive: "غير نشط", directory: "إدارة الأنشطة التجارية",
      }
    : {
        eyebrow: "Workspace", title: "Welcome", description: "Choose the business you need, or continue where you left off.",
        businesses: "Available businesses", oneBusiness: "Your business", noBusiness: "No workspace is available", noBusinessDescription: "Ask an administrator to assign you to a business before getting started.",
        open: "Open business", scan: "Scan customer", active: "Active", inactive: "Inactive", directory: "Manage businesses",
      };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, firstName: true, lastName: true, role: true, businessId: true, language: true },
  });
  if (!user) redirect("/login");

  const language = normalizeLanguage(user.language);
  const dictionary = copy(language);
  const businesses = user.role === "SUPER_ADMIN"
    ? await prisma.business.findMany({
        select: { id: true, name: true, slug: true, logoUrl: true, industry: true, city: true, country: true, isActive: true },
        orderBy: { name: "asc" },
      })
    : user.businessId
      ? await prisma.business.findMany({
          where: { id: user.businessId },
          select: { id: true, name: true, slug: true, logoUrl: true, industry: true, city: true, country: true, isActive: true },
        })
      : [];

  const mode = getGlobalDashboardMode(businesses.length);
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || (language === "AR" ? "بك" : "there");
  const formatter = new Intl.NumberFormat(getLanguageLocale(language));
  const primaryBusiness = businesses[0];
  const canScan = Boolean(primaryBusiness && primaryBusiness.isActive && canPerform(user, primaryBusiness.id, "LOYALTY_EARN"));

  return (
    <ListPageTemplate
      container="wide"
      header={<PageHeader
        eyebrow={dictionary.eyebrow}
        title={`${dictionary.title}, ${name}`}
        description={dictionary.description}
        metadata={<><span>{roleLabel(user.role, language)}</span><span className="lf-type-numeric">{formatter.format(businesses.length)} {dictionary.businesses}</span></>}
      />}
    >

      {mode === "empty" ? (
        <Card className="max-w-2xl" role="status">
          <Building2 className="text-slate-500" aria-hidden="true" size={24} />
          <h2 className="mt-4 lf-type-section text-slate-950">{dictionary.noBusiness}</h2>
          <p className="mt-2 lf-type-body text-slate-600">{dictionary.noBusinessDescription}</p>
        </Card>
      ) : (
        <section aria-labelledby="workspace-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="workspace-heading" className="lf-type-section text-slate-950">{mode === "single" ? dictionary.oneBusiness : dictionary.businesses}</h2>
            {user.role === "SUPER_ADMIN" ? <Link href="/businesses" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline">{dictionary.directory}<ArrowUpRight size={16} aria-hidden="true" /></Link> : null}
          </div>
          <div className={mode === "single" ? "max-w-3xl" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"}>
            {businesses.map((business) => {
              const context = [business.industry, [business.city, business.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
              const isPrimary = mode === "single" && business.id === primaryBusiness?.id;
              return (
                <Card key={business.id} className={isPrimary ? "border-primary/30 bg-indigo-50/40" : ""}>
                  <div className="flex items-start gap-3">
                    <Avatar name={business.name} src={business.logoUrl} className="size-11" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><h3 dir="auto" className="truncate font-semibold text-slate-950">{business.name}</h3><Badge variant={business.isActive ? "success" : "neutral"}>{business.isActive ? dictionary.active : dictionary.inactive}</Badge></div>
                      <p dir="auto" className="mt-1 min-h-5 text-sm text-slate-600">{context || roleLabel(user.role, language)}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link href={`/businesses/${business.slug}`} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-primary bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">{dictionary.open}<ArrowUpRight size={16} aria-hidden="true" /></Link>
                    {isPrimary && canScan ? <Link href={`/businesses/${business.slug}/scan`} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-slate-800 hover:bg-surface-subtle"><ScanLine size={16} aria-hidden="true" />{dictionary.scan}</Link> : null}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </ListPageTemplate>
  );
}
