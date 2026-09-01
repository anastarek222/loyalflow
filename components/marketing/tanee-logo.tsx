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
      src={isArabic ? "/brand/tanee-logo-ar.png" : "/brand/tanee-logo-en.png"}
      alt={isArabic ? "تاني" : "Tanee"}
      width={isArabic ? 295 : 306}
      height={isArabic ? 108 : 79}
      className={cn("h-9 w-auto object-contain", className)}
      priority
    />
  );
}
