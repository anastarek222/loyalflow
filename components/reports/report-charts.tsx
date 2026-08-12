"use client";

import { ChartNoAxesCombined, TrendingUp, UsersRound } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartClassNames, chartTokens } from "@/components/ui/chart";
import type { AppLanguage } from "@/lib/i18n";
import { reportCopy, safeReportNumber } from "@/lib/reports/presentation";

type Props = {
  language: AppLanguage;
  unitName: string;
  trends: {
    customers: { date: string; value: number }[];
    loyaltyEarned: { date: string; value: number }[];
    rewardsRedeemed: { date: string; value: number }[];
  };
};

export function ReportCharts({ language, unitName, trends }: Props) {
  const copy = reportCopy(language);
  const customerData = trends.customers.map((point) => ({
    date: point.date,
    customers: safeReportNumber(point.value),
  }));
  const loyaltyData = trends.loyaltyEarned.map((point, index) => ({
    date: point.date,
    earned: safeReportNumber(point.value),
    redeemed: safeReportNumber(trends.rewardsRedeemed[index]?.value),
  }));
  const hasData =
    loyaltyData.some((point) => point.earned || point.redeemed) ||
    customerData.some((point) => point.customers);

  if (!hasData) {
    return (
      <section
        aria-label={copy.trends}
        className={`${chartClassNames.empty} rounded-[var(--lf-radius-card)] border border-dashed border-border bg-surface-subtle p-8 text-center`}
      >
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
          <ChartNoAxesCombined className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-4 font-black text-foreground">{copy.noData}</p>
      </section>
    );
  }

  return (
    <section
      aria-label={copy.trends}
      data-report-charts="server-derived-buckets"
      className="grid min-w-0 gap-4 lg:grid-cols-2"
    >
      <article className="min-w-0 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm">
        <ChartHeader
          icon={UsersRound}
          title={copy.customerGrowth}
          detail={`${copy.customers} · ${copy.historical}`}
        />
        <div
          className="mt-5 h-72"
          role="img"
          aria-label={`${copy.customerGrowth}: ${customerData
            .map((point) => `${point.date} ${point.customers}`)
            .join(", ")}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={customerData}>
              <CartesianGrid
                stroke={chartTokens.grid}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis dataKey="date" minTickGap={28} />
              <YAxis allowDecimals={false} />
              <Tooltip contentStyle={chartTokens.tooltip} />
              <Line
                type="linear"
                dataKey="customers"
                name={copy.customers}
                stroke={chartTokens.info}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="min-w-0 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm">
        <ChartHeader
          icon={TrendingUp}
          title={copy.loyaltyTrend}
          detail={`${unitName} · ${copy.historical}`}
        />
        <div
          className="mt-5 h-72"
          role="img"
          aria-label={`${copy.loyaltyTrend}: ${loyaltyData
            .map((point) => `${point.date} ${point.earned}/${point.redeemed}`)
            .join(", ")}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={loyaltyData}>
              <CartesianGrid
                stroke={chartTokens.grid}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis dataKey="date" minTickGap={28} />
              <YAxis allowDecimals={false} />
              <Tooltip contentStyle={chartTokens.tooltip} />
              <Legend
                wrapperStyle={{ direction: language === "AR" ? "rtl" : "ltr" }}
              />
              <Bar
                dataKey="earned"
                name={copy.earned}
                fill={chartTokens.positive}
                radius={[5, 5, 0, 0]}
              />
              <Bar
                dataKey="redeemed"
                name={copy.redeemed}
                fill={chartTokens.warning}
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}

function ChartHeader({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof UsersRound;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div>
        <h3 className="font-black text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-foreground-muted">{detail}</p>
      </div>
    </div>
  );
}
