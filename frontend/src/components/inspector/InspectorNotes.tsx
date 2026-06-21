import { motion } from "framer-motion";
import { Activity, Layers, ShieldAlert, TrendingDown } from "lucide-react";
import { useRisk } from "../../hooks/useRisk";
import { eur, riskColor, AMBER, CRIT_RED } from "../../lib/risk";

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
      color: AMBER,
    },
    {
      icon: TrendingDown,
      label: "Estimated loss",
      value: eur(r.estimated_loss_eur),
      sub: `${Math.round(r.confidence_score)}% confidence`,
      color: AMBER,
    },
    {
      icon: Activity,
      label: "Strongest signal",
      value: topTrigger ? `${Math.round(topTrigger.score * 100)}` : "-",
      sub: topTrigger ? topTrigger.trigger_name.replace(/_/g, " ") : "no triggers",
      color: CRIT_RED,
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="mb-4 text-base font-semibold">AI notes</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-background/40 p-4"
            >
              <div
                className="mb-2 flex h-7 w-7 items-center justify-center rounded-md"
                style={{ background: `${c.color}1f`, color: c.color }}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <p className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{c.label}</p>
              <p className="mt-0.5 text-[15px] font-semibold capitalize">{c.value}</p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{c.sub}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
