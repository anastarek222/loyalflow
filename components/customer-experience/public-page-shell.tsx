import type { ReactNode } from "react";

type PublicPageShellProps = {
  children: ReactNode;
  lang: string;
  dir: "rtl" | "ltr";
  primaryColor: string;
  className?: string;
};

/** A sidebar-free, bounded shell for customer-facing pages. */
export function PublicPageShell({ children, lang, dir, primaryColor, className = "" }: PublicPageShellProps) {
  return (
    <main
      lang={lang}
      dir={dir}
      className={`relative min-h-screen overflow-x-hidden px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:py-10 ${className}`}
      style={{ background: `linear-gradient(180deg, ${primaryColor}14 0%, #f8fafc 18rem, #f8fafc 100%)` }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-60" style={{ background: `linear-gradient(180deg, ${primaryColor}20, transparent)` }} />
      <div className="relative z-10 mx-auto w-full max-w-md">{children}</div>
    </main>
  );
}
