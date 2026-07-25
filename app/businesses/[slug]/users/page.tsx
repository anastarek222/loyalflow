import { auth } from "@/auth";
import {
  canPerform,
  isSuperAdmin as isSuperAdminRole,
} from "@/lib/permissions";
import prisma from "@/lib/prisma";
import type { Prisma, UserRole } from "@/generated/prisma/client";
import Link from "next/link";
import { AdministrationNavigation } from "@/components/administration/administration-navigation";
import { ConfirmSubmitButton } from "@/components/administration/confirm-submit-button";
import { notFound, redirect } from "next/navigation";

import {
  createBusinessUserAction,
  resetBusinessUserPasswordAction,
  setBusinessUserStatusAction,
  updateBusinessUserExperienceAccessAction,
} from "./actions";
import { normalizeLanguage } from "@/lib/i18n";

const USERS_PER_PAGE = 10;

const experienceAccessCopy = {
  AR: {
    label: "وصول الواجهة",
    createDescription: "اختر الواجهة التي يستطيع عضو الفريق استخدامها. الصلاحيات الحالية لا تتغير.",
    editDescription: "يسري التغيير عند أول طلب جديد من الحساب.",
    ownerDescription: "حسابات المالك تحتفظ دائمًا بالوضعين لحماية الوصول الإداري.",
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
    createDescription: "Choose which interface this team member may use. Existing permissions do not change.",
    editDescription: "The change takes effect on the account’s next request.",
    ownerDescription: "Owner accounts always retain both modes to protect administrative access.",
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

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const language = normalizeLanguage(currentUser?.language);
  const t = (ar: string, en: string) => language === "AR" ? ar : en;
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

  return (
    <main
      className="min-h-screen px-4 py-6 sm:px-8 sm:py-8"
    >
      <div className="mx-auto max-w-7xl">
        <AdministrationNavigation user={session.user} businessId={business.id} slug={business.slug} active="users" language={language} />
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Link
              href={`/businesses/${business.slug}`}
              className="text-sm font-medium text-primary hover:text-primary"
            >
              {t("→ الرجوع إلى", "← Back to")} {business.name}
            </Link>

            <h1 className="mt-4 text-2xl font-bold text-foreground sm:text-3xl">
              {t("حسابات الفريق", "Team accounts")}
            </h1>

            <p className="mt-1 text-foreground-subtle">
              {t("إنشاء وإدارة حسابات فريق", "Create and manage team accounts for")} {business.name}.
            </p>
          </div>

          <div className="rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 text-white">
            <span className="text-sm text-foreground-subtle">{t("إجمالي الحسابات", "Total accounts")}</span>

            <strong className="ms-3 text-xl">{totalUsers}</strong>
          </div>
        </header>

        {query.created === "business" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
            {t("تم إنشاء النشاط وحساب المالك بنجاح. يمكنك الآن إضافة باقي أعضاء الفريق.", "The business and owner account were created successfully. You can now add the rest of the team.")}
          </div>
        )}

        {query.created === "1" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
            {t("تم إنشاء الحساب بنجاح.", "Account created successfully.")}
          </div>
        )}

        {query.success === "activated" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
            {t("تم إعادة تفعيل الحساب بنجاح.", "Account reactivated successfully.")}
          </div>
        )}

        {query.success === "deactivated" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-4 text-warning">
            {t("تم إيقاف الحساب وإنهاء صلاحية جلساته الحالية.", "Account deactivated and current sessions revoked.")}
          </div>
        )}

        {query.success === "password" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
            {t("تم تغيير كلمة المرور وإلغاء الجلسات السابقة للحساب.", "Password changed and previous sessions revoked.")}
          </div>
        )}

        {query.success === "experience-access" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
            {accessCopy.updated}
          </div>
        )}

        {query.error === "invalid" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            {t("راجع البيانات المدخلة. يجب ألا تقل كلمة المرور عن 10 أحرف.", "Review the entered data. The password must be at least 10 characters.")}
          </div>
        )}

        {query.error === "email" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-4 text-warning">
            {t("البريد الإلكتروني مسجل بالفعل.", "This email address is already registered.")}
          </div>
        )}

        {query.error === "role" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            {t("يمكن للمالك إنشاء حسابات موظفين فقط.", "The owner can only create permitted team account roles.")}
          </div>
        )}

        {query.error === "owner-exists" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-4 text-warning">
            {t("يوجد بالفعل مالك أساسي لهذا النشاط. لا يمكن إنشاء مالك إضافي.", "This business already has a primary owner. Another owner cannot be created.")}
          </div>
        )}

        {query.error === "password" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            {t("يجب أن تتطابق كلمتا المرور وألا تقل كل منهما عن 10 أحرف.", "The passwords must match and be at least 10 characters.")}
          </div>
        )}

        {query.error === "self-status" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            {t("لا يمكنك إيقاف حسابك الشخصي.", "You cannot deactivate your own account.")}
          </div>
        )}

        {query.error === "permission" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            {t("ليست لديك صلاحية تعديل هذا الحساب.", "You do not have permission to modify this account.")}
          </div>
        )}

        {query.error === "not-found" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            {t("الحساب المحدد غير موجود.", "The selected account does not exist.")}
          </div>
        )}

        <section className="mb-6 rounded-[var(--lf-radius-card)] border border-border bg-white p-6 shadow-sm sm:p-6">
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder={t("بحث بالاسم أو البريد الإلكتروني", "Search by name or email")}
              className="rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30"
            />

            <select
              name="role"
              defaultValue={selectedRole ?? ""}
              className="rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4"
            >
              <option value="">{t("كل الصلاحيات", "All roles")}</option>
              <option value="OWNER">{t("مالك", "Owner")}</option>
              <option value="MANAGER">{t("مدير", "Manager")}</option>
              <option value="STAFF">{t("موظف / كاشير", "Staff / cashier")}</option>
              <option value="VIEWER">{t("مشاهد", "Viewer")}</option>
            </select>

            <select
              name="status"
              defaultValue={status}
              className="rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4"
            >
              <option value="all">{t("كل الحالات", "All statuses")}</option>
              <option value="active">{t("نشط", "Active")}</option>
              <option value="inactive">{t("موقوف", "Inactive")}</option>
            </select>

            <select
              name="sort"
              defaultValue={sort}
              className="rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4"
            >
              <option value="newest">{t("الأحدث أولًا", "Newest first")}</option>
              <option value="oldest">{t("الأقدم أولًا", "Oldest first")}</option>
              <option value="name_asc">{t("الاسم أ ← ي", "Name A → Z")}</option>
              <option value="name_desc">{t("الاسم ي ← أ", "Name Z → A")}</option>
            </select>

            <button
              type="submit"
              className="rounded-[var(--lf-radius-input)] bg-primary px-6 py-4 font-semibold text-[var(--lf-primary-foreground)] transition hover:bg-primary-subtle"
            >
              {t("تطبيق", "Apply")}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm text-foreground-subtle">
            <span>
              {filteredUsers} {t("نتيجة من", "results of")} {totalUsers} {t("حساب", "accounts")}
            </span>

            {filtersActive && (
              <Link
                href={`/businesses/${business.slug}/users`}
                className="font-semibold text-primary hover:text-primary"
              >
                {t("مسح الفلاتر", "Clear filters")}
              </Link>
            )}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr] lg:gap-8">
          <section className="h-fit rounded-[var(--lf-radius-card)] border border-border bg-white p-6 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-foreground">{t("إضافة حساب", "Add account")}</h2>

            <p className="mt-1 break-words text-sm text-foreground-subtle">
              {t("سيسجل المستخدم الدخول بالبريد الإلكتروني وكلمة المرور.", "The user will sign in with their email address and password.")}
            </p>

            <form action={createUser} className="mt-6 space-y-6">
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-2 block text-sm font-medium text-foreground-muted"
                >
                  {t("الاسم الأول", "First name")}
                </label>

                <input
                  id="firstName"
                  name="firstName"
                  required
                  minLength={2}
                  maxLength={50}
                  dir="auto"
                  className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="mb-2 block text-sm font-medium text-foreground-muted"
                >
                  {t("اسم العائلة", "Last name")}
                </label>

                <input
                  id="lastName"
                  name="lastName"
                  maxLength={50}
                  dir="auto"
                  className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-foreground-muted"
                >
                  {t("البريد الإلكتروني", "Email address")}
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  dir="ltr"
                  autoComplete="off"
                  className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-foreground-muted"
                >
                  {t("كلمة مرور مؤقتة", "Temporary password")}
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  dir="ltr"
                  minLength={10}
                  autoComplete="new-password"
                  className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
                />
              </div>

              <div>
                <label
                  htmlFor="role"
                  className="mb-2 block text-sm font-medium text-foreground-muted"
                >
                  {t("صلاحية الحساب", "Account role")}
                </label>

                <select
                  id="role"
                  name="role"
                  defaultValue={isSuperAdmin ? "MANAGER" : "STAFF"}
                  className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30"
                >
                  {isSuperAdmin && (
                    <option value="OWNER">{t("مالك — يدير النشاط", "Owner — manages the business")}</option>
                  )}

                  <option value="MANAGER">
                    {t("مدير — يدير العملاء والولاء والتقارير", "Manager — manages customers, loyalty, and reports")}
                  </option>

                  <option value="STAFF">
                    {t("موظف / كاشير — يجمع ويستبدل الولاء", "Staff / cashier — earns and redeems loyalty")}
                  </option>

                  <option value="VIEWER">
                    {t("مشاهد — يعرض العملاء والتقارير فقط", "Viewer — views customers and reports only")}
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="experienceAccess"
                  className="mb-2 block text-sm font-medium text-foreground-muted"
                >
                  {accessCopy.label}
                </label>

                <select
                  id="experienceAccess"
                  name="experienceAccess"
                  defaultValue=""
                  aria-describedby="experience-access-description"
                  className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30"
                >
                  <option value="">{accessCopy.recommended}</option>
                  <option value="SIMPLE_ONLY">{accessCopy.SIMPLE_ONLY}</option>
                  <option value="ADVANCED_ONLY">{accessCopy.ADVANCED_ONLY}</option>
                  <option value="BOTH">{accessCopy.BOTH}</option>
                </select>

                <p id="experience-access-description" className="mt-2 text-sm text-foreground-subtle">
                  {accessCopy.createDescription}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-foreground-subtle">
                  <li><span className="font-semibold text-foreground-muted">{accessCopy.SIMPLE_ONLY}:</span> {accessCopy.simpleHelp}</li>
                  <li><span className="font-semibold text-foreground-muted">{accessCopy.ADVANCED_ONLY}:</span> {accessCopy.advancedHelp}</li>
                  <li><span className="font-semibold text-foreground-muted">{accessCopy.BOTH}:</span> {accessCopy.bothHelp}</li>
                </ul>
              </div>

              <button
                type="submit"
                className="w-full rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 font-semibold text-white transition hover:bg-primary-subtle"
              >
                {t("إنشاء الحساب", "Create account")}
              </button>
            </form>
          </section>

          <section>
            {users.length === 0 ? (
              <div className="rounded-[var(--lf-radius-card)] border border-dashed border-border bg-white p-12 text-center">
                {t("لا توجد حسابات فريق حتى الآن.", "There are no team accounts yet.")}
              </div>
            ) : (
              <div className="space-y-6">
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
                  const changeExperienceAccess = updateBusinessUserExperienceAccessAction.bind(
                    null,
                    business.slug,
                    user.id,
                  );

                  return (
                    <article
                      key={user.id}
                      className="rounded-[var(--lf-radius-card)] border border-border bg-white p-6 shadow-sm sm:p-6"
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2
                              dir="auto"
                              className="text-lg font-bold text-foreground"
                            >
                              {user.firstName} {user.lastName ?? ""}
                            </h2>

                            {isCurrentUser && (
                              <span className="rounded-full bg-info-subtle px-4 py-1 text-xs font-semibold text-info">
                                {t("أنت", "You")}
                              </span>
                            )}
                          </div>

                          <p className="mt-1 break-words text-sm text-foreground-subtle">
                            {user.email}
                          </p>

                          <p className="mt-1 text-xs text-foreground-subtle">
                            {t("تاريخ الإنشاء:", "Created:")}{" "}
                            {user.createdAt.toLocaleDateString(language === "AR" ? "ar-EG" : "en-GB")}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-primary-subtle px-4 py-1 text-xs font-semibold text-primary">
                            {user.role === "OWNER"
                              ? t("مالك", "Owner")
                              : user.role === "MANAGER"
                                ? t("مدير", "Manager")
                                : user.role === "VIEWER"
                                  ? t("مشاهد", "Viewer")
                                  : t("موظف / كاشير", "Staff / cashier")}
                          </span>

                          <span
                            className={`rounded-full px-4 py-1 text-xs font-semibold ${
                              user.isActive
                                ? "bg-success-subtle text-success"
                                : "bg-danger-subtle text-danger"
                            }`}
                          >
                            {user.isActive ? t("نشط", "Active") : t("موقوف", "Inactive")}
                          </span>
                        </div>
                      </div>

                      {canChangePassword && (
                        <form
                          action={resetPassword}
                          className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2"
                        >
                          <div>
                            <label
                              htmlFor={`password-${user.id}`}
                              className="mb-2 block text-sm font-medium text-foreground-muted"
                            >
                              {t("كلمة المرور الجديدة", "New password")}
                            </label>

                            <input
                              id={`password-${user.id}`}
                              name="password"
                              type="password"
                              minLength={10}
                              required
                              autoComplete="new-password"
                              className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`confirm-${user.id}`}
                              className="mb-2 block text-sm font-medium text-foreground-muted"
                            >
                              {t("تأكيد كلمة المرور", "Confirm password")}
                            </label>

                            <input
                              id={`confirm-${user.id}`}
                              name="confirmPassword"
                              type="password"
                              minLength={10}
                              required
                              autoComplete="new-password"
                              className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30"
                            />
                          </div>

                          <button
                            type="submit"
                            className="rounded-[var(--lf-radius-input)] bg-primary px-6 py-4 font-semibold text-[var(--lf-primary-foreground)] transition hover:bg-primary-subtle sm:col-span-2"
                          >
                            {t("تغيير كلمة المرور", "Change password")}
                          </button>
                        </form>
                      )}

                      <section className="mt-6 border-t border-border pt-6" aria-labelledby={`experience-access-${user.id}`}>
                        <h3 id={`experience-access-${user.id}`} className="font-semibold text-foreground">
                          {accessCopy.label}
                        </h3>
                        {user.role === "OWNER" ? (
                          <p className="mt-1 text-sm text-foreground-subtle">{accessCopy.ownerDescription}</p>
                        ) : (
                          <form action={changeExperienceAccess} className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                            <div>
                              <label htmlFor={`experienceAccess-${user.id}`} className="mb-2 block text-sm font-medium text-foreground-muted">
                                {accessCopy.label}
                              </label>
                              <select
                                id={`experienceAccess-${user.id}`}
                                name="experienceAccess"
                                defaultValue={user.experienceAccess}
                                aria-describedby={`experience-access-description-${user.id}`}
                                className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30"
                              >
                                <option value="SIMPLE_ONLY">{accessCopy.SIMPLE_ONLY}</option>
                                <option value="ADVANCED_ONLY">{accessCopy.ADVANCED_ONLY}</option>
                                <option value="BOTH">{accessCopy.BOTH}</option>
                              </select>
                              <p id={`experience-access-description-${user.id}`} className="mt-2 text-sm text-foreground-subtle">{accessCopy.editDescription}</p>
                            </div>
                            <button type="submit" className="min-h-11 rounded-[var(--lf-radius-input)] bg-primary px-6 py-4 font-semibold text-[var(--lf-primary-foreground)] transition hover:bg-primary-subtle">
                              {accessCopy.save}
                            </button>
                          </form>
                        )}
                      </section>

                      <div className="mt-6 flex flex-col justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
                        <div>
                          <p className="font-semibold text-foreground">
                            {t("الوصول إلى الحساب", "Account access")}
                          </p>

                          <p className="mt-1 break-words text-sm text-foreground-subtle">
                            {t("الحساب الموقوف لا يمكنه الدخول إلى LoyalFlow.", "An inactive account cannot sign in to LoyalFlow.")}
                          </p>
                        </div>

                        {canChangeStatus ? (
                          <form action={changeStatus}>
                            <ConfirmSubmitButton
                              confirmation={user.isActive ? t(`إيقاف حساب ${user.email} وإنهاء جلساته الحالية؟`, `Deactivate ${user.email} and revoke current sessions?`) : t(`إعادة تفعيل حساب ${user.email}؟`, `Reactivate ${user.email}?`)}
                              type="submit"
                              className={
                                user.isActive
                                  ? "w-full rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-6 py-4 font-semibold text-danger transition hover:bg-danger-subtle sm:w-auto"
                                  : "w-full rounded-[var(--lf-radius-input)] bg-success px-6 py-4 font-semibold text-[var(--lf-inverse)] transition hover:bg-success-subtle sm:w-auto"
                              }
                            >
                              {user.isActive
                                ? t("إيقاف الحساب", "Deactivate account")
                                : t("إعادة تفعيل الحساب", "Reactivate account")}
                            </ConfirmSubmitButton>
                          </form>
                        ) : (
                          <p className="text-sm font-medium text-foreground-subtle">
                            {isCurrentUser
                              ? t("لا يمكنك إيقاف حسابك الشخصي.", "You cannot deactivate yourself.")
                              : t("حساب محمي.", "Protected account.")}
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
          <nav className="mt-8 flex items-center justify-center gap-4">
            {currentPage > 1 ? (
              <Link
                href={getPageUrl(currentPage - 1)}
                className="rounded-[var(--lf-radius-input)] border border-border bg-white px-6 py-4 font-semibold text-foreground-muted"
              >
                {t("→ السابق", "← Previous")}
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-6 py-4 font-semibold text-foreground-subtle">
                {t("→ السابق", "← Previous")}
              </span>
            )}

            <span className="rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 font-semibold text-white">
              {currentPage} / {totalPages}
            </span>

            {currentPage < totalPages ? (
              <Link
                href={getPageUrl(currentPage + 1)}
                className="rounded-[var(--lf-radius-input)] border border-border bg-white px-6 py-4 font-semibold text-foreground-muted"
              >
                {t("التالي ←", "Next →")}
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-6 py-4 font-semibold text-foreground-subtle">
                {t("التالي ←", "Next →")}
              </span>
            )}
          </nav>
        )}
      </div>
    </main>
  );
}
