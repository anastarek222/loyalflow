import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
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
};

export default async function ScanCustomerPage({
  params,
}: PageProps) {
  const { slug, customerId } = await params;

  const customer =
    await prisma.customer.findFirst({
      where: {
        id: customerId,
        business: {
          slug,
        },
      },

      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        balance: true,

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

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <section className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow">

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
        


        <Link
          href={`/businesses/${slug}/customers/${customer.id}`}
          className="mt-6 block rounded-xl border border-slate-300 px-5 py-4 text-center font-bold text-slate-800"
        >
          فتح ملف العميل الكامل
        </Link>


      </section>
    </main>
  );
}