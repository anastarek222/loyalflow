"use client";

import {
  appendCampaignOffer,
  campaignAudiences,
  campaignTriggers,
  getDefaultCampaignAudience,
  ONE_AWAY_TEMPLATE,
  type CampaignAudience,
  type CampaignTrigger,
} from "@/lib/campaigns/builder";
import CopyLinkButton from "@/components/copy-link-button";
import { buildWhatsAppUrl, renderWhatsAppTemplate } from "@/lib/whatsapp-templates";
import { useMemo, useState } from "react";
import type { AppLanguage } from "@/lib/i18n";

type CampaignCandidate = {
  id: string;
  name: string;
  phone: string;
  balance: number;
  remaining: number;
  cardLink: string;
  segment: string;
  rewardReady: boolean;
  oneAway: boolean;
};

type CampaignBuilderProps = {
  businessName: string;
  unitName: string;
  rewardName: string;
  templates: {
    welcome: string;
    balance: string;
    reward: string;
  };
  candidates: CampaignCandidate[];
  language: AppLanguage;
  simple?: boolean;
};

const labels: Record<CampaignTrigger | CampaignAudience, string> = {
  WELCOME: "ترحيب",
  BALANCE_UPDATED: "تحديث الرصيد",
  REWARD_READY: "مكافأة جاهزة",
  ONE_AWAY: "خطوة واحدة",
  WIN_BACK: "استعادة عميل",
  ALL: "كل العملاء المعروضين",
  NEW: "جدد",
  ACTIVE: "نشطون",
  AT_RISK: "معرّضون للتوقف",
  INACTIVE: "غير نشطين",
};

function getTemplate(
  trigger: CampaignTrigger,
  templates: CampaignBuilderProps["templates"]
) {
  switch (trigger) {
    case "WELCOME":
      return templates.welcome;
    case "REWARD_READY":
      return templates.reward;
    case "ONE_AWAY":
      return ONE_AWAY_TEMPLATE;
    case "WIN_BACK":
    case "BALANCE_UPDATED":
      return templates.balance;
  }
}

function matchesAudience(
  candidate: CampaignCandidate,
  audience: CampaignAudience
) {
  if (audience === "ALL") return true;
  if (audience === "REWARD_READY") return candidate.rewardReady;
  if (audience === "ONE_AWAY") return candidate.oneAway;
  return candidate.segment === audience;
}

export default function CampaignBuilder({
  businessName,
  unitName,
  rewardName,
  templates,
  candidates,
  language,
  simple = false,
}: CampaignBuilderProps) {
  const [trigger, setTrigger] = useState<CampaignTrigger>("WIN_BACK");
  const [audience, setAudience] = useState<CampaignAudience>("INACTIVE");
  const [offer, setOffer] = useState("");
  const filteredCandidates = useMemo(
    () => candidates.filter((candidate) => matchesAudience(candidate, audience)),
    [audience, candidates]
  );
  const template = getTemplate(trigger, templates);

  function onTriggerChange(nextTrigger: CampaignTrigger) {
    setTrigger(nextTrigger);
    setAudience(getDefaultCampaignAudience(nextTrigger));
  }

  function messageFor(candidate: CampaignCandidate) {
    return appendCampaignOffer(
      renderWhatsAppTemplate(template, {
        customer: candidate.name,
        business: businessName,
        balance: candidate.balance,
        unit: unitName,
        reward: rewardName,
        cardLink: candidate.cardLink,
        remaining: candidate.remaining,
      }),
      offer
    );
  }

  return (
    <>
      <section aria-label={language === "AR" ? "إعداد الحملة" : "Campaign preparation"} className="grid gap-4 rounded-[var(--lf-radius-input)] border border-border bg-surface p-6 sm:grid-cols-3">
        <label className="text-sm font-black text-foreground-muted">
          {language === "AR" ? "نوع الحملة" : "Campaign type"}
          <select value={trigger} onChange={(event) => onTriggerChange(event.target.value as CampaignTrigger)} className="mt-2 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground">
            {campaignTriggers.map((option) => <option key={option} value={option}>{labels[option]}</option>)}
          </select>
        </label>
        <label className="text-sm font-black text-foreground-muted">
          {language === "AR" ? "الجمهور" : "Audience"}
          <select value={audience} onChange={(event) => setAudience(event.target.value as CampaignAudience)} className="mt-2 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground">
            {campaignAudiences.map((option) => <option key={option} value={option}>{labels[option]}</option>)}
          </select>
        </label>
        {!simple ? <label className="text-sm font-black text-foreground-muted">
          {language === "AR" ? "نص إضافي اختياري" : "Optional additional copy"}
          <input value={offer} onChange={(event) => setOffer(event.target.value.slice(0, 300))} maxLength={300} placeholder={language === "AR" ? "مثال: خصم 10% عند الزيارة القادمة" : "Example: 10% off on your next visit"} className="mt-2 w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 text-foreground" />
        </label>
        : <div className="text-sm text-foreground-muted">{language === "AR" ? "راجع الجمهور والمحتوى قبل النسخ." : "Review audience and content before copying."}</div>}
      </section>

      <p className="mt-6 rounded-[var(--lf-radius-input)] bg-surface-subtle p-4 text-sm text-foreground-muted">{language === "AR" ? `${filteredCandidates.length} عميل في المعاينة. لا يتم حفظ حملة أو إرسال أي رسالة تلقائيًا.` : `${filteredCandidates.length} customers in this preview. No campaign is saved and no message is sent automatically.`}</p>

      <section className="mt-4 space-y-4">
        {filteredCandidates.length === 0 ? (
          <p className="rounded-[var(--lf-radius-input)] border border-dashed border-border bg-surface-subtle p-6 text-foreground-muted">{language === "AR" ? "لا يوجد عملاء مطابقون لهذا الجمهور." : "No customers match this audience."}</p>
        ) : filteredCandidates.map((candidate) => {
          const message = messageFor(candidate);
          return (
            <article key={candidate.id} className="rounded-[var(--lf-radius-input)] border border-border bg-surface p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div>
                  <h2 className="font-black text-foreground">{candidate.name}</h2>
                  <p dir="ltr" className="mt-1 text-sm text-foreground-subtle">{candidate.phone}</p>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <CopyLinkButton value={message} label={language === "AR" ? "نسخ المسودة" : "Copy draft"} />
                  <a aria-label={language === "AR" ? `فتح مسودة WhatsApp للعميل ${candidate.name}` : `Open WhatsApp draft for ${candidate.name}`} href={buildWhatsAppUrl(candidate.phone, message)} target="_blank" rel="noreferrer" className="rounded-[var(--lf-radius-input)] bg-success px-6 py-4 font-black text-[var(--lf-inverse)] hover:bg-success-subtle">{language === "AR" ? "فتح مسودة WhatsApp" : "Open WhatsApp draft"}</a>
                </div>
              </div>
              <pre className="mt-4 whitespace-pre-wrap rounded-[var(--lf-radius-card)] bg-surface-subtle p-4 text-sm leading-6 text-foreground-muted">{message}</pre>
            </article>
          );
        })}
      </section>
    </>
  );
}
