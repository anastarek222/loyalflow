import { randomUUID } from "node:crypto";

import { auth } from "@/auth";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import { canAccessBusiness, canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  AUTOMATIC_CUSTOMER_MESSAGE_EVENTS,
  type AutomaticCustomerMessageEvent,
} from "@/lib/server/integrations/customer-messaging";
import {
  getWhatsAppMessageHistoryPage,
  parseWhatsAppHistoryEvent,
  parseWhatsAppHistoryStatus,
  WHATSAPP_HISTORY_STATUSES,
  type WhatsAppHistoryEntry,
  type WhatsAppHistoryStatus,
} from "@/lib/server/integrations/whatsapp-message-history";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  resendWhatsAppDeliveryAction,
  retryWhatsAppDeliveryAction,
} from "../whatsapp-history/actions";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    customerId?: string;
    event?: string;
    status?: string;
    cursor?: string;
    recovery?: string;
  }>;
};

const EVENT_LABELS: Record<
  AutomaticCustomerMessageEvent,
  Readonly<{ ar: string; en: string }>
> = {
  WELCOME: { ar: "ترحيب", en: "Welcome" },
  BALANCE_UPDATED: { ar: "تحديث الرصيد", en: "Balance updated" },
  REWARD_READY: { ar: "مكافأة جاهزة", en: "Reward ready" },
  REWARD_REDEEMED: { ar: "تأكيد الاستبدال", en: "Reward redeemed" },
  NEW_REWARD: { ar: "مكافأة جديدة", en: "New reward" },
  NEW_OFFER: { ar: "عرض جديد", en: "New offer" },
};

const STATUS_LABELS: Record<
  WhatsAppHistoryStatus,
  Readonly<{ ar: string; en: string }>
> = {
  PENDING: { ar: "في الانتظار", en: "Queued" },
  PROCESSING: { ar: "جارٍ الإرسال", en: "Sending" },
  SUCCEEDED: { ar: "اكتملت المحاولة", en: "Attempt completed" },
  FAILED: { ar: "تعذر مؤقتًا", en: "Temporary issue" },
  DEAD: { ar: "يحتاج إجراء", en: "Action required" },
};

const SAFE_FAILURE_COPY: Record<string, Readonly<{ ar: string; en: string }>> = {
  WHATSAPP_INVALID_PHONE: {
    ar: "رقم واتساب غير صالح. صحح رقم العميل ثم حاول مرة أخرى.",
    en: "The WhatsApp number is invalid. Fix the customer phone, then try again.",
  },
  WHATSAPP_OWNER_MESSAGE_NOT_CONFIGURED: {
    ar: "نص هذه الرسالة غير مُعد بعد.",
    en: "This message copy is not configured yet.",
  },
  WHATSAPP_NOT_CONFIGURED: {
    ar: "ربط واتساب غير مكتمل.",
    en: "WhatsApp connection is not complete.",
  },
  WHATSAPP_WABA_NOT_CONFIGURED: {
    ar: "اتصال WhatsApp Business غير مكتمل.",
    en: "The WhatsApp Business connection is incomplete.",
  },
  WHATSAPP_META_TEMPLATE_BINDING_NOT_CONFIGURED: {
    ar: "هذه الرسالة لم تُجهز لدى Meta بعد.",
    en: "This message is not prepared in Meta yet.",
  },
  WHATSAPP_META_TEMPLATE_NOT_APPROVED: {
    ar: "هذه الرسالة ما زالت قيد مراجعة Meta.",
    en: "This message is still in Meta review.",
  },
  WHATSAPP_META_TEMPLATE_CONTENT_MISMATCH: {
    ar: "تم تعديل نص الرسالة بعد إرساله للمراجعة. راجع إعدادات WhatsApp.",
    en: "The message copy changed after review submission. Check WhatsApp settings.",
  },
  WHATSAPP_META_TEMPLATE_ACCOUNT_MISMATCH: {
    ar: "إعداد الرسالة لا يطابق اتصال WhatsApp الحالي.",
    en: "The message setup does not match the current WhatsApp connection.",
  },
  WHATSAPP_META_TEMPLATE_BINDING_INVALID: {
    ar: "إعداد الرسالة يحتاج مراجعة.",
    en: "The message setup needs attention.",
  },
  WHATSAPP_BUSINESS_CREDENTIAL_INVALID: {
    ar: "اتصال WhatsApp يحتاج إعادة ربط.",
    en: "The WhatsApp connection needs to be reconnected.",
  },
  WHATSAPP_NETWORK_ERROR: {
    ar: "تعذر الوصول إلى WhatsApp مؤقتًا.",
    en: "WhatsApp could not be reached temporarily.",
  },
};

