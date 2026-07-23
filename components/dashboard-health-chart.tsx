"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartClassNames, chartTokens } from "@/components/ui/chart";

type Props = {
  data: { date: string; customers: number }[];
  emptyLabel: string;
  summary: string;
};

export default function DashboardHealthChart({ data, emptyLabel, summary }: Props) {
  if (!data.length) {
    return <div className={chartClassNames.empty}>{emptyLabel}</div>;
  }

  return (
    <div className="h-52" role="img" aria-label={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke={chartTokens.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={chartTokens.tooltip} />
          <Area type="monotone" dataKey="customers" name="Customers" stroke={chartTokens.info} fill={chartTokens.info} fillOpacity={0.16} strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
