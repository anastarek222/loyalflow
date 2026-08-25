"use client";

import { useSearchParams } from "next/navigation";

type Props = {
  isArabic: boolean;
};

type StatusCopy = {
  tone: "success" | "warning";
  ar: string;
  en: string;
};

const STATUS_COPY: Record<string, StatusCopy> = {
  draft: {
    tone: "success",
    ar: "تم إنشاء مسودة الواجهة الأمامية + الخلفية. راجع الجانبين في المعاينة أدناه، ثم انشر الزوج فقط بعد الموافقة عليه.",
    en: "Front + Back draft created. Review both sides in the preview below, then publish the pair only after approval.",
  },
  published: {
    tone: "success",
    ar: "تم نشر زوج الواجهة الأمامية + الخلفية بنجاح. تستخدم بطاقات العملاء الآن التصميم المعتمد المنشور.",
    en: "Front + Back pair published successfully. Customer cards now use the approved published artwork.",
  },
  "storage-unavailable": {
    tone: "warning",
    ar: "تخزين البطاقة المخصصة غير متاح حاليًا. لم يتم تغيير التصميم المنشور الحالي.",
    en: "Custom Card storage is currently unavailable. The existing published artwork was not changed.",
  },
};

export function CustomCardExperienceStatus({ isArabic }: Props) {
  const searchParams = useSearchParams();
  const status = searchParams.get("cardDesign");
  const copy = status ? STATUS_COPY[status] : undefined;

  if (!copy) return null;

  const className =
    copy.tone === "success"
      ? "mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900"
      : "mt-4 rounded-xl border border-warning/30 bg-warning-subtle p-3 text-sm font-bold";

  return (
    <p role="status" aria-live="polite" className={className}>
      {isArabic ? copy.ar : copy.en}
    </p>
  );
}
