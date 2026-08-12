"use client";

import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Filter,
  MessageSquareText,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import CopyLinkButton from "@/components/copy-link-button";
import {
  appendCampaignOffer,
  campaignAudiences,
  campaignTriggers,
  getDefaultCampaignAudience,
  ONE_AWAY_TEMPLATE,
  type CampaignAudience,
  type CampaignTrigger,
} from "@/lib/campaigns/builder";
import type { AppLanguage } from "@/lib/i18n";
import {
  buildWhatsAppUrl,
  renderWhatsAppTemplate,
} from "@/lib/whatsapp-templates";

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

const labels: Record<
  CampaignTrigger | CampaignAudience,
  { AR: string; EN: string }
> = {
  WELCOME: { AR: "ترحيب", EN: "Welcome" },
  BALANCE_UPDATED: { AR: "تحديث الرصيد", EN: "Balance update" },
  REWARD_READY: { AR: "مكافأة جاهزة", EN: "Reward ready" },
  ONE_AWAY: { AR: "خطوة واحدة", EN: "One step away" },
  WIN_BACK: { AR: "استعادة عميل", EN: "Win back" },
  ALL: { AR: "كل العملاء المعروضين", EN: "All displayed customers" },
  NEW: { AR: "جدد", EN: "New" },
  ACTIVE: { AR: "نشطون", EN: "Active" },
  AT_RISK: { AR: "معرّضون للتوقف", EN: "At risk" },
  INACTIVE: { AR: "غير نشطين", EN: "Inactive" },
};

