import { motion } from "framer-motion";
import { AlertTriangle, Euro, MapPin, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboard } from "../hooks/useDashboard";
import { eur, riskColor } from "../lib/risk";
import { RiskBadge } from "../components/ui/RiskBadge";

const STATUS_COLORS: Record<string, string> = {
  Normal: "#10B981",
  Suspicious: "#F59E0B",
  Critical: "#EF4444",
};

const KPI_ICONS = [Users, AlertTriangle, MapPin, Euro, Zap];

export function DashboardPage() {
  const { data, isLoading } = useDashboard();

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-2" />
        ))}
      </div>
    );
  }

  const order = ["Normal", "Suspicious", "Critical"];
  const dist = Object.entries(data.risk_distribution)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  const total = dist.reduce((a, b) => a + b.value, 0);
  const districts = [...data.district_risk].sort((a, b) => b.avg_risk - a.avg_risk).slice(0, 10);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {data.kpis.map((kpi, i) => {
          const Icon = KPI_ICONS[i % KPI_ICONS.length];
          const isMoney = kpi.label.toLowerCase().includes("loss");
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-surface-1 p-4"
            >
              <div className="flex items-center gap-2 text-text-subtle">
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em]">
                  {kpi.label}
                </span>
              </div>
              <p className="mt-2 text-[28px] font-bold tabular leading-none text-text">
                {isMoney ? eur(kpi.value) : Math.round(kpi.value).toLocaleString()}
              </p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Top 10 high risk */}
        <div className="rounded-xl border border-border bg-surface-1 lg:col-span-2">
          <div className="border-b border-border px-5 py-3.5">
            <h3 className="text-[13px] font-semibold text-text">Top 10 high-risk customers</h3>
          </div>
          <div className="divide-y divide-border/60">
            {data.top_risky_customers.map((c, i) => (
              <Link
                key={c.customer_id}
                to={`/customers/${c.customer_id}`}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/50"
              >
                <span className="w-5 font-mono text-[12px] text-text-subtle">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-text">{c.name}</p>
                  <p className="truncate font-mono text-[10.5px] text-text-subtle">
                    {c.district} · {c.property_type}
                  </p>
                </div>
                <span className="hidden font-mono text-[12px] text-text-muted sm:block">
                  {eur(c.estimated_loss_eur)}
                </span>
                <span
                  className="font-mono text-[14px] font-semibold tabular"
                  style={{ color: riskColor(c.risk_score) }}
                >
                  {Math.round(c.risk_score ?? 0)}
                </span>
                <RiskBadge status={c.status} />
              </Link>
            ))}
          </div>
        </div>

        {/* Risk distribution */}
        <div className="rounded-xl border border-border bg-surface-1 p-5">
          <h3 className="mb-2 text-[13px] font-semibold text-text">Risk distribution</h3>
          <div className="relative h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dist}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={2}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {dist.map((d) => (
                    <Cell key={d.name} fill={STATUS_COLORS[d.name] ?? "#64748B"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F1524",
                    border: "1px solid #334155",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[22px] font-bold tabular text-text">
                {total >= 1000 ? `${(total / 1000).toFixed(total % 1000 === 0 ? 0 : 1)}k` : total}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle">
                Total
              </span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
            {dist.map((d) => (
              <div
                key={d.name}
                className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.04em] text-text-muted"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: STATUS_COLORS[d.name] ?? "#64748B" }}
                />
                {d.name} <span className="tabular text-text">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* District risk */}
      <div className="rounded-xl border border-border bg-surface-1 p-5">
        <h3 className="mb-4 text-[13px] font-semibold text-text">Risk by district</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={districts} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <XAxis
                dataKey="district"
                tick={{ fill: "#64748B", fontSize: 10 }}
                axisLine={{ stroke: "#1F2937" }}
                tickLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={56}
              />
              <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                contentStyle={{
                  backgroundColor: "#0F1524",
                  border: "1px solid #334155",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(v: any) => [`${Number(v).toFixed(1)}`, "Avg risk"]}
              />
              <Bar dataKey="avg_risk" radius={[4, 4, 0, 0]}>
                {districts.map((d) => (
                  <Cell key={d.district} fill={riskColor(d.avg_risk)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
