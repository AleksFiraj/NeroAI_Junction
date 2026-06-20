import { motion } from "framer-motion";
import { Activity, Layers, ShieldAlert, TrendingDown } from "lucide-react";
import { useRisk } from "../../hooks/useRisk";
import { eur, riskColor } from "../../lib/risk";

export function InspectorNotes({ customerId }: { customerId: string }) {
  const risk = useRisk(customerId);
  if (!risk.data) return null;

  const r = risk.data;
  const topTrigger = r.triggers[0];
  const cards = [
    {
      icon: ShieldAlert,
      label: "Verdict",
      value: r.status,
      sub: `Risk ${Math.round(r.risk_score)} / 100`,
      color: riskColor(r.risk_score),
    },
    {
      icon: Layers,
      label: "Trigger agreement",
      value: `${r.groups_fired}/6`,
      sub: "independent groups",
      color: "#3B82F6",
    },
    {
      icon: TrendingDown,
      label: "Estimated loss",
      value: eur(r.estimated_loss_eur),
      sub: `${Math.round(r.confidence_score)}% confidence`,
      color: "#F59E0B",
    },
    {
      icon: Activity,
      label: "Strongest signal",
      value: topTrigger ? `${Math.round(topTrigger.score * 100)}` : "-",
      sub: topTrigger ? topTrigger.trigger_name.replace(/_/g, " ") : "no triggers",
      color: "#EF4444",
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-5">
      <h3 className="mb-4 text-[13px] font-semibold text-text">AI notes</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-lg border border-border bg-surface-2/40 p-3"
            >
              <div
                className="mb-2 flex h-7 w-7 items-center justify-center rounded-md"
                style={{ background: `${c.color}1f`, color: c.color }}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-subtle">{c.label}</p>
              <p className="mt-0.5 text-[15px] font-semibold capitalize text-text">{c.value}</p>
              <p className="mt-0.5 truncate text-[11px] text-text-muted">{c.sub}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
