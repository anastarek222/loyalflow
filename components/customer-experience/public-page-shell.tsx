import type { ReactNode } from "react";

type PublicPageShellProps = {
  children: ReactNode;
  lang: string;
  dir: "rtl" | "ltr";
  primaryColor: string;
  className?: string;
};

/** A sidebar-free, bounded shell for customer-facing pages. */
export function PublicPageShell({
  children,
  lang,
  dir,
  primaryColor,
  className = "",
}: PublicPageShellProps) {
  return (
    <main
      lang={lang}
      dir={dir}
      className={`relative isolate min-h-screen overflow-x-hidden px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:py-10 ${className}`}
      style={{
        background: `linear-gradient(180deg, ${primaryColor}18 0%, #f8fafc 24rem, #f8fafc 100%)`,
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] opacity-70"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${primaryColor}2b, transparent 64%)`,
        }}
      />
      <div className="relative z-10 mx-auto w-full max-w-3xl">{children}</div>
    </main>
  );
}
