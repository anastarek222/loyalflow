 "use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type ChartProps = {
  loyaltyGrowth: {
    date: string;
    earned: number;
    redeemed: number;
  }[];

  customerGrowth: {
    date: string;
    customers: number;
  }[];

  rewardStats: {
    name: string;
    redeemed: number;
  }[];
};

export default function DashboardCharts({
  loyaltyGrowth,
  customerGrowth,
  rewardStats,
}: ChartProps) {
  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-2">

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-5 text-lg font-black text-slate-950">
          Loyalty Growth
        </h3>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={loyaltyGrowth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />

            <Line
              type="monotone"
              dataKey="earned"
              stroke="#7c3aed"
              strokeWidth={3}
            />

            <Line
              type="monotone"
              dataKey="redeemed"
              stroke="#10b981"
              strokeWidth={3}
            />

          </LineChart>
        </ResponsiveContainer>
      </div>


      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">

        <h3 className="mb-5 text-lg font-black text-slate-950">
          Customer Growth
        </h3>


        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={customerGrowth}>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="date" />

            <YAxis />

            <Tooltip />

            <Area
              type="monotone"
              dataKey="customers"
              stroke="#06b6d4"
              fill="#06b6d4"
            />

          </AreaChart>
        </ResponsiveContainer>

      </div>


      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-2">

        <h3 className="mb-5 text-lg font-black text-slate-950">
          Rewards Performance
        </h3>


        <ResponsiveContainer width="100%" height={300}>

          <BarChart data={rewardStats}>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="name" />

            <YAxis />

            <Tooltip />

            <Bar
              dataKey="redeemed"
              fill="#f59e0b"
              radius={[8,8,0,0]}
            />

          </BarChart>

        </ResponsiveContainer>

      </div>


    </section>
  );
}
