import Link from "next/link";

import type { AppLanguage } from "@/lib/i18n";
import { getGrowthCopy } from "@/lib/growth/ui-copy";

export type GrowthArea = "rewards" | "offers" | "campaigns" | "recovery";

export function GrowthNavigation({ slug, activeArea, language }: { slug: string; activeArea: GrowthArea; language: AppLanguage }) {
  const copy = getGrowthCopy(language);
  const items: Array<{ area: GrowthArea; label: string }> = [
    { area: "rewards", label: copy.rewards }, { area: "offers", label: copy.offers },
    { area: "campaigns", label: copy.campaigns }, { area: "recovery", label: copy.recovery },
  ];
  return <nav aria-label={`${copy.growth} navigation`} className="max-w-full overflow-x-auto" data-growth-navigation="true">
    <div className="flex min-w-max gap-1 rounded-lg border border-border bg-surface p-1" role="list">
      {items.map(({ area, label }) => <Link key={area} href={`/businesses/${slug}/${area}`} aria-current={activeArea === area ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${activeArea === area ? "bg-primary text-white" : "text-slate-700 hover:bg-surface-subtle"}`}>{label}</Link>)}
    </div>
  </nav>;
}
