import { Fragment } from "react";

import { PlatformBrandIdentity } from "@/components/platform-brand-identity";
import { cn } from "@/lib/utils";

type MarketingBrandTextProps = {
  text: string;
  className?: string;
};

export function MarketingBrandText({
  text,
  className,
}: MarketingBrandTextProps) {
  const parts = text.split(/(Tanee)/g);

  return (
    <>
      {parts.map((part, index) =>
        part === "Tanee" ? (
          <span
            key={`brand-${index}`}
            dir="ltr"
            data-marketing-inline-wordmark=""
            className={cn(
              "mx-[0.08em] inline-block align-[-0.08em] leading-none",
              className,
            )}
          >
            <PlatformBrandIdentity
              showMark={false}
              themeAdaptiveWordmark
              fallbackText="Tanee"
              wordmarkClassName="h-full w-full max-w-none"
              wordmarkSize="compact"
            />
          </span>
        ) : (
          <Fragment key={`text-${index}`}>{part}</Fragment>
        ),
      )}
    </>
  );
}