function recoveryMessage(
  value: string | undefined,
  t: (ar: string, en: string) => string,
) {
  switch (value) {
    case "retry-scheduled":
      return t("تمت جدولة المحاولة مرة أخرى.", "The message was queued to try again.");
    case "resend-scheduled":
      return t("تم إنشاء محاولة إرسال جديدة.", "A new delivery attempt was created.");
    case "retry-unsafe":
      return t(
        "لا يمكن إعادة نفس المحاولة بعد قبولها لدى WhatsApp. استخدم إرسال مرة أخرى.",
        "The same attempt cannot be retried after WhatsApp accepted it. Use Send again.",
      );
    case "retry-conflict":
      return t("تغيرت حالة الرسالة. حدّث الصفحة وحاول مرة أخرى.", "The message state changed. Refresh and try again.");
    case "resend-in-flight":
      return t("الرسالة ما زالت قيد الإرسال.", "The message is still being sent.");
    case "resend-ineligible":
      return t(
        "الإرسال غير متاح الآن. راجع موافقة العميل ورقمه وإعدادات WhatsApp.",
        "Sending is not available now. Check customer consent, phone, and WhatsApp settings.",
      );
    case "subscription-restricted":
      return t("حالة الاشتراك الحالية تمنع إرسال رسالة جديدة.", "The current subscription state blocks a new message.");
    case "not-found":
      return t("لم يتم العثور على الرسالة.", "The message could not be found.");
    case "invalid-payload":
    case "invalid":
      return t("تعذر تنفيذ الطلب. حدّث الصفحة وحاول مرة أخرى.", "The request could not be completed. Refresh and try again.");
    default:
      return null;
  }
}

function canRecoverForRole(role: string) {
  return role === "OWNER" || role === "MANAGER" || role === "STAFF" || role === "SUPER_ADMIN";
}

function eligibilityLabel(
  entry: WhatsAppHistoryEntry,
  t: (ar: string, en: string) => string,
) {
  if (!entry.customerActive) return t("العميل غير نشط", "Customer inactive");
  if (entry.whatsappOptedOutAt) return t("أوقف رسائل واتساب", "Opted out");
  if (!entry.whatsappOptInAt) return t("لا توجد موافقة", "No consent");
  if (!entry.whatsappPhoneE164) return t("يحتاج تصحيح الرقم", "Fix phone");
  return t("مؤهل للإرسال", "Eligible");
}

function failureLabel(
  code: string | null,
  t: (ar: string, en: string) => string,
) {
  if (!code) return null;
  const mapped = SAFE_FAILURE_COPY[code];
  if (mapped) return t(mapped.ar, mapped.en);
  if (/^WHATSAPP_HTTP_\d{3}$/.test(code)) {
    return t("WhatsApp رفض محاولة الإرسال.", "WhatsApp rejected the delivery attempt.");
  }
  return t("تعذر إكمال محاولة الإرسال.", "The delivery attempt could not be completed.");
}

function deliveryLabel(
  entry: WhatsAppHistoryEntry,
  t: (ar: string, en: string) => string,
) {
  switch (entry.providerDeliveryStatus) {
    case "ACCEPTED":
      return t("تم القبول", "Accepted");
    case "SENT":
      return t("تم الإرسال", "Sent");
    case "DELIVERED":
      return t("تم التسليم", "Delivered");
    case "READ":
      return t("تمت القراءة", "Read");
    case "FAILED":
      return t("فشل الإرسال", "Delivery failed");
    case "OTHER":
      return t("جاري تحديث الحالة", "Status updating");
    default:
      return null;
  }
}

