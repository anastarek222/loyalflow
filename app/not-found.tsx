import { PublicStateShell } from "@/components/public/public-state-shell";

export default function NotFoundPage() {
  return (
    <PublicStateShell
      titleEn="Page not found"
      titleAr="الصفحة غير موجودة"
      descriptionEn="The page you requested does not exist or may have moved."
      descriptionAr="الصفحة التي طلبتها غير موجودة أو ربما تم نقلها."
      actionHref="/"
      actionEn="Back to Tanee"
      actionAr="العودة إلى Tanee"
    />
  );
}
