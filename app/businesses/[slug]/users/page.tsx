import { auth } from "@/auth";
import {
  canPerform,
  isSuperAdmin as isSuperAdminRole,
} from "@/lib/permissions";
import prisma from "@/lib/prisma";
import type { Prisma, UserRole } from "@/generated/prisma/client";
import Link from "next/link";
import {
  CheckCircle2,
  Filter,
  KeyRound,
  Plus,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";
import { ConfirmSubmitButton } from "@/components/administration/confirm-submit-button";
import { notFound, redirect } from "next/navigation";

import {
  createBusinessUserAction,
  resetBusinessUserPasswordAction,
  setBusinessUserStatusAction,
  updateBusinessUserExperienceAccessAction,
} from "./actions";
import { normalizeLanguage } from "@/lib/i18n";
import { logServerEvent } from "@/lib/server/logging";

const USERS_PER_PAGE = 10;

const administrationFieldClass =
  "min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft";

const experienceAccessCopy = {
  AR: {
    label: "وصول الواجهة",
    createDescription:
      "اختر الواجهة التي يستطيع عضو الفريق استخدامها. الصلاحيات الحالية لا تتغير.",
    editDescription: "يسري التغيير عند أول طلب جديد من الحساب.",
    ownerDescription:
      "حسابات المالك تحتفظ دائمًا بالوضعين لحماية الوصول الإداري.",
    save: "حفظ وصول الواجهة",
    updated: "تم تحديث وصول الواجهة بنجاح.",
    SIMPLE_ONLY: "الوضع البسيط فقط",
    ADVANCED_ONLY: "الوضع المتقدم فقط",
    BOTH: "البسيط والمتقدم",
    recommended: "استخدم الإعداد الموصى به للدور",
    simpleHelp: "أدوات التشغيل اليومية بواجهة مختصرة.",
    advancedHelp: "واجهة الإدارة الكاملة حسب الصلاحيات المتاحة.",
    bothHelp: "يمكن للمستخدم التبديل بين البسيط والمتقدم.",
  },
  EN: {
    label: "Interface access",
    createDescription:
      "Choose which interface this team member may use. Existing permissions do not change.",
    editDescription: "The change takes effect on the account’s next request.",
    ownerDescription:
      "Owner accounts always retain both modes to protect administrative access.",
    save: "Save interface access",
    updated: "Interface access updated successfully.",
    SIMPLE_ONLY: "Simple only",
    ADVANCED_ONLY: "Advanced only",
    BOTH: "Simple + Advanced",
    recommended: "Use the role-recommended setting",
    simpleHelp: "Daily operational tools with a reduced interface.",
    advancedHelp: "Full management interface where permissions allow.",
    bothHelp: "The user can switch between Simple and Advanced.",
  },
} as const;

type UsersPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    created?: string;
    sheetSync?: string;
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
  logServerEvent("BUSINESS_DESTINATION_RENDER_STARTED", { slug });
  const query = await searchParams;

  const business = await prisma.business.findUnique({
    where: {
      slug,
    },
  });

  if (!business) {
    notFound();
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const language = normalizeLanguage(currentUser?.language);
  const accessCopy = experienceAccessCopy[language];

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
      experienceAccess: true,
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
  logServerEvent("BUSINESS_DESTINATION_RENDER_OK", {
    businessId: business.id,
    slug: business.slug,
  });

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div
        className="mx-auto max-w-7xl"
        data-team-administration="true"
        dir={language === "AR" ? "rtl" : "ltr"}
      >
        <Link
          href={`/businesses/${business.slug}`}
          className="inline-flex min-h-10 items-center text-sm font-semibold text-foreground-muted transition-colors hover:text-primary"
        >
          {language === "AR" ? "العودة إلى" : "Back to"} {business.name}
        </Link>

        <header className="relative mb-5 mt-4 overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-7">
          <div className="pointer-events-none absolute end-0 top-0 size-64 rounded-full bg-[radial-gradient(circle,var(--lf-primary-soft),transparent_68%)]" />
          <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                <UsersRound className="size-4" aria-hidden="true" />
                {language === "AR" ? "إدارة الفريق" : "Team administration"}
              </span>
              <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {language === "AR" ? "حسابات الفريق" : "Team accounts"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-foreground-muted">
                {language === "AR"
                  ? `أنشئ حسابات فريق ${business.name} واضبط الدور والوصول وحالة الحساب من مكان واحد.`
                  : `Create ${business.name} team accounts and manage role, interface access, and account status in one place.`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AdminMetric
                label={language === "AR" ? "إجمالي الحسابات" : "Total accounts"}
                value={totalUsers}
              />
              <AdminMetric
                label={
                  language === "AR" ? "النتائج الحالية" : "Current results"
                }
                value={filteredUsers}
              />
            </div>
          </div>
        </header>

        {query.created === "business" && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            تم إنشاء النشاط وحساب المالك بنجاح. يمكنك الآن إضافة باقي أعضاء
            الفريق.
          </div>
        )}

        {query.created === "business" && query.sheetSync === "pending" && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
            تم حفظ النشاط بنجاح. مزامنة Google Sheets تعمل في الخلفية، ويمكن
            متابعة حالتها أو إعادة المحاولة من إعدادات النشاط.
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

        {query.success === "experience-access" && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            {accessCopy.updated}
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

        <section
          className="mb-5 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6"
          data-team-filters="true"
        >
          <div className="mb-4 flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <Filter className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-black text-foreground">
                {language === "AR" ? "البحث والتصفية" : "Search & filter"}
              </h2>
              <p className="mt-1 text-sm text-foreground-muted">
                {language === "AR"
                  ? "ابحث بالاسم أو البريد وحدد الدور والحالة."
                  : "Search by name or email and narrow by role and status."}
              </p>
            </div>
          </div>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-foreground-subtle"
                aria-hidden="true"
              />
              <span className="sr-only">
                {language === "AR" ? "بحث الفريق" : "Search team"}
              </span>
              <input
                type="search"
                name="q"
                defaultValue={search}
                placeholder={
                  language === "AR"
                    ? "بحث بالاسم أو البريد الإلكتروني"
                    : "Search by name or email"
                }
                className={`${administrationFieldClass} ps-10`}
              />
            </label>

            <select
              name="role"
              defaultValue={selectedRole ?? ""}
              className={administrationFieldClass}
            >
              <option value="">
                {language === "AR" ? "كل الصلاحيات" : "All roles"}
              </option>
              <option value="OWNER">
                {language === "AR" ? "مالك" : "Owner"}
              </option>
              <option value="MANAGER">
                {language === "AR" ? "مدير" : "Manager"}
              </option>
              <option value="STAFF">
                {language === "AR" ? "موظف / كاشير" : "Staff / cashier"}
              </option>
              <option value="VIEWER">
                {language === "AR" ? "مشاهد" : "Viewer"}
              </option>
            </select>

            <select
              name="status"
              defaultValue={status}
              className={administrationFieldClass}
            >
              <option value="all">
                {language === "AR" ? "كل الحالات" : "All statuses"}
              </option>
              <option value="active">
                {language === "AR" ? "نشط" : "Active"}
              </option>
              <option value="inactive">
                {language === "AR" ? "موقوف" : "Inactive"}
              </option>
            </select>

            <select
              name="sort"
              defaultValue={sort}
              className={administrationFieldClass}
            >
              <option value="newest">
                {language === "AR" ? "الأحدث أولًا" : "Newest first"}
              </option>
              <option value="oldest">
                {language === "AR" ? "الأقدم أولًا" : "Oldest first"}
              </option>
              <option value="name_asc">
                {language === "AR" ? "الاسم أ ← ي" : "Name A → Z"}
              </option>
              <option value="name_desc">
                {language === "AR" ? "الاسم ي ← أ" : "Name Z → A"}
              </option>
            </select>

            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--lf-radius-input)] bg-primary px-5 font-bold text-white transition-colors hover:bg-primary-hover"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {language === "AR" ? "تطبيق" : "Apply"}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <span>
              {language === "AR"
                ? `${filteredUsers} نتيجة من ${totalUsers} حساب`
                : `${filteredUsers} of ${totalUsers} accounts`}
            </span>

            {filtersActive && (
              <Link
                href={`/businesses/${business.slug}/users`}
                className="font-semibold text-violet-600 hover:text-violet-800"
              >
                {language === "AR" ? "مسح الفلاتر" : "Clear filters"}
              </Link>
            )}
          </div>
        </section>

        <details className="group mb-6 rounded-[var(--lf-radius-card)] border border-border bg-surface shadow-sm">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <span className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Plus className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-black text-foreground">
                  {language === "AR" ? "إضافة حساب" : "Add account"}
                </span>
                <span className="mt-0.5 block text-xs text-foreground-subtle">
                  {language === "AR"
                    ? "أنشئ حسابًا جديدًا فقط عند إضافة عضو للفريق."
                    : "Create an account only when adding a new team member."}
                </span>
              </span>
            </span>
            <span
              className="text-lg font-bold text-primary transition-transform group-open:rotate-45"
              aria-hidden="true"
            >
              +
            </span>
          </summary>
          <div className="border-t border-border p-5">
            <form action={createUser} className="grid gap-4 sm:grid-cols-2">
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
                  className={administrationFieldClass}
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
                  className={administrationFieldClass}
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
                  className={administrationFieldClass}
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
                  className={administrationFieldClass}
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
                  className={administrationFieldClass}
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

              <div>
                <label
                  htmlFor="experienceAccess"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  {accessCopy.label}
                </label>

                <select
                  id="experienceAccess"
                  name="experienceAccess"
                  defaultValue=""
                  aria-describedby="experience-access-description"
                  className={administrationFieldClass}
                >
                  <option value="">{accessCopy.recommended}</option>
                  <option value="SIMPLE_ONLY">{accessCopy.SIMPLE_ONLY}</option>
                  <option value="ADVANCED_ONLY">
                    {accessCopy.ADVANCED_ONLY}
                  </option>
                  <option value="BOTH">{accessCopy.BOTH}</option>
                </select>

                <p
                  id="experience-access-description"
                  className="mt-2 text-sm text-slate-500"
                >
                  {accessCopy.createDescription}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-500">
                  <li>
                    <span className="font-semibold text-slate-700">
                      {accessCopy.SIMPLE_ONLY}:
                    </span>{" "}
                    {accessCopy.simpleHelp}
                  </li>
                  <li>
                    <span className="font-semibold text-slate-700">
                      {accessCopy.ADVANCED_ONLY}:
                    </span>{" "}
                    {accessCopy.advancedHelp}
                  </li>
                  <li>
                    <span className="font-semibold text-slate-700">
                      {accessCopy.BOTH}:
                    </span>{" "}
                    {accessCopy.bothHelp}
                  </li>
                </ul>
              </div>

              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--lf-radius-input)] bg-primary px-5 font-bold text-white transition-colors hover:bg-primary-hover sm:w-auto"
              >
                <UserRound className="size-4" aria-hidden="true" />
                {language === "AR" ? "إنشاء الحساب" : "Create account"}
              </button>
            </form>
          </div>
        </details>

        <div>
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
                  const changeExperienceAccess =
                    updateBusinessUserExperienceAccessAction.bind(
                      null,
                      business.slug,
                      user.id,
                    );

                  return (
                    <article
                      key={user.id}
                      data-team-member="true"
                      className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6"
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-black text-primary">
                            {user.firstName.trim().charAt(0).toUpperCase() ||
                              "?"}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2
                                dir="auto"
                                className="text-lg font-bold text-slate-950"
                              >
                                {user.firstName} {user.lastName ?? ""}
                              </h2>

                              {isCurrentUser && (
                                <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
                                  {language === "AR" ? "أنت" : "You"}
                                </span>
                              )}
                            </div>

                            <p
                              dir="ltr"
                              className="mt-1 break-words text-start text-sm text-foreground-muted"
                            >
                              {user.email}
                            </p>

                            <p className="mt-1 text-xs text-foreground-subtle">
                              {language === "AR" ? "تاريخ الإنشاء" : "Created"}:{" "}
                              {user.createdAt.toLocaleDateString(
                                language === "AR" ? "ar-EG" : "en-US",
                              )}
                            </p>
                          </div>
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

                      <details className="group mt-5 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-foreground-muted">
                          <span className="inline-flex items-center gap-2">
                            <KeyRound
                              className="size-4 text-primary"
                              aria-hidden="true"
                            />
                            {language === "AR"
                              ? "إدارة الحساب"
                              : "Manage account"}
                          </span>
                          <span
                            className="text-primary transition-transform group-open:rotate-45"
                            aria-hidden="true"
                          >
                            +
                          </span>
                        </summary>
                        <div className="border-t border-border p-4">
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

                          <section
                            className="mt-6 border-t border-slate-200 pt-6"
                            aria-labelledby={`experience-access-${user.id}`}
                          >
                            <h3
                              id={`experience-access-${user.id}`}
                              className="font-semibold text-slate-900"
                            >
                              {accessCopy.label}
                            </h3>
                            {user.role === "OWNER" ? (
                              <p className="mt-1 text-sm text-slate-500">
                                {accessCopy.ownerDescription}
                              </p>
                            ) : (
                              <form
                                action={changeExperienceAccess}
                                className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                              >
                                <div>
                                  <label
                                    htmlFor={`experienceAccess-${user.id}`}
                                    className="mb-2 block text-sm font-medium text-slate-700"
                                  >
                                    {accessCopy.label}
                                  </label>
                                  <select
                                    id={`experienceAccess-${user.id}`}
                                    name="experienceAccess"
                                    defaultValue={user.experienceAccess}
                                    aria-describedby={`experience-access-description-${user.id}`}
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
                                  >
                                    <option value="SIMPLE_ONLY">
                                      {accessCopy.SIMPLE_ONLY}
                                    </option>
                                    <option value="ADVANCED_ONLY">
                                      {accessCopy.ADVANCED_ONLY}
                                    </option>
                                    <option value="BOTH">
                                      {accessCopy.BOTH}
                                    </option>
                                  </select>
                                  <p
                                    id={`experience-access-description-${user.id}`}
                                    className="mt-2 text-sm text-slate-500"
                                  >
                                    {accessCopy.editDescription}
                                  </p>
                                </div>
                                <button
                                  type="submit"
                                  className="min-h-11 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700"
                                >
                                  {accessCopy.save}
                                </button>
                              </form>
                            )}
                          </section>

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
                                <ConfirmSubmitButton
                                  confirmation={
                                    user.isActive
                                      ? `إيقاف حساب ${user.email} وإنهاء جلساته الحالية؟`
                                      : `إعادة تفعيل حساب ${user.email}؟`
                                  }
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
                                </ConfirmSubmitButton>
                              </form>
                            ) : (
                              <p className="text-sm font-medium text-slate-400">
                                {isCurrentUser
                                  ? language === "AR"
                                    ? "لا يمكنك إيقاف حسابك الشخصي."
                                    : "You cannot deactivate your own account."
                                  : language === "AR"
                                    ? "حساب محمي."
                                    : "Protected account."}
                              </p>
                            )}
                          </div>
                        </div>
                      </details>
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

function AdminMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--lf-radius-input)] border border-border bg-surface/90 px-4 py-3">
      <p className="text-xs font-semibold text-foreground-subtle">{label}</p>
      <p className="lf-type-numeric mt-1 text-xl font-black text-foreground">
        {value}
      </p>
    </div>
  );
}
