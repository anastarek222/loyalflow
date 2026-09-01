import { Sparkles } from "lucide-react";

import { platformBrand } from "@/lib/platform-brand";
import { cn } from "@/lib/utils";

type BrandMarkFallback = "sparkles" | "letters";

type PlatformBrandIdentityProps = {
  fallback?: BrandMarkFallback;
  fallbackText?: string;
  markClassName?: string;
  markImageClassName?: string;
  wordmarkClassName?: string;
  textClassName?: string;
  showWordmark?: boolean;
  locale?: "ar" | "en" | "AR" | "EN";
};

export function PlatformBrandIdentity({
  fallback = "letters",
  fallbackText = platformBrand.name,
  markClassName,
  markImageClassName,
  wordmarkClassName,
  textClassName,
  showWordmark = true,
  locale = "en",
}: PlatformBrandIdentityProps) {
  const wordmark = locale.toLowerCase() === "ar"
    ? platformBrand.assets.wordmarkAr
    : platformBrand.assets.wordmark;

  return (
    <>
      <span
        className={cn("shrink-0", markClassName)}
        aria-hidden="true"
        data-platform-brand-mark={platformBrand.assets.mark ? "asset" : fallback}
      >
        {platformBrand.assets.mark ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={platformBrand.assets.mark}
            alt=""
            className={cn("h-full w-full object-contain", markImageClassName)}
          />
        ) : fallback === "sparkles" ? (
          <Sparkles className="size-[1em]" />
        ) : (
          platformBrand.iconMark
        )}
      </span>
      {showWordmark ? (
        wordmark ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={wordmark}
            alt={platformBrand.name}
            className={cn("block max-w-full object-contain", wordmarkClassName)}
            data-platform-brand-wordmark="asset"
          />
        ) : (
          <span
            className={textClassName}
            data-platform-brand-wordmark="fallback"
          >
            {fallbackText}
          </span>
        )
      ) : null}
    </>
  );
}
