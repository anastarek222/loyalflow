import { auth } from "@/auth";
import { canAccessBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ScanActionButton from "@/components/scan-action-button";
import {
  addLoyaltyAction,
  redeemRewardAction,
} from "@/app/businesses/[slug]/customers/[customerId]/actions";

type PageProps = {
  params: Promise<{
    slug: string;
    customerId: string;
  }>;
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function ScanCustomerPage({
  params,
  searchParams,
}: PageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { slug, customerId } = await params;
  const query = await searchParams;

  const business =
    await prisma.business.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

  if (!business) {
    notFound();
  }

  if (!canAccessBusiness(session.user, business.id)) {
    redirect("/dashboard");
  }

  const successMessage =
    query.success === "earned"
      ? "✅ تم تسجيل العملية بنجاح"
      : query.success === "redeemed"
        ? "🎁 تم استبدال المكافأة بنجاح"
        : null;

  const errorMessage =
    query.error
      ? "حدث خطأ، حاول مرة أخرى"
      : null;

  const customer =
    await prisma.customer.findFirst({
      where: {
        id: customerId,
        businessId: business.id,
      },

      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        balance: true,

        transactions: {
          take: 5,
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            type: true,
            amount: true,
            note: true,
            createdAt: true,
            createdBy: {
              select: {
                email: true,
              },
            },
          },
        },

        rewardUnlocks: {
          where: {
            redeemedAt: null,
          },
          include: {
            reward: {
              select: {
                id: true,
                name: true,
                type: true,
                code: true,
              },
            },
          },
        },

        business: {
          select: {
            name: true,
            slug: true,
            loyaltyMode: true,
            earnAmount: true,
            unitName: true,
          },
        },
      },
    });

  if (!customer) {
    notFound();
  }

  const earnAction =
    addLoyaltyAction.bind(
      null,
      slug,
      customer.id
    );

  const fullName = [
    customer.firstName,
    customer.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const dateFormatter =
    new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "short",
      timeStyle: "short",
    });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <section className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow">

        {successMessage ? (
          <div className="mb-5 rounded-2xl bg-emerald-100 p-4 text-center font-black text-emerald-800">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-5 rounded-2xl bg-red-100 p-4 text-center font-black text-red-800">
            {errorMessage}
          </div>
        ) : null}

        <h1 className="text-2xl font-black text-slate-950">
          {fullName}
        </h1>

        <p className="mt-2 text-slate-500">
          {customer.phone}
        </p>


        <div className="mt-5 rounded-2xl bg-violet-50 p-4">
          <p className="text-sm font-bold text-violet-700">
            الرصيد الحالي
          </p>

          <p className="mt-1 text-3xl font-black text-slate-950">
            {customer.balance} {customer.business.unitName}
          </p>
        </div>


        {customer.transactions.length > 0 ? (
          <div className="mt-6">
            <h2 className="mb-3 font-black text-slate-950">
              آخر النشاطات
            </h2>

            <div className="space-y-3">
              {customer.transactions.map((transaction) => {
                const transactionStyle =
                  transaction.type === "REDEEM"
                    ? {
                        icon: "🎁",
                        title: "استبدال مكافأة",
                        color: "bg-violet-50",
                      }
                    : transaction.type === "ADJUSTMENT"
                      ? {
                          icon: "⚙️",
                          title: "تعديل يدوي",
                          color: "bg-orange-50",
                        }
                      : {
                          icon: "⭐",
                          title: "كسب ولاء",
                          color: "bg-emerald-50",
                        };

                return (
                  <div
                    key={transaction.id}
                    className={`rounded-2xl p-4 ${transactionStyle.color}`}
                  >
                    <p className="font-black text-slate-900">
                      {transactionStyle.icon} {transactionStyle.title}
                    </p>

                    <p className="mt-1 text-sm text-slate-700">
                      {transaction.note ?? "عملية ولاء"}
                    </p>

                    <p className="mt-1 font-black text-slate-900">
                      {transaction.amount} {customer.business.unitName}
                    </p>

                    {transaction.createdBy?.email ? (
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        بواسطة: {transaction.createdBy.email}
                      </p>
                    ) : null}

                    <p className="mt-1 text-xs text-slate-400">
                      {dateFormatter.format(transaction.createdAt)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}


        <form
          action={earnAction}
          className="mt-6"
        >

          {customer.business.loyaltyMode === "SALES_AMOUNT" ? (
            <input
              name="saleAmount"
              type="number"
              placeholder="قيمة البيع"
              className="mb-3 w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          ) : null}


          <input
            type="hidden"
            name="operationId"
            value={crypto.randomUUID()}
          />


          <ScanActionButton>
            {customer.business.loyaltyMode === "SALES_AMOUNT"
              ? "تسجيل عملية بيع"
              : customer.business.loyaltyMode === "VISITS"
                ? "+ إضافة زيارة"
                : `+ إضافة ${customer.business.earnAmount} نقطة`}
          </ScanActionButton>

        </form>


      {customer.rewardUnlocks.length > 0 ? (
  <div className="mt-6">

    <h2 className="mb-3 font-black text-slate-950">
      🎁 المكافآت المتاحة
    </h2>

    <div className="space-y-3">

      {customer.rewardUnlocks.map((unlock) => {
        const redeemAction =
          redeemRewardAction.bind(
            null,
            slug,
            customer.id,
            unlock.reward.id
          );

        return (
          <div
            key={unlock.id}
            className="rounded-2xl bg-emerald-50 p-4"
          >
            <p className="font-black text-emerald-900">
              {unlock.reward.name}
            </p>

            {unlock.reward.code ? (
              <p className="mt-1 text-sm text-emerald-700">
                الكود: {unlock.reward.code}
              </p>
            ) : null}

            <form
              action={redeemAction}
              className="mt-3"
            >
              <ScanActionButton>
                استبدال المكافأة
              </ScanActionButton>
            </form>

          </div>
        );
      })}

    </div>

  </div>
) : null}
        


        <div className="mt-6 grid gap-3">
          <Link
            href={`/businesses/${slug}/scan`}
            className="block rounded-xl bg-violet-600 px-5 py-4 text-center font-black text-white transition hover:bg-violet-700"
          >
            📷 مسح عميل جديد
          </Link>

          <Link
            href={`/businesses/${slug}/customers/${customer.id}`}
            className="block rounded-xl border border-slate-300 px-5 py-4 text-center font-bold text-slate-800 transition hover:bg-slate-50"
          >
            فتح ملف العميل الكامل
          </Link>
        </div>


      </section>
    </main>
  );
}