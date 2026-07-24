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
      className={`relative min-h-screen overflow-x-hidden px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:py-10 ${className}`}
      style={{ background: `linear-gradient(160deg, ${primaryColor} 0%, #020617 55%, #0f172a 100%)` }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.35), transparent 28%), radial-gradient(circle at 85% 30%, rgba(255,255,255,0.16), transparent 24%)" }} />
      <div className="relative z-10 mx-auto w-full max-w-md">{children}</div>
    </main>
  );
}
