"use client";

import { useFormStatus } from "react-dom";

type Props = {
  language: "AR" | "EN";
  messages: {
    whatsappWelcomeMessage: string;
    whatsappBalanceMessage: string;
    whatsappRewardMessage: string;
  };
  status: "saved" | "invalid" | "subscription-restricted" | undefined;
  action: (formData: FormData) => void | Promise<void>;
};

const inputClass =
  "w-full resize-y rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10";

function SaveButton({ language }: { language: "AR" | "EN" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-7 min-h-12 w-full rounded-[var(--lf-radius-input)] bg-primary px-6 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60 sm:w-auto"
    >
      {pending
        ? language === "AR"
          ? "جارٍ الحفظ…"
          : "Saving…"
        : language === "AR"
          ? "حفظ الرسائل التلقائية"
          : "Save automatic messages"}
    </button>
  );
}

export function CustomerMessagesForm({
  language,
  messages,
  status,
  action,
}: Props) {
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
  const fields = [
    [
      "whatsappWelcomeMessage",
      t("رسالة الترحيب التلقائية", "Automatic welcome message"),
      messages.whatsappWelcomeMessage,
    ],
    [
      "whatsappBalanceMessage",
      t("رسالة تحديث الرصيد التلقائية", "Automatic balance update message"),
      messages.whatsappBalanceMessage,
    ],
    [
      "whatsappRewardMessage",
      t("رسالة المكافأة التلقائية", "Automatic reward message"),
      messages.whatsappRewardMessage,
    ],
  ] as const;

  return (
    <form
      action={action}
      className="rounded-[var(--lf-radius-card)] border border-border bg-white p-5 shadow-sm sm:p-8"
      data-customer-messages-form
      data-automatic-whatsapp-owner-messages
    >
      {status ? (
        <p
          role="status"
          aria-live="polite"
          className={`mb-5 rounded-[var(--lf-radius-input)] border px-4 py-3 text-sm font-semibold ${
            status === "saved"
              ? "border-success/30 bg-success-subtle text-success"
              : "border-danger/30 bg-danger-subtle text-danger"
          }`}
        >
          {status === "saved"
            ? t(
                "تم حفظ رسائل واتساب التلقائية الخاصة بالنشاط.",
                "Automatic WhatsApp messages for this business were saved.",
              )
            : status === "subscription-restricted"
              ? t(
                  "لا يمكن تعديل رسائل واتساب التلقائية في حالة الاشتراك الحالية.",
                  "Automatic WhatsApp messages cannot be changed in the current subscription state.",
                )
              : t(
                  "راجع رسائل واتساب التلقائية.",
                  "Review the automatic WhatsApp messages.",
                )}
        </p>
      ) : null}
      <h2 className="text-xl font-black text-foreground">
        {t("رسائل واتساب التلقائية", "Automatic WhatsApp messages")}
      </h2>
      <p className="mt-1 text-sm leading-6 text-foreground-subtle">
        {t(
          "الـOwner هو اللي بيحدد نص الرسائل التلقائية الخاصة بهذا النشاط. Tanee لا ينشئ ولا يستبدل محتوى الرسالة من عنده. يتم استخدام النص المحفوظ هنا فقط، مع متغيرات العميل والنشاط، ثم يمر عبر قالب Meta معتمد. الحدث الذي لا توجد له رسالة محفوظة من الـOwner لا يتم إرساله تلقائيًا.",
          "The Owner defines the automatic message copy for this business. Tanee does not invent or substitute message wording. Only the message saved here is rendered with customer and business variables, then delivered through an approved Meta template. An event without an Owner-saved message is not sent automatically.",
        )}
      </p>
      <p className="mt-2 text-xs leading-5 text-foreground-muted">
        {t(
          "أدوات الإرسال اليدوي في ملف العميل قد تعيد استخدام نفس النص، لكن تشغيل الإرسال التلقائي وحالة Meta تتم إدارتها من الإعدادات ← واتساب.",
          "Manual send tools on the customer profile may reuse the same copy, while automatic delivery and Meta readiness are managed in Settings → WhatsApp.",
        )}
      </p>
      <div className="mt-5 rounded-[var(--lf-radius-card)] border border-primary/10 bg-primary-subtle/50 p-4 text-sm text-primary">
        <p className="font-semibold">
          {t("المتغيرات المتاحة", "Available variables")}
        </p>
        <p className="mt-2 break-words font-mono text-xs">
          {
            "{customer} {business} {balance} {unit} {reward} {remaining} {card_link}"
          }
        </p>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {fields.map(([name, label, value]) => (
          <label
            key={name}
            className="block text-sm font-medium text-foreground-muted"
          >
            <span className="mb-2 block">{label}</span>
            <textarea
              name={name}
              defaultValue={value}
              dir="auto"
              rows={8}
              minLength={1}
              maxLength={1500}
              required
              className={inputClass}
            />
          </label>
        ))}
      </div>
      <SaveButton language={language} />
    </form>
  );
}
