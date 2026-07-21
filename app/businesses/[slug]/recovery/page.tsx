import { auth } from "@/auth";
import { getRequestBaseUrl } from "@/lib/app-url";
import {
  getWinBackAudienceWhere,
  getWinBackMessage,
  type WinBackAudience,
  winBackAudiences,
} from "@/lib/campaigns/winback";
import { getCustomerSegmentLabel } from "@/lib/customers/segments";
import { canExportBusinessData, canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { buildWhatsAppUrl } from "@/lib/whatsapp-templates";
import CopyLinkButton from "@/components/copy-link-button";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";

type RecoveryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ audience?: string }>;
};

const audienceOptions: Array<{ value: WinBackAudience; label: string }> = [
  { value: "INACTIVE", label: "غير نشطون" },
  { value: "AT_RISK", label: "معرّضون للتوقف" },
];

export default async function RecoveryPage({
  params,
  searchParams,
}: RecoveryPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const query = await searchParams;
  const business = await prisma.business.findUnique({
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
    },
  });
  if (!business) notFound();
  if (!canManageBusiness(session.user, business.id)) redirect(`/businesses/${slug}`);

  const audience = winBackAudiences.includes(query.audience as WinBackAudience)
    ? (query.audience as WinBackAudience)
    : "INACTIVE";
  const now = new Date();
  const customerWhere: Prisma.CustomerWhereInput = {
    businessId: business.id,
    ...getWinBackAudienceWhere(audience, {
      rewardThreshold: business.rewardThreshold,
      earnAmount: business.earnAmount,
      now,
    }),
  };
  const customers = await prisma.customer.findMany({
    where: customerWhere,
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      balance: true,
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
    business.allowOwnerDataExport
  );

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href={`/businesses/${business.slug}`} className="text-sm font-bold text-violet-700">
          ← الرجوع إلى {business.name}
        </Link>
        <header className="mt-5 rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
          <p className="text-sm font-bold text-white/70">استعادة العملاء</p>
          <h1 className="mt-2 text-3xl font-black">جمهور العودة</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">
            رسائل مراجَعة يدويًا لعملاء محددين بالتصنيف الحالي. لا يرسل النظام أي رسالة تلقائيًا ولا يستخدم SMS أو واجهة WhatsApp مدفوعة.
          </p>
        </header>

        <div className="mt-6 flex flex-wrap gap-3">
          {audienceOptions.map((option) => (
            <Link
              key={option.value}
              href={`/businesses/${business.slug}/recovery?audience=${option.value}`}
              className={`rounded-xl px-5 py-3 font-black ${audience === option.value ? "bg-violet-600 text-white" : "bg-white text-slate-700 shadow-sm"}`}
            >
              {option.label}
            </Link>
          ))}
          {canExport ? (
            <a href={`/businesses/${business.slug}/recovery/export?audience=${audience}`} className="rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-3 font-black text-emerald-800">
              تصدير الجمهور CSV
            </a>
          ) : null}
        </div>

        <p className="mt-5 text-sm text-slate-600">
          {getCustomerSegmentLabel(audience)}: {customers.length} عميل{customers.length === 100 ? " (يعرض أول 100)" : ""}.
        </p>

        <section className="mt-4 space-y-4">
          {customers.length === 0 ? (
            <p className="rounded-3xl bg-white p-6 text-slate-500 shadow-sm">لا يوجد عملاء في هذا الجمهور حاليًا.</p>
          ) : customers.map((customer) => {
            const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
            const cardLink = `${baseUrl}/card/${customer.publicToken}`;
            const remaining = Math.max(0, business.rewardThreshold - customer.balance);
            const message = getWinBackMessage({
              customer: name,
              business: business.name,
              balance: customer.balance,
              unit: business.unitName,
              reward: business.rewardName,
              cardLink,
              remaining,
              loyaltyMode: business.loyaltyMode,
              template: business.whatsappBalanceMessage,
            });
            return (
              <article key={customer.id} className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div>
                    <h2 className="font-black text-slate-950">{name}</h2>
                    <p dir="ltr" className="mt-1 text-sm text-slate-500">{customer.phone}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      الرصيد: {customer.balance} {business.unitName}
                      {customer.transactions[0] ? ` · آخر نشاط: ${customer.transactions[0].createdAt.toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo" })}` : " · لا توجد عمليات"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <CopyLinkButton value={message} label="نسخ الرسالة" />
                    <a href={buildWhatsAppUrl(customer.phone, message)} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-600 px-5 py-3 font-black text-white hover:bg-emerald-700">
                      فتح WhatsApp
                    </a>
                  </div>
                </div>
                <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{message}</pre>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
