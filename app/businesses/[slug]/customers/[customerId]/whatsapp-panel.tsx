import { randomUUID } from "node:crypto";

import { auth } from "@/auth";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import { canAccessBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getRewardAvailability } from "@/lib/rewards/availability";
import { getLatestWhatsAppMessageForCustomer } from "@/lib/server/integrations/whatsapp-message-history";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { sendManualCustomerWhatsAppAction } from "./whatsapp-actions";

type Props = {
  params: Promise<{ slug: string; customerId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

function canSendForRole(role: string) {
  return role === "OWNER" || role === "MANAGER" || role === "STAFF" || role === "SUPER_ADMIN";
}

export default async function CustomerWhatsAppPanel({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug, customerId } = await params;
  const query = await searchParams;
  const [business, user] = await Promise.all([
    prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        rewardName: true,
        rewardThreshold: true,
        whatsappWelcomeMessage: true,
        whatsappBalanceMessage: true,
        whatsappRewardMessage: true,
        rewards: {
          where: { isActive: true },
          select: { id: true, name: true, cost: true, isActive: true },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true },
    }),
  ]);
  if (!business) notFound();
  if (!canAccessBusiness(session.user, business.id)) redirect("/dashboard");

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId: business.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      isActive: true,
      balance: true,
      whatsappPhoneE164: true,
      whatsappOptInAt: true,
      whatsappOptedOutAt: true,
    },
  });
  if (!customer) notFound();

  const latest = await getLatestWhatsAppMessageForCustomer({
    businessId: business.id,
    customerId: customer.id,
  });
  const language = normalizeLanguage(user?.language);
  const locale = getLanguageLocale(language);
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
  const canSend = canSendForRole(session.user.role);
  const eligible =
    customer.isActive &&
    Boolean(customer.whatsappPhoneE164) &&
    Boolean(customer.whatsappOptInAt) &&
    !customer.whatsappOptedOutAt;
  const availability = getRewardAvailability({
    customerActive: customer.isActive,
    balance: customer.balance,
    rewardThreshold: business.rewardThreshold,
    fallbackReward: {
      name: business.rewardName,
      cost: business.rewardThreshold,
    },
    catalogueRewards: business.rewards,
  });
  const sendAction = sendManualCustomerWhatsAppAction.bind(
    null,
    business.slug,
    customer.id,
  );

  const eligibilityCopy = !customer.isActive
    ? t("العميل غير نشط — إرسال واتساب متوقف.", "Customer is inactive — WhatsApp delivery is disabled.")
    : customer.whatsappOptedOutAt
      ? t("العميل أوقف رسائل واتساب. لا يمكن تجاوز STOP يدويًا.", "The customer opted out of WhatsApp. STOP cannot be overridden manually.")
      : !customer.whatsappOptInAt
        ? t("لا توجد موافقة صريحة على واتساب بعد.", "There is no explicit WhatsApp consent yet.")
        : !customer.whatsappPhoneE164
          ? t("رقم واتساب يحتاج تصحيحًا قبل الإرسال.", "The WhatsApp phone needs correction before delivery.")
          : t("العميل مؤهل لإرسال واتساب اليدوي.", "The customer is eligible for manual WhatsApp delivery.");

  const feedback =
    query.success === "whatsapp-scheduled"
      ? t("تمت إضافة محاولة واتساب إلى طابور التوصيل.", "The WhatsApp delivery attempt was queued.")
      : query.success === "whatsapp-ineligible"
        ? t("لم تُرسل الرسالة لأن حالة العميل لم تعد مؤهلة.", "The message was not queued because the customer is no longer eligible.")
        : query.success === "whatsapp-reward-not-ready"
          ? t("لم تُرسل رسالة المكافأة لأن Reward Ready لم يعد متحققًا.", "The reward message was not queued because Reward Ready is no longer true.")
          : query.success === "whatsapp-subscription-restricted"
            ? t("حالة الاشتراك الحالية تمنع محاولة إرسال جديدة.", "The current subscription state blocks a new delivery attempt.")
            : query.success === "whatsapp-invalid"
              ? t("تعذر إنشاء محاولة واتساب بسبب بيانات غير صالحة.", "The WhatsApp attempt could not be created because the request was invalid.")
              : null;

  const latestStatus = latest
    ? latest.providerDeliveryStatus ?? latest.status
    : null;

  return (
    <section className="bg-surface-subtle px-3 pb-8 sm:px-8" data-whatsapp-customer-state>
      <div className="mx-auto max-w-7xl rounded-[var(--lf-radius-card)] border border-border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-success">
              WhatsApp
            </p>
            <h2 className="mt-1 text-lg font-black text-foreground">
              {t("حالة العميل والإرسال اليدوي", "Customer state & manual delivery")}
            </h2>
            <p className={`mt-2 text-sm font-semibold ${eligible ? "text-success" : "text-warning"}`}>
              {eligibilityCopy}
            </p>
          </div>
          <Link
            href={`/businesses/${business.slug}/whatsapp-history?customerId=${encodeURIComponent(customer.id)}`}
            className="rounded-[var(--lf-radius-input)] border border-border px-4 py-2 text-sm font-bold text-foreground"
          >
            {t("سجل واتساب", "WhatsApp history")}
          </Link>
        </div>

        {feedback ? (
          <div className="mt-4 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle p-3 text-sm font-semibold text-foreground">
            {feedback}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-black text-foreground">
              {t("آخر محاولة", "Latest attempt")}
            </p>
            {latest ? (
              <p className="mt-1 text-sm text-foreground-muted">
                {latest.payload.event.replaceAll("_", " ")} · {latestStatus} ·{" "}
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(latest.createdAt)}
              </p>
            ) : (
              <p className="mt-1 text-sm text-foreground-muted">
                {t("لا توجد محاولات واتساب مسجلة لهذا العميل.", "No WhatsApp attempts are recorded for this customer yet.")}
              </p>
            )}
          </div>

          {!customer.whatsappPhoneE164 && canSend ? (
            <a
              href="#customer-details"
              className="rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-2 text-center text-sm font-bold text-foreground"
            >
              {t("تصحيح الرقم", "Fix phone")}
            </a>
          ) : null}
        </div>

        {canSend && eligible ? (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
            {business.whatsappWelcomeMessage?.trim() ? (
              <form action={sendAction}>
                <input type="hidden" name="event" value="WELCOME" />
                <input type="hidden" name="requestId" value={randomUUID()} />
                <button type="submit" className="rounded-[var(--lf-radius-input)] bg-success px-4 py-2 text-sm font-bold text-white">
                  {t("إرسال ترحيب", "Send welcome")}
                </button>
              </form>
            ) : null}

            {business.whatsappBalanceMessage?.trim() ? (
              <form action={sendAction}>
                <input type="hidden" name="event" value="BALANCE_UPDATED" />
                <input type="hidden" name="requestId" value={randomUUID()} />
                <button type="submit" className="rounded-[var(--lf-radius-input)] bg-primary px-4 py-2 text-sm font-bold text-white">
                  {t("إرسال تحديث الرصيد", "Send balance update")}
                </button>
              </form>
            ) : null}

            {availability.rewardReady && business.whatsappRewardMessage?.trim() ? (
              <form action={sendAction}>
                <input type="hidden" name="event" value="REWARD_READY" />
                <input type="hidden" name="requestId" value={randomUUID()} />
                <button type="submit" className="rounded-[var(--lf-radius-input)] bg-warning-subtle px-4 py-2 text-sm font-bold text-foreground">
                  {t("إرسال Reward Ready", "Send Reward Ready")}
                </button>
              </form>
            ) : null}
          </div>
        ) : null}

        {!canSend ? (
          <p className="mt-5 border-t border-border pt-4 text-sm text-foreground-muted">
            {t("هذا الدور للقراءة فقط ولا يمكنه إنشاء محاولة إرسال.", "This role is read-only and cannot create a delivery attempt.")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
