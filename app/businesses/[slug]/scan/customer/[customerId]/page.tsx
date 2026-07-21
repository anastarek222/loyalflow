import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  addLoyaltyAction,
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
          <button
            type="submit"
            className="w-full rounded-xl bg-slate-950 px-5 py-4 font-black text-white"
          >
            {customer.business.loyaltyMode === "SALES_AMOUNT"
              ? "تسجيل عملية بيع"
              : customer.business.loyaltyMode === "VISITS"
                ? "+ إضافة زيارة"
                : `+ إضافة ${customer.business.earnAmount} نقطة`}
          </button>
        </form>


        <Link
          href={`/businesses/${slug}/customers/${customer.id}`}
          className="mt-4 block rounded-xl border border-slate-300 px-5 py-4 text-center font-bold text-slate-800"
        >
          فتح ملف العميل الكامل
        </Link>

      </section>
    </main>
  );
}