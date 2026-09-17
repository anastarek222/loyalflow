import type { ReactNode } from "react";

type DirectionTextProps = {
  en: ReactNode;
  ar: ReactNode;
};

/**
 * Render locale defaults without client-side language detection.
 * The root document already owns the authoritative LTR/RTL direction, so the
 * inactive copy stays display:none for both visual users and assistive tech.
 */
export function DirectionText({ en, ar }: DirectionTextProps) {
  return (
    <>
      <span className="rtl:hidden">{en}</span>
      <span className="hidden rtl:inline">{ar}</span>
    </>
  );
}
