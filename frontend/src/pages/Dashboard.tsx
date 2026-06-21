import { motion } from "framer-motion";
import { AlertTriangle, Euro, MapPin, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboard } from "../hooks/useDashboard";
import { eur, SALMON, CRIT_RED, MINT, AMBER } from "../lib/risk";
import { RiskBadge } from "../components/ui/RiskBadge";
import { LossTooltip } from "../components/ui/LossTooltip";

const KPI_ICONS = [Users, AlertTriangle, MapPin, Euro, Zap];

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "critical";
  delay?: number;
}) {
  const labelColor = tone === "critical" ? SALMON : undefined;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div
        className="mono flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
        style={labelColor ? { color: labelColor } : undefined}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-4 text-4xl font-bold tracking-tight">{value}</div>
    </motion.div>
  );
}

function RiskDonut({ dist }: { dist: { name: string; value: number }[] }) {
  const total = dist.reduce((a, b) => a + b.value, 0);
  const r = 72;
  const circumference = 2 * Math.PI * r;

  const segmentColors: Record<string, string> = {
    Normal: MINT,
    Suspicious: AMBER,
    Critical: CRIT_RED,
  };

  let accumulated = 0;
  const segments = dist.map((d) => {
    const fraction = total > 0 ? d.value / total : 0;
    const dash = fraction * circumference;
    const offset = -accumulated * circumference;
    accumulated += fraction;
    return { ...d, dash, offset, color: segmentColors[d.name] ?? MINT };
  });

  return (
    <div className="relative grid place-items-center">
      <svg width="260" height="260" viewBox="0 0 200 200">
        {/* Track */}
        <circle
          cx="100" cy="100" r={r} fill="none"
          stroke="var(--color-muted)" strokeWidth="3" opacity={0.4}
        />
        {/* Segments */}
        {segments.map((seg, i) => (
          <motion.circle
            key={seg.name}
            cx="100" cy="100" r={r} fill="none"
            stroke={seg.color}
            strokeWidth="38"
            strokeLinecap="butt"
            strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
            transform="rotate(-90 100 100)"
            initial={{ strokeDashoffset: circumference, opacity: 0 }}
            animate={{ strokeDashoffset: seg.offset, opacity: 1 }}
            transition={{ duration: 0.9, delay: i * 0.15, ease: "easeOut" }}
          />
        ))}
      </svg>
      <motion.div
        className="absolute text-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="text-4xl font-bold tracking-tight">
          {total >= 1000 ? `${(total / 1000).toFixed(total % 1000 === 0 ? 0 : 1)}k` : total}
        </div>
        <div className="mono mt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Total
        </div>
      </motion.div>
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading } = useDashboard();

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
    );
  }

  const order = ["Normal", "Suspicious", "Critical"];
  const dist = Object.entries(data.risk_distribution)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  const top = data.top_risky_customers;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((kpi, i) => {
          const Icon = KPI_ICONS[i % KPI_ICONS.length];
          const isMoney = kpi.label.toLowerCase().includes("loss");
          const isCritical = kpi.label.toLowerCase().includes("high-risk");
          return (
            <StatCard
              key={kpi.label}
              icon={Icon}
              label={kpi.label}
              value={isMoney ? eur(kpi.value) : Math.round(kpi.value).toLocaleString()}
              tone={isCritical ? "critical" : "default"}
              delay={i * 0.05}
            />
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Top 10 table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card lg:col-span-2">
          <div className="border-b border-border bg-muted/40 px-6 py-4">
            <h2 className="text-base font-semibold">Top 10 high-risk customers</h2>
          </div>
          <div className="px-6 py-2">
            {top.map((c, i) => (
              <Link
                key={c.customer_id}
                to={`/customers/${c.customer_id}`}
                className="flex items-center gap-4 py-3 transition-colors hover:bg-muted/20"
              >
                <div className="mono w-6 text-sm text-muted-foreground">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="mono text-xs text-muted-foreground">
                    {c.district} · {c.property_type}
                  </div>
                </div>
                <div className="mono flex items-center gap-1 text-sm" style={{ color: SALMON }}>
                  {eur(c.estimated_loss_eur)}
                  <LossTooltip label={c.loss_label} />
                </div>
                <div
                  className="mono text-lg font-bold w-8 text-right"
                  style={{ color: SALMON }}
                >
                  {Math.round(c.risk_score ?? 0)}
                </div>
                <RiskBadge status={c.status} />
              </Link>
            ))}
          </div>
        </div>

        {/* Risk distribution donut */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold">Risk distribution</h2>
          <div className="mt-6 grid place-items-center">
            <RiskDonut dist={dist} />
          </div>
          <div className="mt-6 flex flex-col items-center gap-2 text-sm">
            <div className="flex items-center gap-6">
              <span className="mono flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: MINT }} />
                Normal {dist.find((d) => d.name === "Normal")?.value ?? 0}
              </span>
              <span className="mono flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: AMBER }} />
                Suspicious {dist.find((d) => d.name === "Suspicious")?.value ?? 0}
              </span>
            </div>
            <span className="mono flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: CRIT_RED }} />
              Critical {dist.find((d) => d.name === "Critical")?.value ?? 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
