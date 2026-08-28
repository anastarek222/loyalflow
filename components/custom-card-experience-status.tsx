type Props = {
  isArabic: boolean;
  status?: string;
};

type StatusCopy = {
  tone: "success" | "warning" | "danger";
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
  "missing-front": {
    tone: "danger",
    ar: "اختر ملف الواجهة الأمامية قبل إنشاء المسودة.",
    en: "Choose the Front artwork file before creating the draft.",
  },
  "missing-back": {
    tone: "danger",
    ar: "اختر ملف الواجهة الخلفية قبل إنشاء المسودة.",
    en: "Choose the Back artwork file before creating the draft.",
  },
  "unsupported-type": {
    tone: "danger",
    ar: "نوع الملف غير مدعوم. استخدم PNG أو JPEG أو WebP للجانبين.",
    en: "Unsupported file type. Use PNG, JPEG, or WebP for both sides.",
  },
  "pair-too-large": {
    tone: "danger",
    ar: "حجم الواجهة الأمامية والخلفية معًا أكبر من 4 ميجابايت.",
    en: "The combined Front + Back size is larger than 4 MB.",
  },
  "unreadable-image": {
    tone: "danger",
    ar: "تعذر قراءة أبعاد إحدى الصورتين. أعد تصدير الملفين ثم حاول مرة أخرى.",
    en: "One image's dimensions could not be read. Re-export both files and try again.",
  },
  "dimensions-mismatch": {
    tone: "danger",
    ar: "أبعاد البكسل غير متطابقة. يجب أن تكون الواجهة الأمامية والخلفية بنفس العرض والارتفاع تمامًا.",
    en: "Pixel dimensions do not match. Front and Back must have exactly the same width and height.",
  },
  "wrong-aspect-ratio": {
    tone: "danger",
    ar: "نسبة أبعاد التصميم غير صحيحة. استخدم نسبة بطاقة ID-1 القياسية (حوالي 1.586:1).",
    en: "The artwork has the wrong aspect ratio. Use the standard ID-1 card ratio (about 1.586:1).",
  },
};

export function CustomCardExperienceStatus({ isArabic, status }: Props) {
  const copy = status ? STATUS_COPY[status] : undefined;

  if (!copy) return null;

  const className =
    copy.tone === "success"
      ? "mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900"
      : copy.tone === "warning"
        ? "mt-4 rounded-xl border border-warning/30 bg-warning-subtle p-3 text-sm font-bold"
        : "mt-4 rounded-xl border border-danger/25 bg-danger-subtle p-3 text-sm font-bold text-danger";

  return (
    <p
      role={copy.tone === "success" ? "status" : "alert"}
      aria-live={copy.tone === "success" ? "polite" : undefined}
      className={className}
    >
      {isArabic ? copy.ar : copy.en}
    </p>
  );
}