function getTemplate(
  trigger: CampaignTrigger,
  templates: CampaignBuilderProps["templates"],
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
  audience: CampaignAudience,
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
    () =>
      candidates.filter((candidate) => matchesAudience(candidate, audience)),
    [audience, candidates],
  );
  const template = getTemplate(trigger, templates);
  const label = (value: CampaignTrigger | CampaignAudience) =>
    labels[value][language];

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
      offer,
    );
  }

  return (
    <div data-campaign-builder="manual-review">
      <section
        aria-label={language === "AR" ? "إعداد الحملة" : "Campaign preparation"}
        className="rounded-[var(--lf-radius-card)] border border-border bg-surface shadow-sm"
      >
        <div className="flex items-start gap-3 border-b border-border p-5 sm:p-6">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Filter className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-black text-foreground">
              {language === "AR"
                ? "نوع الحملة والجمهور"
                : "Campaign type and audience"}
            </p>
            <p className="mt-1 text-sm leading-6 text-foreground-muted">
              {language === "AR"
                ? "اختيار نوع الحملة يحدد الجمهور المقترح تلقائيًا، ويمكنك تغييره قبل المراجعة."
                : "The campaign type sets a safe default audience, which you can change before review."}
            </p>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
          <label className="text-sm font-black text-foreground-muted">
            {language === "AR" ? "نوع الحملة" : "Campaign type"}
            <span className="relative mt-2 block">
              <select
                value={trigger}
                onChange={(event) =>
                  onTriggerChange(event.target.value as CampaignTrigger)
                }
                className="min-h-12 w-full appearance-none rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 pe-11 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
              >
                {campaignTriggers.map((option) => (
                  <option key={option} value={option}>
                    {label(option)}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-foreground-subtle"
                aria-hidden="true"
              />
            </span>
          </label>

          <label className="text-sm font-black text-foreground-muted">
            {language === "AR" ? "الجمهور" : "Audience"}
            <span className="relative mt-2 block">
              <select
                value={audience}
                onChange={(event) =>
                  setAudience(event.target.value as CampaignAudience)
                }
                className="min-h-12 w-full appearance-none rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 pe-11 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
              >
                {campaignAudiences.map((option) => (
                  <option key={option} value={option}>
                    {label(option)}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-foreground-subtle"
                aria-hidden="true"
              />
            </span>
          </label>

          {!simple ? (
            <label className="text-sm font-black text-foreground-muted lg:col-span-2">
              <span className="flex items-center justify-between gap-3">
                <span>
                  {language === "AR"
                    ? "نص إضافي اختياري"
                    : "Optional additional copy"}
                </span>
                <span
                  dir="ltr"
                  className="lf-type-numeric text-xs font-semibold text-foreground-subtle"
                >
                  {offer.length}/300
                </span>
              </span>
              <textarea
                value={offer}
                onChange={(event) => setOffer(event.target.value.slice(0, 300))}
                maxLength={300}
                rows={3}
                placeholder={
                  language === "AR"
                    ? "مثال: خصم 10% عند الزيارة القادمة"
                    : "Example: 10% off on your next visit"
                }
                className="mt-2 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface p-4 text-foreground outline-none transition placeholder:text-foreground-subtle focus:border-primary focus:ring-2 focus:ring-primary-soft"
              />
            </label>
          ) : (
            <div className="flex items-center gap-3 rounded-[var(--lf-radius-input)] bg-surface-subtle p-4 text-sm text-foreground-muted lg:col-span-2">
              <CheckCircle2
                className="size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              {language === "AR"
                ? "راجع الجمهور والمحتوى قبل النسخ."
                : "Review audience and content before copying."}
            </div>
          )}
        </div>
      </section>

      <section className="mt-5" aria-labelledby="campaign-preview-title">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              {language === "AR" ? "المراجعة اليدوية" : "Manual review"}
            </p>
            <h2
              id="campaign-preview-title"
              className="mt-1 text-lg font-black text-foreground"
            >
              {language === "AR" ? "مسودات العملاء" : "Customer drafts"}
            </h2>
          </div>
          <div className="inline-flex items-center gap-3 rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 py-3">
            <Users className="size-5 text-primary" aria-hidden="true" />
            <span className="text-sm text-foreground-muted">
              {language === "AR" ? "عملاء المعاينة" : "Preview customers"}
            </span>
            <strong dir="ltr" className="lf-type-numeric text-foreground">
              {filteredCandidates.length}
            </strong>
          </div>
        </div>

        {filteredCandidates.length === 0 ? (
          <div className="rounded-[var(--lf-radius-card)] border border-dashed border-border bg-surface-subtle p-8 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
              <UserRound className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-4 font-black text-foreground">
              {language === "AR"
                ? "لا يوجد عملاء مطابقون"
                : "No matching customers"}
            </p>
            <p className="mt-2 text-sm text-foreground-muted">
              {language === "AR"
                ? "غيّر الجمهور لمراجعة مجموعة أخرى من العملاء."
                : "Change the audience to review another customer group."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredCandidates.map((candidate) => {
              const message = messageFor(candidate);
              return (
                <article
                  key={candidate.id}
                  className="flex flex-col rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-black text-primary">
                      {candidate.name.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-black text-foreground">
                        {candidate.name}
                      </h3>
                      <p
                        dir="ltr"
                        className="mt-1 text-start text-sm text-foreground-subtle"
                      >
                        {candidate.phone}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <DraftFact
                      icon={Sparkles}
                      label={language === "AR" ? "نوع الحملة" : "Campaign"}
                      value={label(trigger)}
                    />
                    <DraftFact
                      icon={Users}
                      label={language === "AR" ? "الجمهور" : "Audience"}
                      value={label(audience)}
                    />
                  </div>

                  <details
                    className="group mt-4 rounded-[var(--lf-radius-input)] bg-surface-subtle"
                    open={filteredCandidates.length === 1}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-foreground-muted">
                      <span className="inline-flex items-center gap-2">
                        <FileText
                          className="size-4 text-primary"
                          aria-hidden="true"
                        />
                        {language === "AR"
                          ? "معاينة الرسالة"
                          : "Preview message"}
                      </span>
                      <ChevronDown
                        className="size-4 transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <pre className="whitespace-pre-wrap border-t border-border p-4 font-sans text-sm leading-6 text-foreground-muted">
                      {message}
                    </pre>
                  </details>

                  <div className="mt-auto flex flex-col gap-2 pt-4 sm:flex-row">
                    <CopyLinkButton
                      value={message}
                      label={language === "AR" ? "نسخ المسودة" : "Copy draft"}
                    />
                    <a
                      aria-label={
                        language === "AR"
                          ? `فتح مسودة WhatsApp للعميل ${candidate.name}`
                          : `Open WhatsApp draft for ${candidate.name}`
                      }
                      href={buildWhatsAppUrl(candidate.phone, message)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--lf-radius-input)] bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
                    >
                      <MessageSquareText
                        className="size-4"
                        aria-hidden="true"
                      />
                      {language === "AR"
                        ? "فتح مسودة WhatsApp"
                        : "Open WhatsApp draft"}
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function DraftFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--lf-radius-input)] border border-border p-3">
      <p className="flex items-center gap-2 text-[11px] font-semibold text-foreground-subtle">
        <Icon className="size-3.5 text-primary" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1.5 truncate text-sm font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}
