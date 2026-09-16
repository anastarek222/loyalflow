import { PublicStateShell } from "@/components/public/public-state-shell";

export default function PublicNotFound() {
  return (
    <PublicStateShell
      titleEn="Card unavailable"
      titleAr="البطاقة غير متاحة"
      descriptionEn="This loyalty card is unavailable or the link is no longer valid."
      descriptionAr="بطاقة الولاء هذه غير متاحة أو أن الرابط لم يعد صالحًا."
      actionHref="/"
      actionEn="Back to Tanee"
      actionAr="العودة إلى Tanee"
    />
  );
}
