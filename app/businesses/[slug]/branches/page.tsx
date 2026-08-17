import { auth } from "@/auth";
import { ConfirmSubmitButton } from "@/components/administration/confirm-submit-button";
import { canManageBranches, getBranchCount } from "@/lib/branches/management";
import { getLanguageLocale, normalizeLanguage, type AppLanguage } from "@/lib/i18n";
import prisma from "@/lib/prisma";
import {
  Building2,
  MapPin,
  Phone,
  Plus,
  Store,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import {
  assignStaffToBranchAction,
  createBranchAction,
  removeStaffAssignmentAction,
  setBranchStatusAction,
  updateBranchAction,
} from "./actions";

type BranchesPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

const branchFieldClass =
  "min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft";

function t(language: AppLanguage, ar: string, en: string) {
  return language === "AR" ? ar : en;
}

function fullName(user: { firstName: string; lastName: string | null }) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ");
}

export default async function BranchesPage({ params, searchParams }: BranchesPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const query = await searchParams;
  const [user, business] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { language: true } }),
    prisma.business.findUnique({ where: { slug }, select: { id: true, name: true, slug: true } }),
  ]);
  if (!business) notFound();
  if (!canManageBranches(session.user, business.id)) redirect("/dashboard");

  const language = normalizeLanguage(user?.language);
  const dateFormatter = new Intl.DateTimeFormat(getLanguageLocale(language), { dateStyle: "medium" });

  const [branches, eligibleStaff] = await Promise.all([
    prisma.branch.findMany({
      where: { businessId: business.id },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        address: true,
        contactPhone: true,
        isActive: true,
        createdAt: true,
        _count: { select: { staffAssignments: true } },
        staffAssignments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { businessId: business.id, isActive: true, role: "STAFF" },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
  ]);

  const createBranch = createBranchAction.bind(null, business.slug);
  const activeBranches = branches.filter((branch) => branch.isActive).length;
  const totalAssignments = branches.reduce((total, branch) => total + branch._count.staffAssignments, 0);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl" data-branches-administration="true">
        <Link
          href={`/businesses/${business.slug}`}
          className="inline-flex min-h-10 items-center text-sm font-semibold text-foreground-muted transition-colors hover:text-primary"
        >
          {t(language, `العودة إلى ${business.name}`, `Back to ${business.name}`)}
        </Link>

        <header className="relative mb-5 mt-4 overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-7">
          <div className="pointer-events-none absolute end-0 top-0 size-64 rounded-full bg-[radial-gradient(circle,var(--lf-primary-soft),transparent_68%)]" />
          <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                <Building2 className="size-4" aria-hidden="true" />
                {t(language, "إدارة مواقع التشغيل", "Operating locations")}
              </span>
              <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {t(language, "الفروع والإسنادات", "Branches & assignments")}
              </h1>
              <p className="mt-2 text-sm leading-6 text-foreground-muted">
                {t(language, "أضف فروع النشاط وحدد موظفي التشغيل المخولين بالعمل في كل فرع.", "Add business branches and assign the staff allowed to operate in each branch.")}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <BranchMetric label={t(language, "الإجمالي", "Total")} value={getBranchCount(branches)} />
              <BranchMetric label={t(language, "النشطة", "Active")} value={activeBranches} />
              <BranchMetric label={t(language, "الإسنادات", "Assignments")} value={totalAssignments} />
            </div>
          </div>
        </header>

        {query.success === "created" && <Notice tone="success">{t(language, "تم إنشاء الفرع بنجاح.", "Branch created successfully.")}</Notice>}
        {query.success === "updated" && <Notice tone="success">{t(language, "تم تحديث بيانات الفرع.", "Branch details updated.")}</Notice>}
        {query.success === "activated" && <Notice tone="success">{t(language, "تم تفعيل الفرع.", "Branch activated.")}</Notice>}
        {query.success === "deactivated" && <Notice tone="warning">{t(language, "تم إيقاف الفرع. لن تقبل عمليات الولاء الجديدة عليه.", "Branch deactivated. New loyalty operations will not be accepted there.")}</Notice>}
        {query.success === "assigned" && <Notice tone="success">{t(language, "تم إسناد الموظف إلى الفرع.", "Staff member assigned to the branch.")}</Notice>}
        {query.success === "assignment-removed" && <Notice tone="success">{t(language, "تمت إزالة إسناد الموظف بأمان.", "Staff assignment removed safely.")}</Notice>}
        {query.error === "invalid" && <Notice tone="error">{t(language, "راجع بيانات الفرع أو الاختيار المدخل.", "Review the branch data or selected value.")}</Notice>}
        {query.error === "duplicate-name" && <Notice tone="error">{t(language, "يوجد فرع آخر بالاسم نفسه في هذا النشاط.", "Another branch with the same name already exists in this business.")}</Notice>}
        {query.error === "duplicate-assignment" && <Notice tone="warning">{t(language, "هذا الموظف مسند إلى الفرع بالفعل.", "This staff member is already assigned to the branch.")}</Notice>}
        {query.error === "ineligible-user" && <Notice tone="error">{t(language, "يمكن إسناد موظف نشط من نفس النشاط فقط.", "Only an active staff member from this business can be assigned.")}</Notice>}
        {query.error === "not-found" && <Notice tone="error">{t(language, "الفرع أو الإسناد المطلوب غير موجود ضمن هذا النشاط.", "The requested branch or assignment was not found in this business.")}</Notice>}
        {query.error === "subscription-restricted" && (
          <Notice tone="warning">
            {t(language, "لا تسمح حالة الاشتراك الحالية بإضافة فرع أو تغيير بياناته أو حالته أو إسنادات موظفيه. تظل الفروع والبيانات الحالية متاحة للقراءة.", "The current subscription state does not allow adding a branch or changing its details, status, or staff assignments. Existing branches and data remain readable.")}
          </Notice>
        )}

        <details className="group mb-6 rounded-[var(--lf-radius-card)] border border-border bg-surface shadow-sm">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <span className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Plus className="size-5" aria-hidden="true" /></span>
              <span>
                <span className="block text-sm font-black text-foreground">{t(language, "إضافة فرع", "Add branch")}</span>
                <span className="mt-0.5 block text-xs text-foreground-subtle">{t(language, "اسم الفرع مطلوب، وباقي البيانات اختيارية.", "Branch name is required; the remaining details are optional.")}</span>
              </span>
            </span>
            <span className="text-lg font-bold text-primary transition-transform group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <form action={createBranch} className="grid gap-4 border-t border-border p-5 md:grid-cols-2 xl:grid-cols-4">
            <input name="name" required minLength={2} maxLength={80} placeholder={t(language, "اسم الفرع", "Branch name")} className={branchFieldClass} />
            <input name="contactPhone" maxLength={25} placeholder={t(language, "هاتف التواصل (اختياري)", "Contact phone (optional)")} className={branchFieldClass} />
            <input name="address" maxLength={250} placeholder={t(language, "العنوان (اختياري)", "Address (optional)")} className={branchFieldClass} />
            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--lf-radius-input)] bg-primary px-5 font-bold text-[var(--lf-primary-foreground)] transition-colors hover:bg-primary-hover">
              <Store className="size-4" aria-hidden="true" /> {t(language, "إضافة الفرع", "Add branch")}
            </button>
          </form>
        </details>

        <section className="space-y-4">
          {branches.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              {t(language, "لا توجد فروع بعد. يبقى مسار الموقع الواحد الحالي مدعومًا حتى تضيف فرعًا.", "No branches yet. The existing single-location path remains supported until you add one.")}
            </div>
          ) : (
            branches.map((branch) => {
              const assignedUserIds = new Set(branch.staffAssignments.map((assignment) => assignment.user.id));
              const availableStaff = eligibleStaff.filter((user) => !assignedUserIds.has(user.id));
              const updateBranch = updateBranchAction.bind(null, business.slug, branch.id);
              const setBranchStatus = setBranchStatusAction.bind(null, business.slug, branch.id, !branch.isActive);
              const assignStaff = assignStaffToBranchAction.bind(null, business.slug, branch.id);

              return (
                <article key={branch.id} data-branch-card="true" className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Store className="size-5" aria-hidden="true" /></span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-bold text-slate-950">{branch.name}</h2>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${branch.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                            {branch.isActive ? t(language, "نشط", "Active") : t(language, "موقوف", "Inactive")}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          {t(language, `أُنشئ في ${dateFormatter.format(branch.createdAt)} · ${branch._count.staffAssignments} موظف مسند`, `Created ${dateFormatter.format(branch.createdAt)} · ${branch._count.staffAssignments} staff assigned`)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-foreground-subtle">
                          {branch.contactPhone ? <span dir="ltr" className="inline-flex items-center gap-1.5"><Phone className="size-3.5 text-primary" aria-hidden="true" />{branch.contactPhone}</span> : null}
                          {branch.address ? <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5 text-primary" aria-hidden="true" />{branch.address}</span> : null}
                        </div>
                      </div>
                    </div>
                    <form action={setBranchStatus}>
                      <ConfirmSubmitButton
                        confirmation={branch.isActive
                          ? t(language, `إيقاف فرع ${branch.name}؟ لن يقبل عمليات ولاء أو إسنادات جديدة حتى إعادة تفعيله.`, `Deactivate ${branch.name}? It will not accept new loyalty operations or assignments until reactivated.`)
                          : t(language, `تفعيل فرع ${branch.name}؟`, `Activate ${branch.name}?`)}
                        type="submit"
                        className={`min-h-11 rounded-xl px-4 py-2 text-sm font-bold ${branch.isActive ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"}`}
                      >
                        {branch.isActive ? t(language, "إيقاف الفرع", "Deactivate branch") : t(language, "تفعيل الفرع", "Activate branch")}
                      </ConfirmSubmitButton>
                    </form>
                  </div>

                  <details className="group mt-4 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-foreground-muted">
                      <span className="inline-flex items-center gap-2"><UsersRound className="size-4 text-primary" aria-hidden="true" />{t(language, "إدارة بيانات الفرع والموظفين", "Manage branch details and staff")}</span>
                      <span className="text-primary transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                    </summary>
                    <div className="border-t border-border p-4">
                      <form action={updateBranch} className="grid gap-4 md:grid-cols-3">
                        <label className="text-sm font-bold text-slate-700">{t(language, "اسم الفرع", "Branch name")}<input name="name" required minLength={2} maxLength={80} defaultValue={branch.name} className={`${branchFieldClass} mt-2 font-normal`} /></label>
                        <label className="text-sm font-bold text-slate-700">{t(language, "هاتف التواصل", "Contact phone")}<input name="contactPhone" maxLength={25} defaultValue={branch.contactPhone ?? ""} className={`${branchFieldClass} mt-2 font-normal`} /></label>
                        <label className="text-sm font-bold text-slate-700">{t(language, "العنوان", "Address")}<input name="address" maxLength={250} defaultValue={branch.address ?? ""} className={`${branchFieldClass} mt-2 font-normal`} /></label>
                        <button type="submit" className="rounded-xl border border-violet-200 bg-violet-50 px-5 py-3 font-bold text-violet-700 transition hover:bg-violet-100 md:col-start-3">{t(language, "حفظ التعديلات", "Save changes")}</button>
                      </form>

                      <div className="mt-6 border-t border-slate-100 pt-5">
                        <h3 className="font-bold text-slate-950">{t(language, "إسنادات الموظفين", "Staff assignments")}</h3>
                        <p className="mt-1 text-sm text-slate-500">{t(language, "تُسند حسابات الموظفين النشطة فقط؛ المديرون والمشاهدون لا يحتاجون إسناد فرع.", "Only active staff accounts are assigned; managers and viewers do not require a branch assignment.")}</p>
                        {branch.staffAssignments.length > 0 && (
                          <ul className="mt-4 space-y-2">
                            {branch.staffAssignments.map((assignment) => {
                              const removeAssignment = removeStaffAssignmentAction.bind(null, business.slug, assignment.id);
                              return (
                                <li key={assignment.id} className="flex flex-col gap-3 rounded-xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                  <span className="text-sm text-slate-700"><strong>{fullName(assignment.user)}</strong>{" "}<span dir="ltr" className="text-slate-500">{assignment.user.email}</span></span>
                                  <form action={removeAssignment}>
                                    <ConfirmSubmitButton
                                      confirmation={t(language, `إزالة إسناد ${fullName(assignment.user)} من ${branch.name}؟`, `Remove ${fullName(assignment.user)} from ${branch.name}?`)}
                                      type="submit"
                                      className="min-h-11 text-sm font-bold text-red-700 hover:text-red-900"
                                    >
                                      {t(language, "إزالة الإسناد", "Remove assignment")}
                                    </ConfirmSubmitButton>
                                  </form>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {branch.isActive && availableStaff.length > 0 ? (
                          <form action={assignStaff} className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <select name="userId" required defaultValue="" className={`${branchFieldClass} min-w-0 flex-1`}>
                              <option value="" disabled>{t(language, "اختر موظفًا نشطًا لإسناده", "Choose an active staff member to assign")}</option>
                              {availableStaff.map((user) => <option key={user.id} value={user.id}>{fullName(user)} — {user.email}</option>)}
                            </select>
                            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--lf-radius-input)] bg-primary px-5 font-bold text-white transition-colors hover:bg-primary-hover">
                              <UserPlus className="size-4" aria-hidden="true" /> {t(language, "إسناد الموظف", "Assign staff")}
                            </button>
                          </form>
                        ) : branch.isActive ? (
                          <p className="mt-4 text-sm text-slate-500">{t(language, "لا توجد حسابات موظفين نشطة متاحة للإسناد.", "No active staff accounts are available for assignment.")}</p>
                        ) : (
                          <p className="mt-4 text-sm text-amber-700">{t(language, "لا يمكن إنشاء إسنادات جديدة لفرع موقوف.", "New assignments cannot be created for an inactive branch.")}</p>
                        )}
                      </div>
                    </div>
                  </details>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

function Notice({ children, tone }: { children: ReactNode; tone: "success" | "warning" | "error" }) {
  const className = tone === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-red-200 bg-red-50 text-red-800";
  return <div className={`mb-6 rounded-xl border px-4 py-3 ${className}`}>{children}</div>;
}

function BranchMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-[var(--lf-radius-input)] border border-border bg-surface/90 px-3 py-3 text-center">
      <p className="text-[11px] font-semibold text-foreground-subtle">{label}</p>
      <p className="lf-type-numeric mt-1 text-xl font-black text-foreground">{value}</p>
    </div>
  );
}
