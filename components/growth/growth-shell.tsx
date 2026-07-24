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
      <Link href={`/businesses/${slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{copy.back}: {businessName}</Link>
      <PageHeader eyebrow={copy.growth} title={title} description={description} status={<span className="rounded-full bg-surface-subtle px-3 py-1 text-xs font-semibold text-slate-600">{simple ? copy.simple : copy.advanced}</span>} primaryAction={action} />
      <GrowthNavigation slug={slug} activeArea={area} language={language} />
      {children}
    </PageContainer>
  </main>;
}
