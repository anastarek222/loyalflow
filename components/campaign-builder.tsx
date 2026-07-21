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
      <section className="mt-6 grid gap-4 rounded-3xl bg-white p-5 shadow-sm sm:grid-cols-3 sm:p-6">
        <label className="text-sm font-black text-slate-700">
          نوع الحملة
          <select value={trigger} onChange={(event) => onTriggerChange(event.target.value as CampaignTrigger)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950">
            {campaignTriggers.map((option) => <option key={option} value={option}>{labels[option]}</option>)}
          </select>
        </label>
        <label className="text-sm font-black text-slate-700">
          الجمهور
          <select value={audience} onChange={(event) => setAudience(event.target.value as CampaignAudience)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950">
            {campaignAudiences.map((option) => <option key={option} value={option}>{labels[option]}</option>)}
          </select>
        </label>
        <label className="text-sm font-black text-slate-700">
          عرض اختياري
          <input value={offer} onChange={(event) => setOffer(event.target.value.slice(0, 300))} maxLength={300} placeholder="مثال: خصم 10% عند الزيارة القادمة" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950" />
        </label>
      </section>

      <p className="mt-5 text-sm text-slate-600">{filteredCandidates.length} عميل في المعاينة. لا يتم إنشاء حملة محفوظة أو إرسال أي رسالة تلقائيًا.</p>

      <section className="mt-4 space-y-4">
        {filteredCandidates.length === 0 ? (
          <p className="rounded-3xl bg-white p-6 text-slate-500 shadow-sm">لا يوجد عملاء مطابقون لهذا الجمهور.</p>
        ) : filteredCandidates.map((candidate) => {
          const message = messageFor(candidate);
          return (
            <article key={candidate.id} className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div>
                  <h2 className="font-black text-slate-950">{candidate.name}</h2>
                  <p dir="ltr" className="mt-1 text-sm text-slate-500">{candidate.phone}</p>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <CopyLinkButton value={message} label="نسخ الرسالة" />
                  <a href={buildWhatsAppUrl(candidate.phone, message)} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-600 px-5 py-3 font-black text-white hover:bg-emerald-700">فتح WhatsApp</a>
                </div>
              </div>
              <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{message}</pre>
            </article>
          );
        })}
      </section>
    </>
  );
}
