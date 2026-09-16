"use client";

import { useFormStatus } from "react-dom";
import { getSuggestedWhatsAppTemplate } from "@/lib/whatsapp-templates";

type Props = {
  language: "AR" | "EN";
  messages: {
    whatsappWelcomeMessage: string;
    whatsappBalanceMessage: string;
    whatsappRewardMessage: string;
  };
  status: "saved" | "invalid" | "subscription-restricted" | undefined;
  action: (formData: FormData) => void | Promise<void>;
  returnTo?: "program" | "whatsapp";
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
          ? "حفظ رسائل واتساب"
          : "Save WhatsApp messages"}
    </button>
  );
}

export function CustomerMessagesForm({
  language,
  messages,
  status,
  action,
  returnTo = "program",
}: Props) {
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
  const fields = [
    [
      "whatsappWelcomeMessage",
      t("رسالة الترحيب", "Welcome message"),
      messages.whatsappWelcomeMessage ||
        getSuggestedWhatsAppTemplate(language, "WELCOME"),
    ],
    [
      "whatsappBalanceMessage",
      t("رسالة تحديث الرصيد", "Balance update message"),
      messages.whatsappBalanceMessage ||
        getSuggestedWhatsAppTemplate(language, "BALANCE_UPDATED"),
    ],
    [
      "whatsappRewardMessage",
      t("رسالة المكافأة", "Reward message"),
      messages.whatsappRewardMessage ||
        getSuggestedWhatsAppTemplate(language, "REWARD_READY"),
    ],
  ] as const;

  return (
    <form
      action={action}
      className="rounded-[var(--lf-radius-card)] border border-border bg-white p-5 shadow-sm sm:p-8"
      data-customer-messages-form
      data-whatsapp-owner-messages
    >
      <input type="hidden" name="returnTo" value={returnTo} />
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
                "تم حفظ رسائل واتساب الخاصة بالنشاط.",
                "WhatsApp messages for this business were saved.",
              )
            : status === "subscription-restricted"
              ? t(
                  "لا يمكن تعديل رسائل واتساب في حالة الاشتراك الحالية.",
                  "WhatsApp messages cannot be changed in the current subscription state.",
                )
              : t("راجع رسائل واتساب.", "Review the WhatsApp messages.")}
        </p>
      ) : null}
      <h2 className="text-xl font-black text-foreground">
        {t("رسائل واتساب", "WhatsApp messages")}
      </h2>
      <p className="mt-1 text-sm leading-6 text-foreground-subtle">
        {t(
          "دي هي نفس الرسائل في الحالتين: لو الموظف ضغط إرسال يدوي، Tanee يفتح نفس النص للعميل؛ ولو الإرسال التلقائي جاهز، Tanee يرسل نفس النص عند حدوث الحالة المناسبة. مفيش نسخة Manual ونسخة Automatic منفصلين، وTanee لا يؤلف نص بديل من عنده.",
          "These are the single source of truth for both modes. A manual send uses this exact saved copy, and automatic delivery uses the same copy when the matching event occurs. There are no separate Manual and Automatic message versions, and Tanee never invents substitute wording.",
        )}
      </p>
      <p className="mt-2 text-xs leading-5 text-foreground-muted">
        {t(
          "سيب أي رسالة فاضية لو مش عايز الحالة دي تبعت تلقائيًا. تفعيل الإرسال التلقائي وحالة موافقة Meta تتم إدارتهم من الإعدادات ← واتساب.",
          "Leave a message blank to disable automatic delivery for that case. Automatic delivery readiness and Meta approval are managed in Settings → WhatsApp.",
        )}
      </p>
      <p className="mt-2 text-xs font-semibold text-success">
        {t(
          "لو الرسالة لم تُحفظ من قبل، يظهر قالب مقترح جاهز ويمكن تعديله قبل الحفظ.",
          "When no copy has been saved yet, a ready suggested draft appears and can be edited before saving.",
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
              maxLength={1500}
              className={inputClass}
            />
          </label>
        ))}
      </div>
      <SaveButton language={language} />
    </form>
  );
}
