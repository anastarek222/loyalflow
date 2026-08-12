import { Gift, Plus, ShieldCheck, Sparkles, Tag, Timer } from "lucide-react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { GrowthShell } from "@/components/growth/growth-shell";
import {
  getExperienceModeCookieName,
  resolveExperienceMode,
} from "@/lib/experience-mode";
import { normalizeLanguage } from "@/lib/i18n";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getGrowthCopy } from "@/lib/growth/ui-copy";
import {
  createRewardAction,
  toggleRewardStatusAction,
  updateRewardAction,
} from "./actions";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};
const rewardType = (type: string, language: "AR" | "EN") =>
  ({
    GIFT: language === "AR" ? "هدية" : "Gift",
    PROMO_CODE: language === "AR" ? "كود ترويجي" : "Promo code",
    DISCOUNT: language === "AR" ? "خصم" : "Discount",
    CUSTOM: language === "AR" ? "مكافأة مخصصة" : "Custom reward",
  })[type] ?? type;

export default async function RewardsPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { slug } = await params;
  const query = await searchParams;
  const [user, business] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true, role: true, experienceAccess: true },
    }),
    prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        unitName: true,
        rewardName: true,
        rewardThreshold: true,
        rewards: { orderBy: [{ isActive: "desc" }, { cost: "asc" }] },
      },
    }),
  ]);
  if (!business) notFound();
  if (!canManageBusiness(session.user, business.id))
    redirect(`/businesses/${business.slug}`);
  const language = normalizeLanguage(user?.language);
  const copy = getGrowthCopy(language);
  const experienceMode = resolveExperienceMode(
    (await cookies()).get(getExperienceModeCookieName(session.user.id))?.value,
    user?.role ?? session.user.role,
    user?.experienceAccess,
  );
  const simple = experienceMode === "SIMPLE";
  const createReward = createRewardAction.bind(null, business.slug);
  const activeRewardCount = business.rewards.filter(
    (reward) => reward.isActive,
  ).length;
  return (
    <GrowthShell
      slug={business.slug}
      businessName={business.name}
      area="rewards"
      language={language}
      experienceMode={experienceMode}
      title={copy.rewards}
      description={
        language === "AR"
          ? "كتالوج مكافآت واضح؛ الاستحقاق والصلاحية والاستبدال يظلّون في محرك الولاء المعتمد."
          : "A clear reward catalog; eligibility, expiry, and redemption stay in the reviewed loyalty engine."
      }
    >
      {query.success ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"
        >
          {language === "AR"
            ? "تم حفظ كتالوج المكافآت."
            : "Reward catalog saved."}
        </p>
      ) : null}
      {query.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900"
        >
          {language === "AR"
            ? "تعذر حفظ المكافأة. راجع البيانات وحاول مرة أخرى."
            : "We could not save this reward. Review the details and try again."}
        </p>
      ) : null}
      <section
        className="relative overflow-hidden rounded-[var(--lf-radius-card)] border border-primary/15 bg-gradient-to-br from-primary via-indigo-600 to-violet-700 p-5 text-white shadow-lg shadow-primary/10 sm:p-7"
        data-reward-catalog-overview
      >
        <div
          aria-hidden="true"
          className="absolute -end-14 -top-20 size-56 rounded-full border-[32px] border-white/5"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
              <Gift className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-2xl font-black">
              {language === "AR" ? "مكتبة المكافآت" : "Reward library"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/75">
              {language === "AR"
                ? "رتّب ما يستطيع العميل استبداله، واعرض التكلفة والصلاحية والحالة من مكان واحد."
                : "Organize what customers can redeem and review cost, expiry, and availability in one place."}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
            <Summary
              label={language === "AR" ? "نشطة" : "Active"}
              value={activeRewardCount}
            />
            <Summary
              label={language === "AR" ? "إجمالي الكتالوج" : "Catalog total"}
              value={business.rewards.length}
            />
            <Summary
              label={language === "AR" ? "الخيار الاحتياطي" : "Fallback"}
              value={`${business.rewardThreshold} ${business.unitName}`}
            />
          </div>
        </div>
      </section>

      {!simple ? (
        <details className="group overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-surface shadow-sm">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-surface-subtle sm:px-6">
            <span className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-primary-subtle text-primary">
                <Plus
                  className="size-5 transition group-open:rotate-45"
                  aria-hidden="true"
                />
              </span>
              <span>
                <span className="block text-sm font-bold text-foreground">
                  {language === "AR" ? "إضافة مكافأة" : "Add reward"}
                </span>
                <span className="mt-0.5 block text-xs text-foreground-subtle">
                  {language === "AR"
                    ? "أنشئ مكافأة جديدة فقط عند الحاجة."
                    : "Create a new reward only when you need one."}
                </span>
              </span>
            </span>
            <span className="rounded-full bg-primary-subtle px-3 py-1 text-xs font-bold text-primary">
              {language === "AR" ? "جديدة" : "New"}
            </span>
          </summary>
          <form
            action={createReward}
            className="grid gap-4 border-t border-border bg-surface-subtle/60 p-5 sm:grid-cols-2 sm:p-6"
          >
            <Field
              name="name"
              label={language === "AR" ? "اسم المكافأة" : "Reward name"}
              required
            />
            <Field
              name="cost"
              type="number"
              label={`${language === "AR" ? "التكلفة" : "Cost"} (${business.unitName})`}
              required
            />
            <Field
              name="expiresAfterDays"
              type="number"
              label={
                language === "AR"
                  ? "أيام الصلاحية (اختياري)"
                  : "Expiry days (optional)"
              }
            />
            <label className="text-sm font-semibold text-foreground-muted">
              {language === "AR" ? "النوع" : "Type"}
              <select
                name="type"
                defaultValue="GIFT"
                className="mt-2 min-h-12 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-3 outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              >
                <option value="GIFT">Gift</option>
                <option value="PROMO_CODE">Promo code</option>
                <option value="DISCOUNT">Discount</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </label>
            <Field
              name="code"
              label={language === "AR" ? "الكود (اختياري)" : "Code (optional)"}
            />
            <label className="text-sm font-semibold text-foreground-muted">
              {language === "AR" ? "الوصف" : "Description"}
              <textarea
                name="description"
                rows={3}
                maxLength={300}
                className="mt-2 w-full rounded-[var(--lf-radius-input)] border border-border bg-white p-3 outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <button
              type="submit"
              className="min-h-12 rounded-[var(--lf-radius-input)] bg-primary px-5 font-bold text-white transition hover:bg-primary-hover sm:col-span-2"
            >
              {language === "AR" ? "إضافة مكافأة" : "Add reward"}
            </button>
          </form>
        </details>
      ) : null}
      <section aria-labelledby="reward-catalog-heading" data-reward-catalog>
        <div className="space-y-4">
          <div className="rounded-[var(--lf-radius-card)] border border-primary/10 bg-primary-subtle/50 p-4 text-sm text-primary">
            <div className="flex items-start gap-3">
              <ShieldCheck
                className="mt-0.5 size-5 shrink-0"
                aria-hidden="true"
              />
              <p>{copy.scanNote}</p>
            </div>
          </div>
          <div className="flex items-end justify-between gap-4 pt-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                {language === "AR" ? "الكتالوج" : "Catalog"}
              </p>
              <h2
                id="reward-catalog-heading"
                className="mt-1 text-xl font-black text-foreground"
              >
                {language === "AR" ? "المكافآت المتاحة" : "Available rewards"}
              </h2>
            </div>
            <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-bold text-foreground-muted">
              {business.rewards.length}
            </span>
          </div>
          {business.rewards.length === 0 ? (
            <Empty
              title={
                language === "AR"
                  ? "لا توجد مكافآت مضافة بعد"
                  : "No rewards have been added yet"
              }
              description={
                language === "AR"
                  ? "سيظل الخيار الاحتياطي الحالي متاحًا وفق قواعد الولاء الحالية."
                  : "The current fallback remains available under the existing loyalty rules."
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {business.rewards.map((reward) => (
                <article
                  key={reward.id}
                  className={`flex flex-col overflow-hidden rounded-[var(--lf-radius-card)] border bg-surface shadow-sm ${
                    reward.isActive
                      ? "border-primary/20"
                      : "border-border opacity-80"
                  }`}
                >
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${reward.isActive ? "bg-primary-subtle text-primary" : "bg-surface-subtle text-foreground-subtle"}`}
                        >
                          {reward.type === "PROMO_CODE" ? (
                            <Tag className="size-5" aria-hidden="true" />
                          ) : (
                            <Gift className="size-5" aria-hidden="true" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            <h3
                              dir="auto"
                              className="font-black text-foreground"
                            >
                              {reward.name}
                            </h3>
                            <Status
                              active={reward.isActive}
                              language={language}
                            />
                          </div>
                          <p className="mt-1 text-sm font-semibold text-primary">
                            {rewardType(reward.type, language)} · {reward.cost}{" "}
                            {business.unitName}
                          </p>
                          <p className="mt-3 flex items-center gap-2 text-sm text-foreground-subtle">
                            <Timer
                              className="size-4 shrink-0"
                              aria-hidden="true"
                            />
                            {reward.expiresAfterDays
                              ? language === "AR"
                                ? `تنتهي بعد ${reward.expiresAfterDays} يوم من الفتح`
                                : `Expires ${reward.expiresAfterDays} days after unlock`
                              : language === "AR"
                                ? "لا تنتهي بعد الفتح"
                                : "No expiry after unlock"}
                          </p>
                          {reward.description ? (
                            <p
                              dir="auto"
                              className="mt-3 text-sm leading-6 text-foreground-muted"
                            >
                              {reward.description}
                            </p>
                          ) : null}
                          {reward.code ? (
                            <p
                              dir="ltr"
                              className="mt-3 inline-flex rounded-lg border border-dashed border-primary/25 bg-primary-subtle/40 px-3 py-2 font-mono text-sm font-black tracking-wider text-primary"
                            >
                              {reward.code}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <form
                        action={toggleRewardStatusAction.bind(
                          null,
                          business.slug,
                          reward.id,
                          !reward.isActive,
                        )}
                      >
                        <button
                          type="submit"
                          className="min-h-11 rounded-[var(--lf-radius-input)] border border-border px-4 text-sm font-bold text-primary transition hover:border-primary/30 hover:bg-primary-subtle"
                        >
                          {reward.isActive
                            ? language === "AR"
                              ? "إيقاف"
                              : "Deactivate"
                            : language === "AR"
                              ? "تفعيل"
                              : "Activate"}
                        </button>
                      </form>
                    </div>
                  </div>
                  {!simple ? (
                    <details className="group border-t border-border bg-surface-subtle/60">
                      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 font-bold text-primary sm:px-6">
                        {language === "AR"
                          ? "تعديل الإعدادات"
                          : "Edit settings"}
                        <span
                          aria-hidden="true"
                          className="transition group-open:rotate-45"
                        >
                          +
                        </span>
                      </summary>
                      <form
                        action={updateRewardAction.bind(
                          null,
                          business.slug,
                          reward.id,
                        )}
                        className="grid gap-4 border-t border-border p-5 sm:grid-cols-2 sm:p-6"
                      >
                        <Field
                          name="name"
                          label={language === "AR" ? "الاسم" : "Name"}
                          defaultValue={reward.name}
                          required
                        />
                        <Field
                          name="cost"
                          type="number"
                          label={`${language === "AR" ? "التكلفة" : "Cost"} (${business.unitName})`}
                          defaultValue={String(reward.cost)}
                          required
                        />
                        <Field
                          name="expiresAfterDays"
                          type="number"
                          label={
                            language === "AR" ? "أيام الصلاحية" : "Expiry days"
                          }
                          defaultValue={
                            reward.expiresAfterDays?.toString() ?? ""
                          }
                        />
                        <label className="text-sm font-semibold text-slate-700">
                          {language === "AR" ? "النوع" : "Type"}
                          <select
                            name="type"
                            defaultValue={reward.type}
                            className="mt-1 min-h-11 w-full rounded-md border border-border bg-surface px-3"
                          >
                            <option value="GIFT">Gift</option>
                            <option value="PROMO_CODE">Promo code</option>
                            <option value="DISCOUNT">Discount</option>
                            <option value="CUSTOM">Custom</option>
                          </select>
                        </label>
                        <Field
                          name="code"
                          label={language === "AR" ? "الكود" : "Code"}
                          defaultValue={reward.code ?? ""}
                        />
                        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                          {language === "AR" ? "الوصف" : "Description"}
                          <textarea
                            name="description"
                            defaultValue={reward.description ?? ""}
                            maxLength={300}
                            rows={3}
                            className="mt-1 w-full rounded-md border border-border bg-surface p-3"
                          />
                        </label>
                        <button
                          type="submit"
                          className="min-h-11 rounded-md bg-primary px-4 font-semibold text-white sm:col-span-2"
                        >
                          {language === "AR" ? "حفظ التعديلات" : "Save changes"}
                        </button>
                      </form>
                    </details>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </GrowthShell>
  );
}
function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm sm:px-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/60 sm:text-xs">
        {label}
      </p>
      <p
        dir="auto"
        className="mt-1 truncate text-lg font-black text-white sm:text-xl"
      >
        {value}
      </p>
    </div>
  );
}
function Status({
  active,
  language,
}: {
  active: boolean;
  language: "AR" | "EN";
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${active ? "bg-success-subtle text-success" : "bg-surface-subtle text-foreground-muted"}`}
    >
      {active
        ? language === "AR"
          ? "نشطة"
          : "Active"
        : language === "AR"
          ? "غير نشطة"
          : "Inactive"}
    </span>
  );
}
function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        min={type === "number" ? 1 : undefined}
        maxLength={type === "text" ? 100 : undefined}
        dir={name === "code" ? "ltr" : undefined}
        className="mt-1 min-h-11 w-full rounded-md border border-border bg-surface px-3 text-slate-950"
      />
    </label>
  );
}
function Empty({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-[var(--lf-radius-card)] border border-dashed border-primary/25 bg-primary-subtle/30 p-8 text-center sm:p-12">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
        <Sparkles className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-black text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-foreground-muted">
        {description}
      </p>
    </section>
  );
}
