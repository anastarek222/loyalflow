import { Sparkles } from "lucide-react";

import { platformBrand } from "@/lib/platform-brand";
import { cn } from "@/lib/utils";

type BrandMarkFallback = "sparkles" | "letters";

type PlatformBrandIdentityProps = {
  fallback?: BrandMarkFallback;
  markClassName?: string;
  markImageClassName?: string;
  wordmarkClassName?: string;
  textClassName?: string;
  showWordmark?: boolean;
};

export function PlatformBrandIdentity({
  fallback = "letters",
  markClassName,
  markImageClassName,
  wordmarkClassName,
  textClassName,
  showWordmark = true,
}: PlatformBrandIdentityProps) {
  return (
    <>
      <span className={cn("shrink-0", markClassName)} aria-hidden="true">
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
        platformBrand.assets.wordmark ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={platformBrand.assets.wordmark}
            alt={platformBrand.name}
            className={cn("block max-w-full object-contain", wordmarkClassName)}
          />
        ) : (
          <span className={textClassName}>{platformBrand.name}</span>
        )
      ) : null}
    </>
  );
}
