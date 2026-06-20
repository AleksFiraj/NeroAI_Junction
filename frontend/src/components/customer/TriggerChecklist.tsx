import { motion } from "framer-motion";
import { Check, Minus } from "lucide-react";
import type { TriggerOutput } from "../../types/domain";

interface CheckDef {
  label: string;
  match: string[];
}

const CHECKS: CheckDef[] = [
  { label: "Sudden drop detected", match: ["sudden_drop_trigger"] },
  {
    label: "Peer deviation high",
    match: ["peer_deviation_trigger", "z_score_anomaly_trigger", "building_outlier_trigger"],
  },
  {
    label: "Seasonal mismatch",
    match: [
      "winter_underconsumption_trigger",
      "seasonal_inconsistency_trigger",
      "temperature_mismatch_trigger",
    ],
  },
  { label: "Low consumption persistence", match: ["low_usage_persistence_trigger"] },
  {
    label: "Geographic hotspot",
    match: ["hotspot_cluster_trigger", "district_outlier_trigger", "neighborhood_divergence_trigger"],
  },
  {
    label: "Meter integrity issue",
    match: ["flatline_usage_trigger", "repeated_values_trigger", "abnormal_stability_trigger"],
  },
  {
    label: "Load-shape break",
    match: ["consumption_shape_distance_trigger", "historical_pattern_break_trigger"],
  },
];

export function TriggerChecklist({ triggers }: { triggers: TriggerOutput[] }) {
  const byName = new Map(triggers.map((t) => [t.trigger_name, t]));

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-5">
      <h3 className="mb-4 text-[13px] font-semibold text-text">Explainability engine</h3>
      <ul className="grid gap-2 sm:grid-cols-2">
        {CHECKS.map((c, i) => {
          const hit = c.match.map((m) => byName.get(m)).find(Boolean);
          const active = Boolean(hit);
          return (
            <motion.li
              key={c.label}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
              className={`flex items-start gap-2.5 rounded-md border p-3 ${
                active
                  ? "border-border-strong bg-surface-2/60"
                  : "border-border bg-surface-2/20 opacity-60"
              }`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  active
                    ? "border-safe/40 bg-safe/15 text-safe"
                    : "border-border bg-surface-3 text-text-subtle"
                }`}
              >
                {active ? (
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                ) : (
                  <Minus className="h-2.5 w-2.5" strokeWidth={3} />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-medium text-text">{c.label}</p>
                {active && hit && (
                  <p className="mt-0.5 truncate text-[11.5px] text-text-muted">{hit.reason}</p>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
