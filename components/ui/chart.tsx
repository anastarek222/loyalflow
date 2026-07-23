export const chartTokens = {
  primary: "var(--lf-chart-1)",
  positive: "var(--lf-chart-2)",
  info: "var(--lf-chart-3)",
  warning: "var(--lf-chart-4)",
  danger: "var(--lf-chart-5)",
  grid: "var(--lf-chart-grid)",
  tooltip: { background: "var(--lf-surface-raised)", border: "1px solid var(--lf-border)", borderRadius: "var(--lf-radius-md)", boxShadow: "var(--lf-shadow-raised)" },
} as const;

export const chartClassNames = { legend: "text-xs font-medium text-slate-600", empty: "flex h-[300px] items-center justify-center rounded-md bg-surface-subtle text-sm text-slate-500" } as const;
