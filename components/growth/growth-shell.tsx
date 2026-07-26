import type { ReactNode } from "react";
import Link from "next/link";

import { PageContainer, PageHeader } from "@/components/page-layout";
import { GrowthNavigation, type GrowthArea } from "@/components/growth/growth-navigation";
import type { ExperienceMode } from "@/lib/experience-mode";
import type { AppLanguage } from "@/lib/i18n";
import { getGrowthCopy } from "@/lib/growth/ui-copy";

export function GrowthShell({ slug, businessName, area, language, experienceMode, title, description, children, action }: { slug: string; businessName: string; area: GrowthArea; language: AppLanguage; experienceMode: ExperienceMode; title: string; description: string; children: ReactNode; action?: ReactNode }) {
  const copy = getGrowthCopy(language);
  const simple = experienceMode === "SIMPLE";
  return <main className="min-h-full" dir={language === "AR" ? "rtl" : "ltr"} data-growth-area={area} data-experience-growth={simple ? "simple" : "advanced"}>
    <PageContainer variant="wide">
      <div className="mb-2 flex items-center justify-between gap-3">
        <Link href={`/businesses/${slug}`} className="inline-flex min-h-10 items-center text-sm font-semibold text-foreground-muted hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{copy.back}</Link>
        <span dir="auto" className="max-w-[55%] truncate text-xs font-semibold text-foreground-subtle">{businessName}</span>
      </div>
      <PageHeader eyebrow={copy.growth} title={title} description={description} status={<span className="rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-semibold text-foreground-muted">{simple ? copy.simple : copy.advanced}</span>} primaryAction={action} />
      <div className="mb-6 overflow-x-auto">
        <GrowthNavigation slug={slug} activeArea={area} language={language} />
      </div>
      <div className="space-y-5">{children}</div>
    </PageContainer>
  </main>;
}
