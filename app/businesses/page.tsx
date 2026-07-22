import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createBusinessAction } from "./actions";
import BusinessSetupWizard from "@/components/business-setup-wizard";

type BusinessesPageProps = {
  searchParams: Promise<{
    created?: string;
    error?: string;
  }>;
};

export default async function BusinessesPage({
  searchParams,
}: BusinessesPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;

  const businesses = await prisma.business.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          customers: true,
          users: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-violet-600 hover:text-violet-800"
            >
              ← Back to dashboard
            </Link>

            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Businesses
            </h1>

            <p className="mt-1 text-slate-500">
              Add and manage your agency clients.
            </p>
          </div>

          <div className="rounded-xl bg-slate-950 px-5 py-3 text-white">
            <span className="text-sm text-slate-400">Total businesses</span>
            <strong className="ml-3 text-xl">{businesses.length}</strong>
          </div>
        </header>

        {params.created === "1" && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            Business created successfully.
          </div>
        )}

        {params.error === "invalid" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            Please check the entered information.
          </div>
        )}

        {params.error === "slug-generation" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            We could not safely generate a unique business link. Please try again.
          </div>
        )}

        {params.error === "owner-email" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            An account with this owner email already exists.
          </div>
        )}


        <div className="grid gap-8 lg:grid-cols-[420px_1fr]">

          <section className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Add new business
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create an independent loyalty program for a client.
            </p>

            <BusinessSetupWizard
              action={createBusinessAction}
            />

          </section>

          <section>
            {businesses.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <h2 className="text-xl font-semibold text-slate-900">
                  No businesses yet
                </h2>

                <p className="mt-2 text-slate-500">
                  Use the form to add your first loyalty card client.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {businesses.map((business) => (
                  <Link
                    key={business.id}
                    href={`/businesses/${business.slug}`}
                    className="group block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-lg"
                  >
                    <div
                      className="h-3"
                      style={{
                        backgroundColor: business.primaryColor,
                      }}
                    />

                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-bold text-slate-950">
                            {business.name}
                          </h2>

                          <p className="mt-1 text-sm text-slate-500">
                            /{business.slug}
                          </p>
                        </div>

                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Active
                        </span>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-100 p-4">
                          <p className="text-xs text-slate-500">Customers</p>
                          <p className="mt-1 text-2xl font-bold">
                            {business._count.customers}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-100 p-4">
                          <p className="text-xs text-slate-500">Users</p>
                          <p className="mt-1 text-2xl font-bold">
                            {business._count.users}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
                        <p>
                          System:{" "}
                          <strong>{business.loyaltyMode}</strong>
                        </p>
                        <p className="mt-1">
                          Reward:{" "}
                          <strong>
                            {business.rewardName} after{" "}
                            {business.rewardThreshold} {business.unitName}
                          </strong>
                        </p>
                      </div>

                      <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition group-hover:bg-violet-700">
                        <span>Open business</span>
                        <span>→</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
