"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartClassNames, chartTokens } from "@/components/ui/chart";
import type { AppLanguage } from "@/lib/i18n";
import { reportCopy, safeReportNumber } from "@/lib/reports/presentation";

type Props = { language: AppLanguage; unitName: string; trends: { customers: { date: string; value: number }[]; loyaltyEarned: { date: string; value: number }[]; rewardsRedeemed: { date: string; value: number }[] } };
export function ReportCharts({ language, unitName, trends }: Props) {
  const copy = reportCopy(language);
  const customerData = trends.customers.map((point) => ({ date: point.date, customers: safeReportNumber(point.value) }));
  const loyaltyData = trends.loyaltyEarned.map((point, index) => ({ date: point.date, earned: safeReportNumber(point.value), redeemed: safeReportNumber(trends.rewardsRedeemed[index]?.value) }));
  const hasData = loyaltyData.some((point) => point.earned || point.redeemed) || customerData.some((point) => point.customers);
  if (!hasData) return <section aria-label={copy.trends} className={chartClassNames.empty}>{copy.noData}</section>;
  const common = <><CartesianGrid stroke={chartTokens.grid} strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" minTickGap={28} /><YAxis allowDecimals={false} /><Tooltip contentStyle={chartTokens.tooltip} /><Legend wrapperStyle={{ direction: language === "AR" ? "rtl" : "ltr" }} /></>;
  return <section aria-label={copy.trends} className="grid min-w-0 gap-4 lg:grid-cols-2">
    <article className="min-w-0 rounded-lg border border-border bg-surface p-4"><h2 className="font-semibold text-slate-950">{copy.customerGrowth}</h2><p className="mt-1 text-sm text-slate-600">{copy.customers} · {copy.historical}</p><div className="mt-4 h-72" role="img" aria-label={`${copy.customerGrowth}: ${customerData.map((p) => `${p.date} ${p.customers}`).join(", ")}`}><ResponsiveContainer width="100%" height="100%"><LineChart data={customerData}>{common}<Line type="linear" dataKey="customers" name={copy.customers} stroke={chartTokens.info} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></article>
    <article className="min-w-0 rounded-lg border border-border bg-surface p-4"><h2 className="font-semibold text-slate-950">{copy.loyaltyTrend}</h2><p className="mt-1 text-sm text-slate-600">{unitName} · {copy.historical}</p><div className="mt-4 h-72" role="img" aria-label={`${copy.loyaltyTrend}: ${loyaltyData.map((p) => `${p.date} ${p.earned}/${p.redeemed}`).join(", ")}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={loyaltyData}>{common}<Bar dataKey="earned" name={copy.earned} fill={chartTokens.positive} radius={[3,3,0,0]} /><Bar dataKey="redeemed" name={copy.redeemed} fill={chartTokens.warning} radius={[3,3,0,0]} /></BarChart></ResponsiveContainer></div></article>
  </section>;
}
