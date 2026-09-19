import { Fragment } from "react";

import { InlineTaneeName } from "@/components/brand/inline-tanee-name";
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
          <InlineTaneeName
            key={`brand-${index}`}
            className={cn("mx-[0.04em]", className)}
          />
        ) : (
          <Fragment key={`text-${index}`}>{part}</Fragment>
        ),
      )}
    </>
  );
}
