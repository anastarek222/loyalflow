import { randomUUID } from "node:crypto";
import { ManualWhatsAppSendButton } from "@/components/manual-whatsapp-send-button";

import { auth } from "@/auth";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import { canAccessBusiness, canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getRewardAvailability } from "@/lib/rewards/availability";
import { getWhatsAppMessageHistoryPage } from "@/lib/server/integrations/whatsapp-message-history";
import { getBusinessWhatsAppManualReadiness } from "@/lib/server/integrations/whatsapp-manual-readiness";
import { renderWhatsAppTemplate } from "@/lib/whatsapp-templates";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  confirmCustomerWhatsAppPhoneAction,
  sendManualCustomerWhatsAppAction,
} from "./whatsapp-actions";

type Props = {
  params: Promise<{ slug: string; customerId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
  embedded?: boolean;
};

export default async function CustomerWhatsAppPanel({
  params,
  searchParams,
  embedded = false,
}: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug, customerId } = await params;
  const query = await searchParams;
  const [business, user] = await Promise.all([
    prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        unitName: true,
        rewardName: true,
        rewardThreshold: true,
        whatsappWelcomeMessage: true,
        whatsappBalanceMessage: true,
        whatsappRewardMessage: true,
        whatsappRedeemedMessage: true,
        cardDefaultLanguage: true,
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
      phone: true,
      publicToken: true,
      isActive: true,
      balance: true,
      whatsappPhoneE164: true,
      whatsappOptInAt: true,
      whatsappOptedOutAt: true,
    },
  });
  if (!customer) notFound();

  const history = await getWhatsAppMessageHistoryPage({
    businessId: business.id,
    customerId: customer.id,
    pageSize: 5,
  });
  const latest = history.entries[0] ?? null;
  const latestRedemption = await prisma.rewardRedemption.findFirst({
    where: { businessId: business.id, customerId: customer.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { rewardName: true },
  });
  const manualReadiness = await getBusinessWhatsAppManualReadiness(prisma, {
    businessId: business.id,
    language: business.cardDefaultLanguage,
    messages: {
      whatsappWelcomeMessage: business.whatsappWelcomeMessage,
      whatsappBalanceMessage: business.whatsappBalanceMessage,
      whatsappRewardMessage: business.whatsappRewardMessage,
      whatsappRedeemedMessage: business.whatsappRedeemedMessage,
      newRewardMessage: null,
      newOfferMessage: null,
    },
  });
  const language = normalizeLanguage(user?.language);
  const locale = getLanguageLocale(language);
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
  const canSend = canPerform(session.user, business.id, "CUSTOMERS_EDIT");
  const whatsappPhoneMatchesCustomer =
    Boolean(customer.whatsappPhoneE164) &&
    customer.whatsappPhoneE164 === customer.phone;
  const eligible =
    customer.isActive &&
    whatsappPhoneMatchesCustomer &&
    Boolean(customer.whatsappOptInAt) &&
    !customer.whatsappOptedOutAt;
  const canReconfirmConsent =
    canSend &&
    customer.isActive &&
    !customer.whatsappOptedOutAt &&
    (!whatsappPhoneMatchesCustomer || !customer.whatsappOptInAt);
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
  const customerName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ");
  const maskedPhone = customer.phone.replace(/.(?=.{4})/g, "•");
  const previewContext = {
    customer: customerName,
    business: business.name,
    balance: customer.balance,
    unit: business.unitName,
    reward:
      availability.affordableRewards[0]?.name ??
      availability.defaultReward.name,
    remaining: availability.remaining,
    cardLink: `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? ""}/card/${customer.publicToken}`,
  };
  const confirmConsentAction = confirmCustomerWhatsAppPhoneAction.bind(
    null,
    business.slug,
    customer.id,
  );

  const eligibilityCopy = !customer.isActive
    ? t(
        "العميل غير نشط — إرسال واتساب متوقف.",
        "Customer is inactive — WhatsApp delivery is disabled.",
      )
    : customer.whatsappOptedOutAt
      ? t(
          "العميل أوقف رسائل واتساب. لا يمكن تجاوز STOP يدويًا.",
          "The customer opted out of WhatsApp. STOP cannot be overridden manually.",
        )
      : customer.whatsappPhoneE164 && !whatsappPhoneMatchesCustomer
        ? t(
            "رقم العميل اتغير. لازم تأكيد موافقة واتساب للرقم الحالي قبل الإرسال.",
            "The customer phone changed. Reconfirm WhatsApp consent for the current number before sending.",
          )
        : !customer.whatsappOptInAt
          ? t(
              "لا توجد موافقة صريحة على واتساب للرقم الحالي بعد.",
              "There is no explicit WhatsApp consent for the current number yet.",
            )
          : !customer.whatsappPhoneE164
            ? t(
                "رقم واتساب يحتاج تأكيدًا قبل الإرسال.",
                "The WhatsApp phone needs confirmation before delivery.",
              )
            : t(
                "العميل مؤهل لإرسال واتساب اليدوي.",
                "The customer is eligible for manual WhatsApp delivery.",
              );

  const feedback =
    query.success === "whatsapp-scheduled"
      ? t(
          "تمت إضافة محاولة واتساب إلى طابور التوصيل.",
          "The WhatsApp delivery attempt was queued.",
        )
      : query.success === "whatsapp-consent-confirmed"
        ? t(
            "تم ربط موافقة واتساب بالرقم الحالي للعميل.",
            "WhatsApp consent is now bound to the customer's current phone number.",
          )
        : query.success === "whatsapp-ineligible"
          ? t(
              "لم تُرسل الرسالة لأن حالة العميل لم تعد مؤهلة.",
              "The message was not queued because the customer is no longer eligible.",
            )
          : query.success === "whatsapp-reward-not-ready"
            ? t(
                "لم تُرسل رسالة المكافأة لأن Reward Ready لم يعد متحققًا.",
                "The reward message was not queued because Reward Ready is no longer true.",
              )
            : query.success === "whatsapp-subscription-restricted"
              ? t(
                  "حالة الاشتراك الحالية تمنع محاولة إرسال جديدة.",
                  "The current subscription state blocks a new delivery attempt.",
                )
              : query.success === "whatsapp-not-ready"
                ? t(
                    "إرسال واتساب غير جاهز لهذا النوع: راجع اتصال المرسل واعتماد القالب الحالي.",
                    "WhatsApp delivery is not ready for this message: check the sender connection and current template approval.",
                  )
                : query.success === "whatsapp-invalid"
                  ? t(
                      "تعذر إنشاء محاولة واتساب بسبب بيانات غير صالحة.",
                      "The WhatsApp attempt could not be created because the request was invalid.",
                    )
                  : null;

  const latestStatus = latest
    ? (latest.providerDeliveryStatus ?? latest.status)
    : null;

  return (
    <section
      id="customer-whatsapp"
      className={
        embedded
          ? "order-0 mt-3 scroll-mt-6 sm:mt-6"
          : "bg-surface-subtle px-3 pb-8 sm:px-8"
      }
      data-whatsapp-customer-state
      data-whatsapp-embedded={embedded ? "true" : "false"}
    >
      <div
        className={
          embedded
            ? "rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6"
            : "mx-auto max-w-7xl rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6"
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-success">
              WhatsApp
            </p>
            <h2 className="mt-1 text-lg font-black text-foreground">
              {t(
                "حالة واتساب والإجراءات",
                "WhatsApp status & actions",
              )}
            </h2>
            <p
              className={`mt-2 text-sm font-semibold ${eligible ? "text-success" : "text-warning"}`}
            >
              {eligibilityCopy}
            </p>
            <p className="mt-1 text-xs leading-5 text-foreground-muted">
              {t(
                "الرسائل التلقائية تخرج من أحداث النشاط نفسها. الأزرار بالأسفل إرسال يدوي اختياري فقط.",
                "Automatic messages are triggered by business events themselves. The buttons below are optional manual actions only.",
              )}
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

        {canReconfirmConsent ? (
          <div className="mt-4 rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle p-4">
            <p className="text-sm font-semibold text-foreground">
              {t(
                "استخدم التأكيد ده فقط بعد ما العميل يوافق صراحةً على استقبال رسائل واتساب على رقمه الحالي.",
                "Use this only after the customer explicitly agreed to receive WhatsApp messages at their current phone number.",
              )}
            </p>
            <form action={confirmConsentAction} className="mt-3">
              <button
                type="submit"
                className="rounded-[var(--lf-radius-input)] bg-success px-4 py-2 text-sm font-bold text-white"
              >
                {t(
                  "تأكيد موافقة العميل للرقم الحالي",
                  "Confirm customer consent for current phone",
                )}
              </button>
            </form>
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-black text-foreground">
              {t("آخر محاولة", "Latest attempt")}
            </p>
            {latest ? (
              <p className="mt-1 text-sm text-foreground-muted">
                {latest.payload.event.replaceAll("_", " ")} ·{" "}
                {latest.payload.deliveryMode === "MANUAL"
                  ? t("يدوي", "Manual")
                  : t("تلقائي", "Automatic")}{" "}
                · {latestStatus} ·{" "}
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(latest.createdAt)}
              </p>
            ) : (
              <p className="mt-1 text-sm text-foreground-muted">
                {t(
                  "لا توجد محاولات واتساب مسجلة لهذا العميل.",
                  "No WhatsApp attempts are recorded for this customer yet.",
                )}
              </p>
            )}
          </div>
        </div>

        {history.entries.length > 0 ? (
          <div className="mt-4 grid gap-2 border-t border-border pt-4" data-whatsapp-customer-timeline>
            {history.entries.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-subtle px-3 py-2 text-xs">
                <span className="font-bold text-foreground">
                  {entry.payload.event.replaceAll("_", " ")}
                  {entry.payload.deliveryMode === "MANUAL" ? ` · ${t("يدوي", "Manual")}` : ` · ${t("تلقائي", "Automatic")}`}
                </span>
                <span className="text-foreground-muted">
                  {entry.providerDeliveryStatus ?? entry.status} · {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(entry.createdAt)}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {canSend && eligible && manualReadiness.readyEvents.length > 0 ? (
          <div className="mt-5 border-t border-border pt-5">
            <p className="text-sm font-black text-foreground">
              {t("إرسال يدوي اختياري", "Optional manual send")}
            </p>
            <p className="mt-1 text-xs leading-5 text-foreground-muted">
              {t(
                "استخدم الأزرار دي لو عايز تبعت رسالة يدويًا الآن. الأتمتة لا تعتمد عليها.",
                "Use these buttons only when you want to send a message manually now. Automations do not depend on them.",
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
            {manualReadiness.isEventReady("WELCOME") ? (
              <ManualWhatsAppSendButton action={sendAction} event="WELCOME" requestId={randomUUID()} label={t("إرسال ترحيب", "Send welcome")} customerName={customerName} maskedPhone={maskedPhone} preview={renderWhatsAppTemplate(business.whatsappWelcomeMessage ?? "", previewContext)} language={language} tone="success" />
            ) : null}

            {manualReadiness.isEventReady("BALANCE_UPDATED") ? (
              <ManualWhatsAppSendButton action={sendAction} event="BALANCE_UPDATED" requestId={randomUUID()} label={t("إرسال تحديث الرصيد", "Send balance update")} customerName={customerName} maskedPhone={maskedPhone} preview={renderWhatsAppTemplate(business.whatsappBalanceMessage ?? "", previewContext)} language={language} />
            ) : null}

            {availability.rewardReady &&
            manualReadiness.isEventReady("REWARD_READY") ? (
              <ManualWhatsAppSendButton action={sendAction} event="REWARD_READY" requestId={randomUUID()} label={t("إرسال Reward Ready", "Send Reward Ready")} customerName={customerName} maskedPhone={maskedPhone} preview={renderWhatsAppTemplate(business.whatsappRewardMessage ?? "", previewContext)} language={language} tone="warning" />
            ) : null}

            {latestRedemption &&
            manualReadiness.isEventReady("REWARD_REDEEMED") ? (
              <ManualWhatsAppSendButton
                action={sendAction}
                event="REWARD_REDEEMED"
                requestId={randomUUID()}
                label={t("إرسال تأكيد الاستبدال", "Send redemption confirmation")}
                customerName={customerName}
                maskedPhone={maskedPhone}
                preview={renderWhatsAppTemplate(
                  business.whatsappRedeemedMessage ?? "",
                  { ...previewContext, reward: latestRedemption.rewardName },
                )}
                language={language}
                tone="success"
              />
            ) : null}
            </div>
          </div>
        ) : null}

        {canSend && eligible && manualReadiness.readyEvents.length === 0 ? (
          <p className="mt-5 border-t border-border pt-4 text-sm font-semibold text-warning">
            {t(
              "الإرسال اليدوي غير جاهز: أكمل اتصال المرسل واعتماد قوالب Meta الحالية من إعدادات واتساب.",
              "Manual delivery is not ready: complete the sender connection and approve the current Meta templates in WhatsApp settings.",
            )}
          </p>
        ) : null}

        {!canSend ? (
          <p className="mt-5 border-t border-border pt-4 text-sm text-foreground-muted">
            {t(
              "هذا الدور للقراءة فقط ولا يمكنه إنشاء محاولة إرسال.",
              "This role is read-only and cannot create a delivery attempt.",
            )}
          </p>
        ) : null}
      </div>
    </section>
  );
}
