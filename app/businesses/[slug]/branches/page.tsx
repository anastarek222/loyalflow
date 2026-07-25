import { auth } from "@/auth";
import {
  canManageBranches,
  getBranchCount,
} from "@/lib/branches/management";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { AdministrationNavigation } from "@/components/administration/administration-navigation";
import { ConfirmSubmitButton } from "@/components/administration/confirm-submit-button";
import { normalizeLanguage } from "@/lib/i18n";
import { notFound, redirect } from "next/navigation";

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

const dateFormatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" });

function fullName(user: { firstName: string; lastName: string | null }) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ");
}

export default async function BranchesPage({ params, searchParams }: BranchesPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const query = await searchParams;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      secondaryColor: true,
      themePreset: true,
      cardStyle: true,
      fontFamily: true,
    },
  });
  if (!business) notFound();
  if (!canManageBranches(session.user, business.id)) redirect("/dashboard");

  const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { language: true } });
  const language = normalizeLanguage(currentUser?.language);
  const t = (ar: string, en: string) => language === "AR" ? ar : en;
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

  return (
    <main
      className="min-h-screen px-4 py-6 sm:px-8 sm:py-8"
    >
      <div className="mx-auto max-w-6xl">
        <AdministrationNavigation user={session.user} businessId={business.id} slug={business.slug} active="branches" language={language} />
        <Link href={`/businesses/${business.slug}`} className="text-sm font-medium text-primary hover:text-primary">
          {t("→ الرجوع إلى", "← Back to")} {business.name}
        </Link>

        <header className="mb-8 mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("إدارة الفروع", "Branch management")}</h1>
            <p className="mt-1 text-foreground-subtle">{t("أضف فروع النشاط، وحدد الموظفين المخولين بالعمل في كل فرع.", "Add business branches and assign the staff allowed to operate in each branch.")}</p>
          </div>
          <div className="rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 text-white">
            <span className="text-sm text-foreground-subtle">{t("إجمالي الفروع", "Total branches")}</span>
            <strong className="me-3 text-xl">{getBranchCount(branches)}</strong>
          </div>
        </header>

        {query.success === "created" && <Notice tone="success">{t("تم إنشاء الفرع بنجاح.", "Branch created successfully.")}</Notice>}
        {query.success === "updated" && <Notice tone="success">{t("تم تحديث بيانات الفرع.", "Branch details updated.")}</Notice>}
        {query.success === "activated" && <Notice tone="success">{t("تم تفعيل الفرع.", "Branch activated.")}</Notice>}
        {query.success === "deactivated" && <Notice tone="warning">{t("تم إيقاف الفرع. لن تقبل عمليات الولاء الجديدة عليه.", "Branch deactivated. New loyalty operations will not be accepted there.")}</Notice>}
        {query.success === "assigned" && <Notice tone="success">{t("تم إسناد الموظف إلى الفرع.", "Staff member assigned to branch.")}</Notice>}
        {query.success === "assignment-removed" && <Notice tone="success">{t("تمت إزالة إسناد الموظف بأمان.", "Staff assignment removed safely.")}</Notice>}
        {query.error === "invalid" && <Notice tone="error">{t("راجع بيانات الفرع أو الاختيار المدخل.", "Review the branch details or selected option.")}</Notice>}
        {query.error === "duplicate-name" && <Notice tone="error">{t("يوجد فرع آخر بالاسم نفسه في هذا النشاط.", "Another branch with the same name already exists in this business.")}</Notice>}
        {query.error === "duplicate-assignment" && <Notice tone="warning">{t("هذا الموظف مسند إلى الفرع بالفعل.", "This staff member is already assigned to the branch.")}</Notice>}
        {query.error === "ineligible-user" && <Notice tone="error">{t("يمكن إسناد موظف نشط من نفس النشاط فقط.", "Only an active staff member from the same business can be assigned.")}</Notice>}
        {query.error === "not-found" && <Notice tone="error">{t("الفرع أو الإسناد المطلوب غير موجود ضمن هذا النشاط.", "The requested branch or assignment does not exist in this business.")}</Notice>}

        <section className="mb-8 rounded-[var(--lf-radius-card)] border border-primary/30 bg-white p-6 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-foreground">{t("إضافة فرع", "Add branch")}</h2>
          <p className="mt-1 text-sm text-foreground-subtle">{t("كل الحقول اختيارية عدا اسم الفرع.", "All fields are optional except the branch name.")}</p>
          <form action={createBranch} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input name="name" required minLength={2} maxLength={80} placeholder={t("اسم الفرع", "Branch name")} className="rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30" />
            <input name="contactPhone" maxLength={25} placeholder={t("هاتف التواصل (اختياري)", "Contact phone (optional)")} className="rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30" />
            <input name="address" maxLength={250} placeholder={t("العنوان (اختياري)", "Address (optional)")} className="rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30" />
            <button type="submit" className={`rounded-[var(--lf-radius-input)] bg-primary text-[var(--lf-primary-foreground)] hover:bg-primary-hover rounded-[var(--lf-radius-input)] px-6 py-4 font-bold transition`}>
              {t("إضافة الفرع", "Add branch")}
            </button>
          </form>
        </section>

        <section className="space-y-6">
          {branches.length === 0 ? (
            <div className="rounded-[var(--lf-radius-card)] border border-dashed border-border bg-white p-10 text-center text-foreground-subtle">
              {t("لا توجد فروع بعد. يبقى مسار الموقع الواحد الحالي مدعومًا حتى تضيف فرعًا.", "There are no branches yet. The current single-location flow remains supported until you add one.")}
            </div>
          ) : branches.map((branch) => {
            const assignedUserIds = new Set(branch.staffAssignments.map((assignment) => assignment.user.id));
            const availableStaff = eligibleStaff.filter((user) => !assignedUserIds.has(user.id));
            const updateBranch = updateBranchAction.bind(null, business.slug, branch.id);
            const setBranchStatus = setBranchStatusAction.bind(null, business.slug, branch.id, !branch.isActive);
            const assignStaff = assignStaffToBranchAction.bind(null, business.slug, branch.id);

            return (
              <article key={branch.id} className="rounded-[var(--lf-radius-card)] border border-border bg-white p-6 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-4">
                      <h2 className="text-xl font-bold text-foreground">{branch.name}</h2>
                      <span className={`rounded-full px-4 py-1 text-xs font-bold ${branch.isActive ? "bg-success-subtle text-success" : "bg-surface-subtle text-foreground-muted"}`}>
                        {branch.isActive ? t("نشط", "Active") : t("موقوف", "Inactive")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-foreground-subtle">
                      {t("أُنشئ في", "Created")} {dateFormatter.format(branch.createdAt)} · {branch._count.staffAssignments} {t("موظف مسند", "assigned staff")}
                    </p>
                  </div>
                  <form action={setBranchStatus}>
                    <ConfirmSubmitButton confirmation={branch.isActive ? t(`إيقاف فرع ${branch.name}؟ لن يقبل عمليات ولاء أو إسنادات جديدة حتى إعادة تفعيله.`, `Deactivate ${branch.name}? It will not accept new loyalty operations or assignments until reactivated.`) : t(`تفعيل فرع ${branch.name}؟`, `Activate ${branch.name}?`)} type="submit" className={`min-h-11 rounded-[var(--lf-radius-input)] px-4 py-2 text-sm font-bold ${branch.isActive ? "bg-warning-subtle text-warning hover:bg-warning-subtle" : "bg-success-subtle text-success hover:bg-success-subtle"}`}>
                      {branch.isActive ? t("إيقاف الفرع", "Deactivate branch") : t("تفعيل الفرع", "Activate branch")}
                    </ConfirmSubmitButton>
                  </form>
                </div>

                <form action={updateBranch} className="mt-6 grid gap-4 md:grid-cols-3">
                  <label className="text-sm font-bold text-foreground-muted">{t("اسم الفرع", "Branch name")}
                    <input name="name" required minLength={2} maxLength={80} defaultValue={branch.name} className="mt-2 w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 font-normal outline-none focus:border-primary/30" />
                  </label>
                  <label className="text-sm font-bold text-foreground-muted">{t("هاتف التواصل", "Contact phone")}
                    <input name="contactPhone" maxLength={25} defaultValue={branch.contactPhone ?? ""} className="mt-2 w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 font-normal outline-none focus:border-primary/30" />
                  </label>
                  <label className="text-sm font-bold text-foreground-muted">{t("العنوان", "Address")}
                    <input name="address" maxLength={250} defaultValue={branch.address ?? ""} className="mt-2 w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 font-normal outline-none focus:border-primary/30" />
                  </label>
                  <button type="submit" className="rounded-[var(--lf-radius-input)] border border-primary/30 bg-primary-subtle px-6 py-4 font-bold text-primary transition hover:bg-primary-subtle md:col-start-3">
                    {t("حفظ التعديلات", "Save changes")}
                  </button>
                </form>

                <div className="mt-6 border-t border-border pt-6">
                  <h3 className="font-bold text-foreground">{t("إسنادات الموظفين", "Staff assignments")}</h3>
                  <p className="mt-1 text-sm text-foreground-subtle">{t("تُسند حسابات الموظفين النشطة فقط؛ المديرون والمشاهدون لا يحتاجون إسناد فرع.", "Only active staff accounts are assigned; managers and viewers do not require branch assignment.")}</p>
                  {branch.staffAssignments.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {branch.staffAssignments.map((assignment) => {
                        const removeAssignment = removeStaffAssignmentAction.bind(null, business.slug, assignment.id);
                        return <li key={assignment.id} className="flex flex-col gap-4 rounded-[var(--lf-radius-input)] bg-surface-subtle px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-sm text-foreground-muted"><strong>{fullName(assignment.user)}</strong> <span dir="ltr" className="text-foreground-subtle">{assignment.user.email}</span></span>
                          <form action={removeAssignment}><ConfirmSubmitButton confirmation={`إزالة إسناد ${fullName(assignment.user)} من ${branch.name}؟`} type="submit" className="min-h-11 text-sm font-bold text-danger hover:text-danger">{t("إزالة الإسناد", "Remove assignment")}</ConfirmSubmitButton></form>
                        </li>;
                      })}
                    </ul>
                  )}
                  {branch.isActive && availableStaff.length > 0 ? (
                    <form action={assignStaff} className="mt-4 flex flex-col gap-4 sm:flex-row">
                      <select name="userId" required defaultValue="" className="min-w-0 flex-1 rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4">
                        <option value="" disabled>{t("اختر موظفًا نشطًا لإسناده", "Select an active staff member")}</option>
                        {availableStaff.map((user) => <option key={user.id} value={user.id}>{fullName(user)} — {user.email}</option>)}
                      </select>
                      <button type="submit" className="rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 font-bold text-white transition hover:bg-surface-subtle">{t("إسناد الموظف", "Assign staff member")}</button>
                    </form>
                  ) : branch.isActive ? (
                    <p className="mt-4 text-sm text-foreground-subtle">{t("لا توجد حسابات موظفين نشطة متاحة للإسناد.", "There are no active staff accounts available for assignment.")}</p>
                  ) : (
                    <p className="mt-4 text-sm text-warning">{t("لا يمكن إنشاء إسنادات جديدة لفرع موقوف.", "New assignments cannot be created for an inactive branch.")}</p>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function Notice({ children, tone }: { children: React.ReactNode; tone: "success" | "warning" | "error" }) {
  const className = tone === "success"
    ? "border-success/30 bg-success-subtle text-success"
    : tone === "warning"
      ? "border-warning/30 bg-warning-subtle text-warning"
      : "border-danger/30 bg-danger-subtle text-danger";
  return <div className={`mb-6 rounded-[var(--lf-radius-input)] border px-4 py-4 ${className}`}>{children}</div>;
}
