import Image from "next/image";
import type { SupportedLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function TaneeLogo({
  locale,
  className,
}: {
  locale: SupportedLocale;
  className?: string;
}) {
  const isArabic = locale === "ar";
  return (
    <Image
      src={isArabic ? "/brand/tanee-logo-ar.webp" : "/brand/tanee-logo-en.webp"}
      alt={isArabic ? "تاني" : "Tanee"}
      width={isArabic ? 180 : 180}
      height={isArabic ? 66 : 46}
      className={cn("h-9 w-auto object-contain", className)}
      priority
    />
  );
}
