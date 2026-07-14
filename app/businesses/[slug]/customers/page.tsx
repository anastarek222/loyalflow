import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createCustomerAction } from "./actions";

const CUSTOMERS_PER_PAGE = 10;

type CustomersPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    created?: string;
    error?: string;
    q?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
};

export default async function CustomersPage({
  params,
  searchParams,
}: CustomersPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { slug } = await params;
  const query = await searchParams;

  const business = await prisma.business.findUnique({
    where: {
      slug,
    },
  });

  if (!business) {
    notFound();
  }

  const canAccess =
    session.user.role === "SUPER_ADMIN" ||
    session.user.businessId === business.id;

  if (!canAccess) {
    redirect("/dashboard");
  }

  const search = query.q?.trim() ?? "";

  const status =
    query.status === "active" || query.status === "inactive"
      ? query.status
      : "all";

  const allowedSorts = ["newest", "oldest", "balance_high", "balance_low"];

  const sort = allowedSorts.includes(query.sort ?? "") ? query.sort! : "newest";

  const parsedPage = Number.parseInt(query.page ?? "1", 10);

  const requestedPage =
    Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const customerWhere = {
    businessId: business.id,

    ...(status === "active"
      ? {
          isActive: true,
        }
      : status === "inactive"
        ? {
            isActive: false,
          }
        : {}),

    ...(search
      ? {
          OR: [
            {
              firstName: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              lastName: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              phone: {
                contains: search,
              },
            },
            {
              customerCode: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const [totalCustomers, filteredCustomers] = await Promise.all([
    prisma.customer.count({
      where: {
        businessId: business.id,
      },
    }),

    prisma.customer.count({
      where: customerWhere,
    }),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCustomers / CUSTOMERS_PER_PAGE),
  );

  const currentPage = Math.min(requestedPage, totalPages);

  const orderBy =
    sort === "oldest"
      ? {
          createdAt: "asc" as const,
        }
      : sort === "balance_high"
        ? [
            {
              balance: "desc" as const,
            },
            {
              createdAt: "desc" as const,
            },
          ]
        : sort === "balance_low"
          ? [
              {
                balance: "asc" as const,
              },
              {
                createdAt: "desc" as const,
              },
            ]
          : {
              createdAt: "desc" as const,
            };

  const customers = await prisma.customer.findMany({
    where: customerWhere,
    orderBy,
    skip: (currentPage - 1) * CUSTOMERS_PER_PAGE,
    take: CUSTOMERS_PER_PAGE,
  });

  const createCustomer = createCustomerAction.bind(null, business.slug);

  function getPageUrl(pageNumber: number) {
    const parameters = new URLSearchParams();

    if (search) {
      parameters.set("q", search);
    }

    if (status !== "all") {
      parameters.set("status", status);
    }

    if (sort !== "newest") {
      parameters.set("sort", sort);
    }

    if (pageNumber > 1) {
      parameters.set("page", String(pageNumber));
    }

    const queryString = parameters.toString();

    return `/businesses/${slug}/customers${
      queryString ? `?${queryString}` : ""
    }`;
  }

  const lastResult = Math.min(
    currentPage * CUSTOMERS_PER_PAGE,
    filteredCustomers,
  );

  const firstResult =
    filteredCustomers === 0 ? 0 : (currentPage - 1) * CUSTOMERS_PER_PAGE + 1;

  const paginationStart = Math.max(
    1,
    Math.min(currentPage - 2, totalPages - 4),
  );

  const paginationEnd = Math.min(totalPages, paginationStart + 4);

  const paginationPages = Array.from(
    {
      length: paginationEnd - paginationStart + 1,
    },
    (_, index) => paginationStart + index,
  );

  const filtersActive =
    Boolean(search) || status !== "all" || sort !== "newest";

  const canExportData =
    session.user.role === "SUPER_ADMIN" ||
    (session.user.role === "OWNER" &&
      session.user.businessId === business.id &&
      business.allowOwnerDataExport);

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-100 px-4 py-5 sm:px-8 sm:py-8"
    >
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Link
              href={`/businesses/${business.slug}`}
              className="text-sm font-medium text-violet-600 hover:text-violet-800"
            >
              → الرجوع إلى {business.name}
            </Link>

            <h1 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">
              العملاء
            </h1>

            <p className="mt-1 text-slate-500">
              إضافة وإدارة عملاء {business.name}.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {canExportData && (
              <a
              href={`/businesses/${business.slug}/customers/export`}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-800 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50"
            >
              تصدير العملاء CSV
            </a>
            )}

            <div className="rounded-xl bg-slate-950 px-5 py-3 text-white">
              <span className="text-sm text-slate-400">إجمالي العملاء</span>

              <strong className="ml-3 text-xl">{totalCustomers}</strong>
            </div>
          </div>
        </header>

        {query.created === "1" && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            تم إنشاء العميل بنجاح.
          </div>
        )}

        {query.error === "invalid" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            راجع بيانات العميل المدخلة.
          </div>
        )}

        {query.error === "phone" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            أدخل رقم هاتف صحيحًا.
          </div>
        )}

        {query.error === "duplicate" && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            رقم الهاتف مسجل بالفعل داخل هذا النشاط.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[380px_1fr] lg:gap-8">
          <section className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-slate-950">إضافة عميل</h2>

            <p className="mt-1 text-sm text-slate-500">
              سيتم إنشاء كود العميل ورابط الكارت تلقائيًا.
            </p>

            <form action={createCustomer} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  الاسم الأول
                </label>

                <input
                  id="firstName"
                  name="firstName"
                  required
                  minLength={2}
                  maxLength={50}
                  placeholder="محمد"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  اسم العائلة
                </label>

                <input
                  id="lastName"
                  name="lastName"
                  maxLength={50}
                  placeholder="أحمد"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  رقم الهاتف
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="+201000000000"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-violet-700"
              >
                إضافة عميل
              </button>
            </form>
          </section>

          <section>
            <form className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_180px_190px_auto]">
                <div>
                  <label
                    htmlFor="q"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    البحث
                  </label>

                  <input
                    id="q"
                    name="q"
                    defaultValue={search}
                    placeholder="الاسم أو الهاتف أو كود العميل"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="status"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    الحالة
                  </label>

                  <select
                    id="status"
                    name="status"
                    defaultValue={status}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-violet-500"
                  >
                    <option value="all">كل العملاء</option>

                    <option value="active">Active</option>

                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="sort"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    الترتيب
                  </label>

                  <select
                    id="sort"
                    name="sort"
                    defaultValue={sort}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-violet-500"
                  >
                    <option value="newest">الأحدث أولًا</option>

                    <option value="oldest">الأقدم أولًا</option>

                    <option value="balance_high">الأعلى رصيدًا</option>

                    <option value="balance_low">الأقل رصيدًا</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full self-end rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700"
                >
                  تطبيق
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  Showing {firstResult}–{lastResult} of {filteredCustomers}{" "}
                  results
                </p>

                {filtersActive && (
                  <Link
                    href={`/businesses/${business.slug}/customers`}
                    className="text-sm font-semibold text-violet-600 hover:text-violet-800"
                  >
                    مسح الفلاتر
                  </Link>
                )}
              </div>
            </form>

            {customers.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <h2 className="text-xl font-semibold text-slate-900">
                  لا يوجد عملاء
                </h2>

                <p className="mt-2 text-slate-500">
                  جرّب تغيير البحث أو الفلاتر.
                </p>

                {filtersActive && (
                  <Link
                    href={`/businesses/${business.slug}/customers`}
                    className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white"
                  >
                    عرض كل العملاء
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {customers.map((customer) => {
                    const progress = Math.min(
                      100,
                      Math.floor(
                        (customer.balance / business.rewardThreshold) * 100,
                      ),
                    );

                    return (
                      <article
                        key={customer.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                      >
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2
                                dir="auto"
                                className="text-lg font-bold text-slate-950"
                              >
                                {customer.firstName} {customer.lastName ?? ""}
                              </h2>

                              <span
                                className={
                                  customer.isActive
                                    ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                                    : "rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600"
                                }
                              >
                                {customer.isActive ? "نشط" : "موقوف"}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              {customer.phone}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-violet-600">
                              الكود: {customer.customerCode}
                            </p>
                          </div>

                          <div className="sm:text-right">
                            <p className="text-2xl font-bold text-slate-950">
                              {customer.balance}
                            </p>

                            <p dir="auto" className="text-sm text-slate-500">
                              {business.unitName}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: business.primaryColor,
                            }}
                          />
                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                          {customer.balance} / {business.rewardThreshold} للوصول
                          إلى المكافأة
                        </p>

                        <Link
                          href={`/businesses/${business.slug}/customers/${customer.id}`}
                          className="mt-4 inline-flex w-full justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 sm:w-auto"
                        >
                          فتح ملف العميل
                        </Link>
                      </article>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <nav
                    aria-label="صفحات العملاء"
                    className="mt-6 flex flex-wrap items-center justify-center gap-2"
                  >
                    {currentPage > 1 ? (
                      <Link
                        href={getPageUrl(currentPage - 1)}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:border-violet-400"
                      >
                        → السابق
                      </Link>
                    ) : (
                      <span className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 font-semibold text-slate-400">
                        → السابق
                      </span>
                    )}

                    {paginationPages.map((pageNumber) => (
                      <Link
                        key={pageNumber}
                        href={getPageUrl(pageNumber)}
                        className={
                          pageNumber === currentPage
                            ? "rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white"
                            : "rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:border-violet-400"
                        }
                      >
                        {pageNumber}
                      </Link>
                    ))}

                    {currentPage < totalPages ? (
                      <Link
                        href={getPageUrl(currentPage + 1)}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:border-violet-400"
                      >
                        التالي ←
                      </Link>
                    ) : (
                      <span className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 font-semibold text-slate-400">
                        التالي ←
                      </span>
                    )}
                  </nav>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
