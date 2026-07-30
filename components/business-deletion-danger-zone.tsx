"use client";

import { useActionState, useState } from "react";

import { Dialog } from "@/components/ui/dialog";

export type BusinessDeletionState = {
  error?: "business-name" | "confirmation-word" | "failed";
};

type Props = {
  action: (
    previousState: BusinessDeletionState,
    formData: FormData,
  ) => Promise<BusinessDeletionState>;
  businessName: string;
  language: "AR" | "EN";
};

const initialState: BusinessDeletionState = {};

export function BusinessDeletionDangerZone({
  action,
  businessName,
  language,
}: Props) {
  const [open, setOpen] = useState(false);
  const [typedBusinessName, setTypedBusinessName] = useState("");
  const [confirmationWord, setConfirmationWord] = useState("");
  const [state, formAction, pending] = useActionState(action, initialState);
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
  const confirmationMatches =
    typedBusinessName === businessName && confirmationWord === "DELETE";

  return (
    <section
      aria-labelledby="danger-zone-heading"
      className="mt-8 rounded-[var(--lf-radius-card)] border border-danger/30 bg-danger-subtle p-5 sm:p-6"
    >
      <h2 id="danger-zone-heading" className="text-xl font-black text-danger">
        {t("منطقة الخطر", "Danger Zone")}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground-muted">
        {t(
          "حذف النشاط نهائي ولا يمكن التراجع عنه. قد تُحذف بيانات العملاء وسجل الولاء والمكافآت وإعدادات النشاط بشكل دائم.",
          "Deleting this business is permanent and cannot be undone. Customers, loyalty history, rewards, and business configuration may be permanently removed.",
        )}
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 min-h-11 rounded-[var(--lf-radius-input)] bg-danger px-5 py-3 font-bold text-[var(--lf-inverse)] transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-danger/20"
      >
        {t("حذف النشاط", "Delete business")}
      </button>

      <Dialog
        open={open}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        title={t("حذف النشاط نهائيًا", "Permanently delete business")}
        description={t(
          `سيتم حذف ${businessName} وبياناته نهائيًا. هذه العملية غير قابلة للتراجع.`,
          `${businessName} and its data will be permanently deleted. This operation is irreversible.`,
        )}
        className="border border-danger/30"
      >
        <form action={formAction}>
          <div className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle p-4 text-sm leading-6 text-danger">
            {t(
              "سيتم حذف العملاء وسجل الولاء والمكافآت وإعدادات النشاط. لن تُحذف حسابات المستخدمين.",
              "Customers, loyalty history, rewards, and business configuration will be removed. User accounts will not be deleted.",
            )}
          </div>

          {state.error ? (
            <p role="alert" className="mt-4 text-sm font-bold text-danger">
              {state.error === "business-name"
                ? t(
                    "اسم النشاط غير مطابق تمامًا.",
                    "The business name does not match exactly.",
                  )
                : state.error === "confirmation-word"
                  ? t(
                      "اكتب DELETE بالأحرف الإنجليزية الكبيرة.",
                      "Enter DELETE using uppercase English letters.",
                    )
                  : t(
                      "تعذر حذف النشاط بأمان. لم يتم تطبيق حذف جزئي.",
                      "The business could not be deleted safely. No partial deletion was applied.",
                    )}
            </p>
          ) : null}

          <label className="mt-5 block text-sm font-bold text-foreground">
            {t(
              `اكتب اسم النشاط بالضبط: ${businessName}`,
              `Type the exact business name: ${businessName}`,
            )}
            <input
              name="businessName"
              value={typedBusinessName}
              onChange={(event) => setTypedBusinessName(event.target.value)}
              autoComplete="off"
              required
              className="mt-2 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 outline-none focus:border-danger/40 focus:ring-4 focus:ring-danger/10"
            />
          </label>

          <label className="mt-5 block text-sm font-bold text-foreground">
            {t(
              "اكتب DELETE للتأكيد",
              "Type DELETE to confirm",
            )}
            <input
              name="confirmationWord"
              value={confirmationWord}
              onChange={(event) => setConfirmationWord(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              required
              className="mt-2 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 font-mono outline-none focus:border-danger/40 focus:ring-4 focus:ring-danger/10"
            />
          </label>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={pending}
              onClick={() => setOpen(false)}
              className="min-h-11 rounded-[var(--lf-radius-input)] border border-border bg-white px-5 py-3 font-bold text-foreground-muted disabled:opacity-60"
            >
              {t("إلغاء", "Cancel")}
            </button>
            <button
              type="submit"
              disabled={!confirmationMatches || pending}
              className="min-h-11 rounded-[var(--lf-radius-input)] bg-danger px-5 py-3 font-bold text-[var(--lf-inverse)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending
                ? t("جارٍ الحذف…", "Deleting…")
                : t("حذف النشاط نهائيًا", "Permanently delete business")}
            </button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
