import Link from "next/link";
import type { TenantUser } from "@/lib/permissions";
import { getAdministrationNavigation, type AdministrationSection } from "@/lib/administration/navigation";

type Props = {
  user: TenantUser;
  businessId: string;
  slug: string;
  active: AdministrationSection;
  language?: "AR" | "EN";
};

/** Shared secondary navigation; it improves discovery but never authorizes a route. */
export function AdministrationNavigation({ user, businessId, slug, active, language = "AR" }: Props) {
  const items = getAdministrationNavigation(user, businessId, slug, language);
  return (
    <nav aria-label={language === "AR" ? "إدارة النشاط" : "Business administration"} dir={language === "AR" ? "rtl" : "ltr"} className="mb-6 overflow-x-auto rounded-[var(--lf-radius-card)] border border-border bg-white p-2 shadow-sm">
      <ul className="flex min-w-max gap-1" role="list">
        {items.map((item) => {
          const selected = item.id === active;
          return <li key={item.id}><Link href={item.href} aria-current={selected ? "page" : undefined} className={`block min-h-11 rounded-[var(--lf-radius-input)] px-4 py-2 text-sm font-bold outline-none transition focus-visible:ring-4 focus-visible:ring-primary/20 ${selected ? "bg-primary text-[var(--lf-primary-foreground)]" : "text-foreground-muted hover:bg-primary-subtle hover:text-primary"}`}><span className="block whitespace-nowrap">{item.label}</span><span className={`block max-w-48 whitespace-normal text-xs font-normal ${selected ? "text-primary" : "text-foreground-subtle"}`}>{item.description}</span></Link></li>;
        })}
      </ul>
    </nav>
  );
}
