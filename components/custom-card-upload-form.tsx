"use client";

import { useRef, useState } from "react";

import {
  CUSTOM_CARD_ALLOWED_TYPES,
  CUSTOM_CARD_MAX_PAIR_BYTES,
} from "@/lib/cards/custom-card-upload-validation";

type Language = "AR" | "EN";

type Props = {
  language: Language;
  action: (formData: FormData) => void | Promise<void>;
};

export function CustomCardUploadForm({ language, action }: Props) {
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);

  function validateSelection() {
    const front = frontRef.current?.files?.[0];
    const back = backRef.current?.files?.[0];
    const files = [front, back].filter((file): file is File => Boolean(file));

    if (
      files.some(
        (file) =>
          !CUSTOM_CARD_ALLOWED_TYPES.includes(
            file.type as (typeof CUSTOM_CARD_ALLOWED_TYPES)[number],
          ),
      )
    ) {
      setError(t("استخدم PNG أو JPEG أو WebP فقط.", "Use PNG, JPEG, or WebP only."));
      return false;
    }

    const totalBytes = files.reduce((total, file) => total + file.size, 0);
    if (totalBytes > CUSTOM_CARD_MAX_PAIR_BYTES) {
      setError(
        t(
          "حجم الواجهة الأمامية والخلفية معًا يجب ألا يتجاوز 4 ميجابايت.",
          "Front and Back together must not exceed 4 MB.",
        ),
      );
      return false;
    }

    setError("");
    return true;
  }

  return (
    <form
      action={action}
      onSubmit={(event) => {
        const front = frontRef.current?.files?.[0];
        const back = backRef.current?.files?.[0];
        if (!front || !back || !validateSelection()) {
          event.preventDefault();
          if (!front || !back) {
            setError(
              t(
                "اختر الواجهة الأمامية والخلفية قبل إنشاء المسودة.",
                "Choose both Front and Back before creating the draft.",
              ),
            );
          }
        }
      }}
      className="mt-5 grid gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">
          {t("الواجهة الأمامية · مطلوبة", "Front artwork · required")}
          <input
            ref={frontRef}
            required
            name="customCardFrontFile"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={validateSelection}
            className="mt-2 block w-full rounded-xl border border-border bg-white px-3 py-3 text-sm"
          />
        </label>
        <label className="text-sm font-bold">
          {t("الواجهة الخلفية · مطلوبة", "Back artwork · required")}
          <input
            ref={backRef}
            required
            name="customCardBackFile"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={validateSelection}
            className="mt-2 block w-full rounded-xl border border-border bg-white px-3 py-3 text-sm"
          />
        </label>
      </div>
      <p className="text-xs text-foreground-muted">
        {t(
          "PNG أو JPEG أو WebP · الملفان معًا بحد أقصى 4 ميجابايت · نفس أبعاد البكسل.",
          "PNG, JPEG, or WebP · 4 MB combined · identical pixel dimensions.",
        )}
      </p>
      {error ? (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger-subtle p-3 text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="w-fit rounded-[var(--lf-radius-input)] bg-primary px-5 py-3 font-black text-[var(--lf-primary-foreground)]"
      >
        {t("إنشاء مسودة الأمامية + الخلفية", "Create Front + Back draft")}
      </button>
    </form>
  );
}
