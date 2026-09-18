import { PublicStateShell } from "@/components/public/public-state-shell";

export default function PublicNotFound() {
  return (
    <PublicStateShell
      titleEn="Registration unavailable"
      titleAr="التسجيل غير متاح"
      descriptionEn="This loyalty programme is unavailable right now. Please contact the business directly."
      descriptionAr="برنامج الولاء هذا غير متاح حاليًا. تواصل مع النشاط مباشرة للحصول على المساعدة."
      actionHref="/"
      actionEn="Back to Tanee"
      actionAr="العودة إلى Tanee"
    />
  );
}
