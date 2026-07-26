import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ListPageTemplate, PageHeader } from "@/components/page-layout";
import { normalizeLanguage, getLanguageLocale } from "@/lib/i18n";
import prisma from "@/lib/prisma";
import { Building2, Search, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function BusinessOwnersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const language = normalizeLanguage(user?.language);
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 120) ?? "";
  const status = params.status === "active" || params.status === "inactive" ? params.status : "all";

  const owners = await prisma.user.findMany({
    where: {
      role: "OWNER",
      ...(status === "all" ? {} : { isActive: status === "active" }),
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { business: { name: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      business: {
        include: {
          _count: { select: { customers: true, users: true, branches: true } },
        },
      },
    },
  });

  const number = new Intl.NumberFormat(getLanguageLocale(language));
  const date = new Intl.DateTimeFormat(getLanguageLocale(language), { dateStyle: "medium" });
  const copy = language === "AR"
    ? {
        eyebrow: "إدارة المنصة",
        title: "ملاك الأنشطة",
        description: "راجع ملاك الأنشطة وحالة حساباتهم وأعمالهم من مكان واحد.",
        search: "ابحث بالاسم أو البريد أو النشاط",
        all: "كل الحالات",
        active: "نشط",
        inactive: "موقوف",
        owner: "المالك",
        business: "النشاط",
        customers: "العملاء",
        team: "الفريق",
        branches: "الفروع",
        created: "تاريخ الإنشاء",
        open: "فتح النشاط",
        none: "لا توجد نتائج مطابقة.",
      }
    : {
        eyebrow: "Platform administration",
        title: "Business owners",
        description: "Review business owners, account status, and their businesses from one place.",
        search: "Search owner, email, or business",
        all: "All statuses",
        active: "Active",
        inactive: "Inactive",
        owner: "Owner",
        business: "Business",
        customers: "Customers",
        team: "Team",
        branches: "Branches",
        created: "Created",
        open: "Open business",
        none: "No matching owners found.",
      };

  return (
    <ListPageTemplate
      container="wide"
      header={<PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />}
    >
      <Card>
        <form className="flex flex-col gap-3 sm:flex-row" action="/business-owners">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-foreground-subtle" size={18} aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder={copy.search}
              aria-label={copy.search}
              className="min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface ps-10 pe-4 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <select
            name="status"
            defaultValue={status}
            aria-label={copy.all}
            className="min-h-11 rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">{copy.all}</option>
            <option value="active">{copy.active}</option>
            <option value="inactive">{copy.inactive}</option>
          </select>
          <button className="min-h-11 rounded-[var(--lf-radius-input)] bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover" type="submit">
            {language === "AR" ? "تطبيق" : "Apply"}
          </button>
        </form>
      </Card>

      <section aria-label={copy.title} className="mt-5 space-y-3">
        {owners.length === 0 ? (
          <Card><p className="text-sm text-foreground-muted">{copy.none}</p></Card>
        ) : owners.map((owner) => {
          const ownerName = [owner.firstName, owner.lastName].filter(Boolean).join(" ");
          const business = owner.business;
          return (
            <Card key={owner.id} className="p-0 overflow-hidden">
              <div className="grid gap-4 p-5 lg:grid-cols-[minmax(14rem,1.3fr)_minmax(12rem,1fr)_repeat(3,minmax(6rem,.55fr))_minmax(7rem,.6fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-sm font-bold text-primary">{owner.firstName.slice(0, 1).toUpperCase()}</span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{ownerName}</p>
                      <p dir="ltr" className="truncate text-xs text-foreground-subtle">{owner.email}</p>
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  {business ? <>
                    <p className="truncate text-sm font-semibold text-foreground">{business.name}</p>
                    <Badge className="mt-1" variant={business.isActive && owner.isActive ? "success" : "neutral"}>{business.isActive && owner.isActive ? copy.active : copy.inactive}</Badge>
                  </> : <span className="text-sm text-foreground-subtle">—</span>}
                </div>
                <Metric icon={<Users size={15} />} label={copy.customers} value={business?._count.customers ?? 0} number={number} />
                <Metric icon={<Users size={15} />} label={copy.team} value={business?._count.users ?? 0} number={number} />
                <Metric icon={<Building2 size={15} />} label={copy.branches} value={business?._count.branches ?? 0} number={number} />
                <div>
                  <p className="text-xs font-medium text-foreground-subtle">{copy.created}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{date.format(owner.createdAt)}</p>
                </div>
                {business ? <Link href={`/businesses/${business.slug}`} className="inline-flex min-h-10 items-center justify-center rounded-[var(--lf-radius-input)] border border-border px-4 text-sm font-semibold text-foreground hover:border-primary hover:text-primary">{copy.open}</Link> : null}
              </div>
            </Card>
          );
        })}
      </section>
    </ListPageTemplate>
  );
}

function Metric({ icon, label, value, number }: { icon: React.ReactNode; label: string; value: number; number: Intl.NumberFormat }) {
  return <div><p className="flex items-center gap-1.5 text-xs font-medium text-foreground-subtle">{icon}{label}</p><p dir="ltr" className="mt-1 lf-type-numeric text-base font-bold text-foreground">{number.format(value)}</p></div>;
}
