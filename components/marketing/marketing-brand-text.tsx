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
            className={cn(
              "mx-[0.08em] inline-flex translate-y-[0.08em] align-baseline leading-none",
              className,
            )}
          >
            <PlatformBrandIdentity
              showMark={false}
              themeAdaptiveWordmark
              fallbackText="Tanee"
              wordmarkClassName="h-[0.9em] w-auto max-w-none"
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
