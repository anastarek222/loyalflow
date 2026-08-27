import { CircleHelp } from "lucide-react";
import Link from "next/link";

export function AuthenticatedSupportLink({
  language,
}: {
  language: "AR" | "EN";
}) {
  const label = language === "AR" ? "المساعدة والدعم" : "Help & Support";

  return (
    <Link
      href="/contact"
      aria-label={label}
      data-testid="authenticated-support-link"
      className="fixed bottom-[calc(var(--lf-mobile-nav-height)+0.75rem)] end-3 z-30 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-bold text-foreground-muted shadow-[var(--lf-shadow-raised)] transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)] lg:bottom-5 lg:end-5"
    >
      <CircleHelp size={17} aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