export default async function MessagesPage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const query = await searchParams;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
  if (!business) notFound();
  if (!canAccessBusiness(session.user, business.id)) redirect("/dashboard");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const language = normalizeLanguage(currentUser?.language);
  const locale = getLanguageLocale(language);
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
  const status = parseWhatsAppHistoryStatus(query.status);
  const event = parseWhatsAppHistoryEvent(query.event);
  const customerId = typeof query.customerId === "string" ? query.customerId.trim() : "";
  const history = await getWhatsAppMessageHistoryPage({
    businessId: business.id,
    customerId: customerId || null,
    status,
    event,
    cursor: query.cursor ?? null,
    pageSize: 20,
  });
  const canRecover = canRecoverForRole(session.user.role);
  const canManage = canManageBusiness(session.user, business.id);
  const showDiagnostics = session.user.role === "SUPER_ADMIN";
  const notice = recoveryMessage(query.recovery, t);
  const retryAction = retryWhatsAppDeliveryAction.bind(null, business.slug);
  const resendAction = resendWhatsAppDeliveryAction.bind(null, business.slug);

  const nextQuery = new URLSearchParams();
  if (customerId) nextQuery.set("customerId", customerId);
  if (event) nextQuery.set("event", event);
  if (status) nextQuery.set("status", status);
  if (history.nextCursor) nextQuery.set("cursor", history.nextCursor);

  return (
    <main className="min-h-screen bg-surface-subtle px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
              WhatsApp
            </p>
            <h1 className="mt-1 text-2xl font-black text-foreground">
              {t("الرسائل", "Messages")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted">
              {t(
                "تابع رسائل العملاء وحالة الإرسال والتسليم والقراءة، وتعامل مع الرسائل التي تحتاج إجراء.",
                "Track customer messages, delivery and read status, and handle messages that need attention.",
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/businesses/${business.slug}/customers`}
              className="rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2 text-sm font-bold text-foreground"
            >
              {t("العملاء", "Customers")}
            </Link>
            {canManage ? (
              <Link
                href={`/businesses/${business.slug}/settings/whatsapp`}
                className="rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2 text-sm font-bold text-foreground"
              >
                {t("إعدادات واتساب", "WhatsApp settings")}
              </Link>
            ) : null}
          </div>
        </header>

        {notice ? (
          <div className="rounded-[var(--lf-radius-input)] border border-border bg-white p-4 text-sm font-semibold text-foreground">
            {notice}
          </div>
        ) : null}

        <form
          method="get"
          className="grid gap-3 rounded-[var(--lf-radius-card)] border border-border bg-white p-4 sm:grid-cols-[1fr_1fr_auto]"
        >
          {customerId ? <input type="hidden" name="customerId" value={customerId} /> : null}
          <label className="grid gap-1 text-sm font-semibold text-foreground">
            {t("الحالة", "Status")}
            <select
              name="status"
              defaultValue={status ?? ""}
              className="min-h-11 rounded-[var(--lf-radius-input)] border border-border bg-white px-3"
            >
              <option value="">{t("كل الحالات", "All statuses")}</option>
              {WHATSAPP_HISTORY_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {t(STATUS_LABELS[value].ar, STATUS_LABELS[value].en)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-foreground">
            {t("نوع الرسالة", "Message type")}
            <select
              name="event"
              defaultValue={event ?? ""}
              className="min-h-11 rounded-[var(--lf-radius-input)] border border-border bg-white px-3"
            >
              <option value="">{t("كل الرسائل", "All messages")}</option>
              {AUTOMATIC_CUSTOMER_MESSAGE_EVENTS.map((value) => (
                <option key={value} value={value}>
                  {t(EVENT_LABELS[value].ar, EVENT_LABELS[value].en)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="min-h-11 self-end rounded-[var(--lf-radius-input)] bg-primary px-5 font-bold text-white"
          >
            {t("تطبيق", "Apply")}
          </button>
        </form>

        {customerId ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-foreground-muted">
              {t("تعرض الصفحة رسائل العميل الحالي فقط.", "Showing messages for the current customer only.")}
            </span>
            <Link
              href={`/businesses/${business.slug}/messages`}
              className="font-bold text-primary hover:underline"
            >
              {t("عرض كل الرسائل", "Show all messages")}
            </Link>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-white">
          {history.entries.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-bold text-foreground">
                {t("لا توجد رسائل مطابقة", "No matching messages")}
              </p>
              <p className="mt-1 text-sm text-foreground-muted">
                {t(
                  "ستظهر رسائل WhatsApp هنا بمجرد إنشاء محاولات إرسال للعملاء.",
                  "WhatsApp messages will appear here once customer delivery attempts are created.",
                )}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {history.entries.map((entry) => {
                const eligible =
                  entry.customerActive &&
                  Boolean(entry.whatsappPhoneE164) &&
                  Boolean(entry.whatsappOptInAt) &&
                  !entry.whatsappOptedOutAt;
                const safeRetry =
                  (entry.status === "FAILED" || entry.status === "DEAD") &&
                  !entry.providerMessageId &&
                  !entry.providerDeliveryStatus;
                const canResend =
                  entry.status !== "PENDING" &&
                  entry.status !== "PROCESSING" &&
                  eligible;
                const deliveryState = deliveryLabel(entry, t);
                const failure = failureLabel(entry.lastErrorCode, t);
                const statusCopy = STATUS_LABELS[entry.status];

                return (
                  <article
                    key={entry.id}
                    className="grid gap-4 p-5 lg:grid-cols-[1.1fr_1fr_auto] lg:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border px-2.5 py-1 text-xs font-black text-foreground">
                          {t(EVENT_LABELS[entry.payload.event].ar, EVENT_LABELS[entry.payload.event].en)}
                        </span>
                        <span className="text-xs font-bold text-foreground-muted">
                          {t(statusCopy.ar, statusCopy.en)}
                        </span>
                        {deliveryState ? (
                          <span className="text-xs font-bold text-primary">{deliveryState}</span>
                        ) : null}
                      </div>
                      <Link
                        href={`/businesses/${business.slug}/customers/${entry.payload.customerId}`}
                        className="mt-2 block font-black text-foreground hover:text-primary"
                      >
                        {entry.customerName}
                      </Link>
                      <p className="mt-1 text-xs text-foreground-muted">
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(entry.createdAt)}
                        {entry.attemptCount > 1
                          ? ` · ${t("المحاولات", "Attempts")}: ${entry.attemptCount}`
                          : ""}
                      </p>
                    </div>

                    <div className="space-y-1 text-sm">
                      <p className={eligible ? "font-bold text-success" : "font-bold text-warning"}>
                        {eligibilityLabel(entry, t)}
                      </p>
                      {failure ? <p className="text-foreground-muted">{failure}</p> : null}
                      {showDiagnostics && entry.providerMessageId ? (
                        <p className="break-all font-mono text-[11px] text-foreground-subtle">
                          Provider ID: {entry.providerMessageId}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {!eligible ? (
                        <Link
                          href={`/businesses/${business.slug}/customers/${entry.payload.customerId}`}
                          className="rounded-[var(--lf-radius-input)] border border-border px-3 py-2 text-sm font-bold text-foreground"
                        >
                          {t("راجع العميل", "Review customer")}
                        </Link>
                      ) : null}

                      {canRecover && safeRetry ? (
                        <form action={retryAction}>
                          <input type="hidden" name="jobId" value={entry.id} />
                          <button
                            type="submit"
                            className="rounded-[var(--lf-radius-input)] border border-border px-3 py-2 text-sm font-bold text-foreground"
                          >
                            {t("حاول مرة أخرى", "Try again")}
                          </button>
                        </form>
                      ) : null}

                      {canRecover && canResend ? (
                        <form action={resendAction}>
                          <input type="hidden" name="jobId" value={entry.id} />
                          <input type="hidden" name="requestId" value={randomUUID()} />
                          <button
                            type="submit"
                            className="rounded-[var(--lf-radius-input)] bg-primary px-3 py-2 text-sm font-bold text-white"
                          >
                            {t("إرسال مرة أخرى", "Send again")}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {history.nextCursor ? (
          <div className="flex justify-center">
            <Link
              href={`/businesses/${business.slug}/messages?${nextQuery.toString()}`}
              className="rounded-[var(--lf-radius-input)] border border-border bg-white px-5 py-3 text-sm font-bold text-foreground"
            >
              {t("الرسائل الأقدم", "Older messages")}
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
