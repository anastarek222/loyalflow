import { cn } from "@/lib/utils";

type InlineTaneeNameProps = {
  className?: string;
  accentClassName?: string;
};

/**
 * Inline brand treatment for prose, headings, buttons, and helper copy.
 *
 * Tanee remains selectable text and inherits the surrounding typography.
 * Only the final "ee" receives the brand accent and a lightweight connector
 * cue inspired by the wordmark. Full SVG wordmarks belong in identity moments
 * such as headers, footers, and auth branding — not inside sentences.
 */
export function InlineTaneeName({
  className,
  accentClassName,
}: InlineTaneeNameProps) {
  return (
    <span
      dir="ltr"
      data-inline-tanee-name=""
      className={cn("inline whitespace-nowrap", className)}
    >
      <span>Tan</span>
      <span
        data-inline-tanee-ee=""
        data-preserve-latin-tracking=""
        className={cn(
          "relative inline-block pe-[0.12em] text-primary",
          accentClassName,
        )}
      >
        <span className="tracking-[-0.08em]">ee</span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute end-0 top-[0.08em] size-[0.28em] rotate-45 border-e-[0.075em] border-t-[0.075em] border-current"
        />
      </span>
    </span>
  );
}
