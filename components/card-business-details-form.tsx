"use client";

import { updateBusinessCardDetailsCommandAction } from "@/app/businesses/[slug]/settings/card-details-action";
import { ContactRound, Save } from "lucide-react";
import { useParams } from "next/navigation";
import { useFormStatus } from "react-dom";

type CardBusinessDetailsFormProps = {
  contactPhone: string;
  address: string;
  cardTerms: string;
  language: "AR" | "EN";
  action: (formData: FormData) => void | Promise<void>;
};

function SaveCardDetailsButton({ language }: { language: "AR" | "EN" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--lf-radius-input)] bg-primary px-6 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60 sm:w-auto"
    >
      <Save className="size-4" aria-hidden="true" />
      {pending
        ? language === "AR"
          ? "جارٍ الحفظ…"
          : "Saving…"
        : language === "AR"
          ? "حفظ بيانات الكارت"
          : "Save card details"}
    </button>
  );
}

export default function CardBusinessDetailsForm({
  contactPhone,
  address,
  cardTerms,
  language,
}: CardBusinessDetailsFormProps) {
  const params = useParams<{ slug: string }>();
  const businessSlug = params.slug;
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);

  return (
    <form
      action={updateBusinessCardDetailsCommandAction}
      className="rounded-[var(--lf-radius-card)] border border-border bg-white p-5 shadow-sm sm:p-7"
      data-card-business-details="true"
    >
      <input type="hidden" name="businessSlug" value={businessSlug} />
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[var(--lf-radius-input)] bg-primary-soft text-primary">
          <ContactRound className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-primary">
            {t(
              "بيانات ثابتة لكل كروت النشاط",
              "Shared across every customer card",
            )}
          </p>
          <h2 className="mt-1 text-xl font-bold text-foreground">
            {t("بيانات الكارت والتواصل", "Card and contact details")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-foreground-subtle">
            {t(
              "أدخل هذه البيانات مرة واحدة لتظهر تلقائيًا في كل كروت عملاء النشاط.",
              "Enter these details once and they will appear automatically on every customer card.",
            )}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="contactPhone"
            className="mb-2 block text-sm font-medium text-foreground-muted"
          >
            {t("رقم الهاتف", "Phone number")}
          </label>

          <input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            defaultValue={contactPhone}
            required
            maxLength={25}
            placeholder="01033196610"
            className="min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-3 text-foreground outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
          />
        </div>

        <div>
          <label
            htmlFor="address"
            className="mb-2 block text-sm font-medium text-foreground-muted"
          >
            {t("العنوان", "Address")}
          </label>

          <input
            id="address"
            name="address"
            dir="auto"
            defaultValue={address}
            required
            maxLength={250}
            placeholder={t("١ شارع دكتور لاشين...", "1 Dr. Lasheen Street...")}
            className="min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-3 text-foreground outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      <div className="mt-6">
        <label
          htmlFor="cardTerms"
          className="mb-2 block text-sm font-medium text-foreground-muted"
        >
          {t("شروط الكارت", "Card terms")}
        </label>

        <textarea
          id="cardTerms"
          name="cardTerms"
          dir="auto"
          rows={5}
          required
          maxLength={1200}
          defaultValue={cardTerms}
          className="w-full resize-y rounded-[var(--lf-radius-input)] border border-border px-4 py-3 text-foreground outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
        />

        <p className="mt-2 text-xs leading-5 text-foreground-subtle">
          {t(
            "اكتب كل شرط في سطر منفصل ليظهر كعنصر مستقل في ظهر الكارت.",
            "Write each term on a separate line so it appears as its own item on the back of the card.",
          )}
        </p>

        <div className="mt-4 rounded-[var(--lf-radius-card)] border border-primary/30 bg-primary-subtle p-4 text-sm text-primary">
          <p className="font-bold">
            {t(
              "متغيرات يتم تحديثها تلقائيًا داخل الشروط:",
              "Variables updated automatically inside the terms:",
            )}
          </p>

          <div className="mt-4 flex flex-wrap gap-2 font-mono text-xs">
            <code className="rounded-[var(--lf-radius-input)] bg-white px-2 py-1">
              {"{reward}"}
            </code>

            <code className="rounded-[var(--lf-radius-input)] bg-white px-2 py-1">
              {"{threshold}"}
            </code>

            <code className="rounded-[var(--lf-radius-input)] bg-white px-2 py-1">
              {"{unit}"}
            </code>

            <code className="rounded-[var(--lf-radius-input)] bg-white px-2 py-1">
              {"{earn}"}
            </code>
          </div>

          <p className="mt-4 text-xs leading-5">
            {t("مثال: عند الوصول إلى", "Example: at")} {"{threshold}"}{" "}
            {"{unit}"} {t("يحصل العميل على", "the customer earns")} {"{reward}"}
            .
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[var(--lf-radius-card)] border border-info/30 bg-info-subtle p-4 text-sm leading-6 text-info">
        {t(
          "اسم المكافأة والعدد المطلوب تتم إدارتهما من مساحة برنامج الولاء، لذلك لا تحتاج لتعديل بيانات الكارت عند تغيير المكافأة.",
          "Reward name and threshold are managed from the Loyalty Program workspace, so card details do not need editing when the reward changes.",
        )}
      </div>

      <SaveCardDetailsButton language={language} />
    </form>
  );
}
