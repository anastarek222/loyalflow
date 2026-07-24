import { auth } from "@/auth";
import {
  canManageBranches,
  getBranchCount,
} from "@/lib/branches/management";
import prisma from "@/lib/prisma";
import { getBusinessTheme } from "@/lib/theme";
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

  const theme = getBusinessTheme(business);
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
      style={{ background: theme.backgroundColor, fontFamily: theme.fontFamily }}
      className="min-h-screen px-4 py-5 sm:px-8 sm:py-8"
    >
      <div className="mx-auto max-w-6xl">
        <AdministrationNavigation user={session.user} businessId={business.id} slug={business.slug} active="branches" language={language} />
        <Link href={`/businesses/${business.slug}`} className="text-sm font-medium text-violet-600 hover:text-violet-800">
          → الرجوع إلى {business.name}
        </Link>

        <header className="mb-8 mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">إدارة الفروع</h1>
            <p className="mt-1 text-slate-500">أضف فروع النشاط، وحدد الموظفين المخولين بالعمل في كل فرع.</p>
          </div>
          <div className="rounded-xl bg-slate-950 px-5 py-3 text-white">
            <span className="text-sm text-slate-400">إجمالي الفروع</span>
            <strong className="me-3 text-xl">{getBranchCount(branches)}</strong>
          </div>
        </header>

        {query.success === "created" && <Notice tone="success">تم إنشاء الفرع بنجاح.</Notice>}
        {query.success === "updated" && <Notice tone="success">تم تحديث بيانات الفرع.</Notice>}
        {query.success === "activated" && <Notice tone="success">تم تفعيل الفرع.</Notice>}
        {query.success === "deactivated" && <Notice tone="warning">تم إيقاف الفرع. لن تقبل عمليات الولاء الجديدة عليه.</Notice>}
        {query.success === "assigned" && <Notice tone="success">تم إسناد الموظف إلى الفرع.</Notice>}
        {query.success === "assignment-removed" && <Notice tone="success">تمت إزالة إسناد الموظف بأمان.</Notice>}
        {query.error === "invalid" && <Notice tone="error">راجع بيانات الفرع أو الاختيار المدخل.</Notice>}
        {query.error === "duplicate-name" && <Notice tone="error">يوجد فرع آخر بالاسم نفسه في هذا النشاط.</Notice>}
        {query.error === "duplicate-assignment" && <Notice tone="warning">هذا الموظف مسند إلى الفرع بالفعل.</Notice>}
        {query.error === "ineligible-user" && <Notice tone="error">يمكن إسناد موظف نشط من نفس النشاط فقط.</Notice>}
        {query.error === "not-found" && <Notice tone="error">الفرع أو الإسناد المطلوب غير موجود ضمن هذا النشاط.</Notice>}

        <section className="mb-8 rounded-3xl border border-violet-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-slate-950">إضافة فرع</h2>
          <p className="mt-1 text-sm text-slate-500">كل الحقول اختيارية عدا اسم الفرع.</p>
          <form action={createBranch} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input name="name" required minLength={2} maxLength={80} placeholder="اسم الفرع" className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500" />
            <input name="contactPhone" maxLength={25} placeholder="هاتف التواصل (اختياري)" className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500" />
            <input name="address" maxLength={250} placeholder="العنوان (اختياري)" className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500" />
            <button type="submit" className={`${theme.buttonClass} rounded-xl px-5 py-3 font-bold transition`}>
              إضافة الفرع
            </button>
          </form>
        </section>

        <section className="space-y-5">
          {branches.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              لا توجد فروع بعد. يبقى مسار الموقع الواحد الحالي مدعومًا حتى تضيف فرعًا.
            </div>
          ) : branches.map((branch) => {
            const assignedUserIds = new Set(branch.staffAssignments.map((assignment) => assignment.user.id));
            const availableStaff = eligibleStaff.filter((user) => !assignedUserIds.has(user.id));
            const updateBranch = updateBranchAction.bind(null, business.slug, branch.id);
            const setBranchStatus = setBranchStatusAction.bind(null, business.slug, branch.id, !branch.isActive);
            const assignStaff = assignStaffToBranchAction.bind(null, business.slug, branch.id);

            return (
              <article key={branch.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold text-slate-950">{branch.name}</h2>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${branch.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                        {branch.isActive ? "نشط" : "موقوف"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      أُنشئ في {dateFormatter.format(branch.createdAt)} · {branch._count.staffAssignments} موظف مسند
                    </p>
                  </div>
                  <form action={setBranchStatus}>
                    <ConfirmSubmitButton confirmation={branch.isActive ? `إيقاف فرع ${branch.name}؟ لن يقبل عمليات ولاء أو إسنادات جديدة حتى إعادة تفعيله.` : `تفعيل فرع ${branch.name}؟`} type="submit" className={`min-h-11 rounded-xl px-4 py-2 text-sm font-bold ${branch.isActive ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"}`}>
                      {branch.isActive ? "إيقاف الفرع" : "تفعيل الفرع"}
                    </ConfirmSubmitButton>
                  </form>
                </div>

                <form action={updateBranch} className="mt-5 grid gap-4 md:grid-cols-3">
                  <label className="text-sm font-bold text-slate-700">اسم الفرع
                    <input name="name" required minLength={2} maxLength={80} defaultValue={branch.name} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-violet-500" />
                  </label>
                  <label className="text-sm font-bold text-slate-700">هاتف التواصل
                    <input name="contactPhone" maxLength={25} defaultValue={branch.contactPhone ?? ""} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-violet-500" />
                  </label>
                  <label className="text-sm font-bold text-slate-700">العنوان
                    <input name="address" maxLength={250} defaultValue={branch.address ?? ""} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-violet-500" />
                  </label>
                  <button type="submit" className="rounded-xl border border-violet-200 bg-violet-50 px-5 py-3 font-bold text-violet-700 transition hover:bg-violet-100 md:col-start-3">
                    حفظ التعديلات
                  </button>
                </form>

                <div className="mt-6 border-t border-slate-100 pt-5">
                  <h3 className="font-bold text-slate-950">إسنادات الموظفين</h3>
                  <p className="mt-1 text-sm text-slate-500">تُسند حسابات الموظفين النشطة فقط؛ المديرون والمشاهدون لا يحتاجون إسناد فرع.</p>
                  {branch.staffAssignments.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {branch.staffAssignments.map((assignment) => {
                        const removeAssignment = removeStaffAssignmentAction.bind(null, business.slug, assignment.id);
                        return <li key={assignment.id} className="flex flex-col gap-3 rounded-xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-sm text-slate-700"><strong>{fullName(assignment.user)}</strong> <span dir="ltr" className="text-slate-500">{assignment.user.email}</span></span>
                          <form action={removeAssignment}><ConfirmSubmitButton confirmation={`إزالة إسناد ${fullName(assignment.user)} من ${branch.name}؟`} type="submit" className="min-h-11 text-sm font-bold text-red-700 hover:text-red-900">إزالة الإسناد</ConfirmSubmitButton></form>
                        </li>;
                      })}
                    </ul>
                  )}
                  {branch.isActive && availableStaff.length > 0 ? (
                    <form action={assignStaff} className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <select name="userId" required defaultValue="" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3">
                        <option value="" disabled>اختر موظفًا نشطًا لإسناده</option>
                        {availableStaff.map((user) => <option key={user.id} value={user.id}>{fullName(user)} — {user.email}</option>)}
                      </select>
                      <button type="submit" className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-slate-800">إسناد الموظف</button>
                    </form>
                  ) : branch.isActive ? (
                    <p className="mt-4 text-sm text-slate-500">لا توجد حسابات موظفين نشطة متاحة للإسناد.</p>
                  ) : (
                    <p className="mt-4 text-sm text-amber-700">لا يمكن إنشاء إسنادات جديدة لفرع موقوف.</p>
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
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-red-200 bg-red-50 text-red-800";
  return <div className={`mb-6 rounded-xl border px-4 py-3 ${className}`}>{children}</div>;
}
