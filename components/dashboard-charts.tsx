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


function EmptyChart() {
  return (
    <div className="flex h-[300px] items-center justify-center rounded-2xl bg-slate-50 text-sm font-bold text-slate-400">
      No data available yet
    </div>
  );
}


function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md ${className}`}
    >

      <div className="mb-6 flex items-center justify-between">

        <h3 className="text-lg font-black text-slate-950">
          {title}
        </h3>

        <span className="h-2 w-2 rounded-full bg-violet-600" />

      </div>

      {children}

    </div>
  );
}


const tooltipStyle = {
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 10px 30px rgba(15,23,42,.08)",
};


export default function DashboardCharts({
  loyaltyGrowth,
  customerGrowth,
  rewardStats,
}: ChartProps) {


  return (
    <section className="grid gap-6 lg:grid-cols-2">


      <ChartCard title="Loyalty Growth">

        {loyaltyGrowth.length ? (

          <ResponsiveContainer width="100%" height={300}>

            <LineChart data={loyaltyGrowth}>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis dataKey="date" />

              <YAxis />

              <Tooltip contentStyle={tooltipStyle}/>


              <Line
                type="monotone"
                dataKey="earned"
                stroke="#7c3aed"
                strokeWidth={3}
                dot={false}
              />


              <Line
                type="monotone"
                dataKey="redeemed"
                stroke="#10b981"
                strokeWidth={3}
                dot={false}
              />


            </LineChart>

          </ResponsiveContainer>

        ) : (
          <EmptyChart />
        )}

      </ChartCard>




      <ChartCard title="Customer Growth">

        {customerGrowth.length ? (

          <ResponsiveContainer width="100%" height={300}>

            <AreaChart data={customerGrowth}>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />


              <XAxis dataKey="date" />

              <YAxis />


              <Tooltip contentStyle={tooltipStyle}/>


              <Area
                type="monotone"
                dataKey="customers"
                stroke="#06b6d4"
                fill="#06b6d4"
                fillOpacity={0.15}
                strokeWidth={3}
              />


            </AreaChart>

          </ResponsiveContainer>

        ) : (
          <EmptyChart />
        )}

      </ChartCard>




      <ChartCard
        title="Rewards Performance"
        className="lg:col-span-2"
      >

        {rewardStats.length ? (

          <ResponsiveContainer width="100%" height={300}>

            <BarChart data={rewardStats}>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis dataKey="name" />

              <YAxis />

              <Tooltip contentStyle={tooltipStyle}/>


              <Bar
                dataKey="redeemed"
                fill="#f59e0b"
                radius={[10,10,0,0]}
              />

            </BarChart>

          </ResponsiveContainer>

        ) : (
          <EmptyChart />
        )}

      </ChartCard>


    </section>
  );
}
