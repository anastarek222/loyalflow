"use client";

import { useFormStatus } from "react-dom";

type Props = {
  language: "AR" | "EN";
  messages: {
    whatsappWelcomeMessage: string;
    whatsappBalanceMessage: string;
    whatsappRewardMessage: string;
  };
  status: "saved" | "invalid" | undefined;
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
          ? "حفظ رسائل العملاء"
          : "Save customer messages"}
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
      t("رسالة الترحيب", "Welcome message"),
      messages.whatsappWelcomeMessage,
    ],
    [
      "whatsappBalanceMessage",
      t("رسالة تحديث الرصيد", "Balance update message"),
      messages.whatsappBalanceMessage,
    ],
    [
      "whatsappRewardMessage",
      t("رسالة جاهزية المكافأة", "Reward-ready message"),
      messages.whatsappRewardMessage,
    ],
  ] as const;

  return (
    <form
      action={action}
      className="rounded-[var(--lf-radius-card)] border border-border bg-white p-5 shadow-sm sm:p-8"
      data-customer-messages-form
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
            ? t("تم حفظ رسائل العملاء.", "Customer messages saved.")
            : t("راجع رسائل العملاء.", "Review the customer messages.")}
        </p>
      ) : null}
      <h2 className="text-xl font-black text-foreground">
        {t("رسائل العملاء", "Customer messages")}
      </h2>
      <p className="mt-1 text-sm text-foreground-subtle">
        {t(
          "يتم التحقق من هذه القوالب فقط عند حفظ هذا القسم.",
          "These templates are validated only when this section is saved.",
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
