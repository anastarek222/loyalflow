import { auth } from "@/auth";
import {
  canPerform,
  isSuperAdmin as isSuperAdminRole,
} from "@/lib/permissions";
import prisma from "@/lib/prisma";
import type { Prisma, UserRole } from "@/generated/prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  createBusinessUserAction,
  resetBusinessUserPasswordAction,
  setBusinessUserStatusAction,
} from "./actions";
import { getBusinessTheme } from "@/lib/theme";

const USERS_PER_PAGE = 10;

type UsersPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    created?: string;
    success?: string;
    error?: string;
    q?: string;
    role?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
};

export default async function UsersPage({
  params,
  searchParams,
}: UsersPageProps) {
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

  const theme = getBusinessTheme(business);

  const isSuperAdmin = isSuperAdminRole(session.user);

  if (!canPerform(session.user, business.id, "STAFF_MANAGE")) {
    redirect("/dashboard");
  }

  const search = query.q?.trim() ?? "";

  const allowedRoles: UserRole[] = ["OWNER", "MANAGER", "STAFF", "VIEWER"];

  const selectedRole = allowedRoles.includes(query.role as UserRole)
    ? (query.role as UserRole)
    : null;

  const status =
    query.status === "active" || query.status === "inactive"
      ? query.status
      : "all";

  const allowedSorts = ["newest", "oldest", "name_asc", "name_desc"];

  const sort = allowedSorts.includes(query.sort ?? "") ? query.sort! : "newest";

  const parsedPage = Number.parseInt(query.page ?? "1", 10);

  const requestedPage =
    Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const userFilters: Prisma.UserWhereInput[] = [
    {
      businessId: business.id,
    },
  ];

  if (search) {
    const nameParts = search.split(/\s+/).filter(Boolean);

    const searchFilters: Prisma.UserWhereInput[] = [
      {
        firstName: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        lastName: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];

    if (nameParts.length >= 2) {
      searchFilters.push({
        AND: [
          {
            firstName: {
              contains: nameParts[0],
              mode: "insensitive",
            },
          },
          {
            lastName: {
              contains: nameParts.slice(1).join(" "),
              mode: "insensitive",
            },
          },
        ],
      });
    }

    userFilters.push({
      OR: searchFilters,
    });
  }

  if (selectedRole) {
    userFilters.push({
      role: selectedRole,
    });
  }

  if (status === "active") {
    userFilters.push({
      isActive: true,
    });
  }

  if (status === "inactive") {
    userFilters.push({
      isActive: false,
    });
  }

  const userWhere: Prisma.UserWhereInput = {
    AND: userFilters,
  };

  const [totalUsers, filteredUsers] = await Promise.all([
    prisma.user.count({
      where: {
        businessId: business.id,
      },
    }),

    prisma.user.count({
      where: userWhere,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers / USERS_PER_PAGE));

  const currentPage = Math.min(requestedPage, totalPages);

  const orderBy: Prisma.UserOrderByWithRelationInput[] =
    sort === "oldest"
      ? [{ createdAt: "asc" }]
      : sort === "name_asc"
        ? [{ firstName: "asc" }, { lastName: "asc" }]
        : sort === "name_desc"
          ? [{ firstName: "desc" }, { lastName: "desc" }]
          : [{ createdAt: "desc" }];

  const users = await prisma.user.findMany({
    where: userWhere,
    orderBy,
    skip: (currentPage - 1) * USERS_PER_PAGE,
    take: USERS_PER_PAGE,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  function getPageUrl(pageNumber: number) {
    const parameters = new URLSearchParams();

    if (search) {
      parameters.set("q", search);
    }

    if (selectedRole) {
      parameters.set("role", selectedRole);
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

    return `/businesses/${slug}/users${queryString ? `?${queryString}` : ""}`;
  }

  const filtersActive =
    Boolean(search) ||
    Boolean(selectedRole) ||
    status !== "all" ||
    sort !== "newest";

  const createUser = createBusinessUserAction.bind(null, business.slug);

  return (
    <main
      style={{
        background: theme.backgroundColor,
        fontFamily: theme.fontFamily,
      }}
      className="min-h-screen px-4 py-5 sm:px-8 sm:py-8"
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
              حسابات الفريق
            </h1>

            <p className="mt-1 text-slate-500">
              إنشاء وإدارة حسابات فريق {business.name}.
            </p>
          </div>

          <div className="rounded-xl bg-slate-950 px-5 py-3 text-white">
            <span className="text-sm text-slate-400">إجمالي الحسابات</span>

            <strong className="ms-3 text-xl">{totalUsers}</strong>
          </div>
        </header>

        {query.created === "business" && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            تم إنشاء النشاط وحساب المالك بنجاح. يمكنك الآن إضافة باقي أعضاء
            الفريق.
          </div>
        )}

        {query.created === "1" && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            تم إنشاء الحساب بنجاح.
          </div>
        )}

        {query.success === "activated" && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            تم إعادة تفعيل الحساب بنجاح.
          </div>
        )}

        {query.success === "deactivated" && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            تم إيقاف الحساب وإنهاء صلاحية جلساته الحالية.
          </div>
        )}

        {query.success === "password" && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            تم تغيير كلمة المرور وإلغاء الجلسات السابقة للحساب.
          </div>
        )}

        {query.error === "invalid" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            راجع البيانات المدخلة. يجب ألا تقل كلمة المرور عن 10 أحرف.
          </div>
        )}

        {query.error === "email" && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            البريد الإلكتروني مسجل بالفعل.
          </div>
        )}

        {query.error === "role" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            يمكن للمالك إنشاء حسابات موظفين فقط.
          </div>
        )}

        {query.error === "owner-exists" && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            يوجد بالفعل مالك أساسي لهذا النشاط. لا يمكن إنشاء مالك إضافي.
          </div>
        )}

        {query.error === "password" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            يجب أن تتطابق كلمتا المرور وألا تقل كل منهما عن 10 أحرف.
          </div>
        )}

        {query.error === "self-status" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            لا يمكنك إيقاف حسابك الشخصي.
          </div>
        )}

        {query.error === "permission" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            ليست لديك صلاحية تعديل هذا الحساب.
          </div>
        )}

        {query.error === "not-found" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            الحساب المحدد غير موجود.
          </div>
        )}

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="بحث بالاسم أو البريد الإلكتروني"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
            />

            <select
              name="role"
              defaultValue={selectedRole ?? ""}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="">كل الصلاحيات</option>
              <option value="OWNER">مالك</option>
              <option value="MANAGER">مدير</option>
              <option value="STAFF">موظف / كاشير</option>
              <option value="VIEWER">مشاهد</option>
            </select>

            <select
              name="status"
              defaultValue={status}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">موقوف</option>
            </select>

            <select
              name="sort"
              defaultValue={sort}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="newest">الأحدث أولًا</option>
              <option value="oldest">الأقدم أولًا</option>
              <option value="name_asc">الاسم أ ← ي</option>
              <option value="name_desc">الاسم ي ← أ</option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700"
            >
              تطبيق
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <span>
              {filteredUsers} نتيجة من {totalUsers} حساب
            </span>

            {filtersActive && (
              <Link
                href={`/businesses/${business.slug}/users`}
                className="font-semibold text-violet-600 hover:text-violet-800"
              >
                مسح الفلاتر
              </Link>
            )}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr] lg:gap-8">
          <section className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-slate-950">إضافة حساب</h2>

            <p className="mt-1 break-words text-sm text-slate-500">
              سيسجل المستخدم الدخول بالبريد الإلكتروني وكلمة المرور.
            </p>

            <form action={createUser} className="mt-6 space-y-5">
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
                  dir="auto"
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
                  dir="auto"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  البريد الإلكتروني
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  dir="ltr"
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  كلمة مرور مؤقتة
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  dir="ltr"
                  minLength={10}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <label
                  htmlFor="role"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  صلاحية الحساب
                </label>

                <select
                  id="role"
                  name="role"
                  defaultValue={isSuperAdmin ? "MANAGER" : "STAFF"}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
                >
                  {isSuperAdmin && (
                    <option value="OWNER">مالك — يدير النشاط</option>
                  )}

                  <option value="MANAGER">
                    مدير — يدير العملاء والولاء والتقارير
                  </option>

                  <option value="STAFF">
                    موظف / كاشير — يجمع ويستبدل الولاء
                  </option>

                  <option value="VIEWER">
                    مشاهد — يعرض العملاء والتقارير فقط
                  </option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-violet-700"
              >
                إنشاء الحساب
              </button>
            </form>
          </section>

          <section>
            {users.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                لا توجد حسابات فريق حتى الآن.
              </div>
            ) : (
              <div className="space-y-5">
                {users.map((user) => {
                  const isCurrentUser = user.id === session.user.id;

                  const canChangeStatus =
                    !isCurrentUser && (isSuperAdmin || user.role !== "OWNER");

                  const canChangePassword =
                    isSuperAdmin || user.role !== "OWNER" || isCurrentUser;

                  const changeStatus = setBusinessUserStatusAction.bind(
                    null,
                    business.slug,
                    user.id,
                    !user.isActive,
                  );

                  const resetPassword = resetBusinessUserPasswordAction.bind(
                    null,
                    business.slug,
                    user.id,
                  );

                  return (
                    <article
                      key={user.id}
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2
                              dir="auto"
                              className="text-lg font-bold text-slate-950"
                            >
                              {user.firstName} {user.lastName ?? ""}
                            </h2>

                            {isCurrentUser && (
                              <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
                                أنت
                              </span>
                            )}
                          </div>

                          <p className="mt-1 break-words text-sm text-slate-500">
                            {user.email}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            تاريخ الإنشاء:{" "}
                            {user.createdAt.toLocaleDateString("ar-EG")}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                            {user.role === "OWNER"
                              ? "مالك"
                              : user.role === "MANAGER"
                                ? "مدير"
                                : user.role === "VIEWER"
                                  ? "مشاهد"
                                  : "موظف / كاشير"}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              user.isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {user.isActive ? "نشط" : "موقوف"}
                          </span>
                        </div>
                      </div>

                      {canChangePassword && (
                        <form
                          action={resetPassword}
                          className="mt-6 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2"
                        >
                          <div>
                            <label
                              htmlFor={`password-${user.id}`}
                              className="mb-2 block text-sm font-medium text-slate-700"
                            >
                              كلمة المرور الجديدة
                            </label>

                            <input
                              id={`password-${user.id}`}
                              name="password"
                              type="password"
                              minLength={10}
                              required
                              autoComplete="new-password"
                              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`confirm-${user.id}`}
                              className="mb-2 block text-sm font-medium text-slate-700"
                            >
                              تأكيد كلمة المرور
                            </label>

                            <input
                              id={`confirm-${user.id}`}
                              name="confirmPassword"
                              type="password"
                              minLength={10}
                              required
                              autoComplete="new-password"
                              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
                            />
                          </div>

                          <button
                            type="submit"
                            className="rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700 sm:col-span-2"
                          >
                            تغيير كلمة المرور
                          </button>
                        </form>
                      )}

                      <div className="mt-6 flex flex-col justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center">
                        <div>
                          <p className="font-semibold text-slate-900">
                            الوصول إلى الحساب
                          </p>

                          <p className="mt-1 break-words text-sm text-slate-500">
                            الحساب الموقوف لا يمكنه الدخول إلى LoyalFlow.
                          </p>
                        </div>

                        {canChangeStatus ? (
                          <form action={changeStatus}>
                            <button
                              type="submit"
                              className={
                                user.isActive
                                  ? "w-full rounded-xl border border-red-300 bg-red-50 px-5 py-3 font-semibold text-red-700 transition hover:bg-red-100 sm:w-auto"
                                  : "w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
                              }
                            >
                              {user.isActive
                                ? "إيقاف الحساب"
                                : "إعادة تفعيل الحساب"}
                            </button>
                          </form>
                        ) : (
                          <p className="text-sm font-medium text-slate-400">
                            {isCurrentUser
                              ? "أنت cannot deactivate yourself."
                              : "حساب محمي."}
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {totalPages > 1 && (
          <nav className="mt-7 flex items-center justify-center gap-3">
            {currentPage > 1 ? (
              <Link
                href={getPageUrl(currentPage - 1)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
              >
                → السابق
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-5 py-3 font-semibold text-slate-400">
                → السابق
              </span>
            )}

            <span className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white">
              {currentPage} / {totalPages}
            </span>

            {currentPage < totalPages ? (
              <Link
                href={getPageUrl(currentPage + 1)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
              >
                التالي ←
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-5 py-3 font-semibold text-slate-400">
                التالي ←
              </span>
            )}
          </nav>
        )}
      </div>
    </main>
  );
}
