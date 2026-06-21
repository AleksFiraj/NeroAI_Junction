import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { useState } from "react";
import { eur, riskBreakdown, riskColor, SALMON, type RiskComponents } from "../../lib/risk";
import { LossTooltip } from "../ui/LossTooltip";

interface Props {
  riskScore: number;
  confidence: number;
  status: string;
  estimatedLoss?: number;
  lossLabel?: string;
  components: RiskComponents;
}

function Gauge({ score }: { score: number }) {
  const color = riskColor(score);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(score, 100) / 100);
  return (
    <div className="relative h-[132px] w-[132px]">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-muted)" strokeWidth="9" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="mono text-[30px] font-semibold tabular" style={{ color: SALMON }}>
          {Math.round(score)}
        </span>
        <span className="mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Risk</span>
      </div>
    </div>
  );
}

export function RiskScoreCard({ riskScore, confidence, status, estimatedLoss, lossLabel, components }: Props) {
  const [hover, setHover] = useState(false);
  const canBreakdown = riskScore > 60;
  const breakdown = riskBreakdown(components);

  return (
    <div
      className="relative flex flex-col items-center rounded-2xl border border-border bg-card p-5"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="mb-3 flex w-full items-center justify-between">
        <h3 className="text-base font-semibold">Risk score</h3>
        {canBreakdown && (
          <span className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            hover for breakdown
          </span>
        )}
      </div>

      <Gauge score={riskScore} />

      <div className="mt-4 grid w-full grid-cols-2 gap-2">
        <Stat label="Status" value={status} valueColor={riskColor(riskScore)} />
        <Stat label="Confidence" value={`${Math.round(confidence)}%`} />
        {estimatedLoss !== undefined && (
          <Stat
            label="Est. loss"
            value={eur(estimatedLoss)}
            info={<LossTooltip label={lossLabel} />}
            span
          />
        )}
      </div>

      <AnimatePresence>
        {hover && canBreakdown && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-3 top-3 z-10 rounded-xl border border-border bg-card/95 p-4 backdrop-blur-sm"
          >
            <p className="mono mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Risk breakdown
            </p>
            <div className="space-y-2.5">
              {breakdown.map((b) => (
                <div key={b.label}>
                  <div className="mb-1 flex justify-between text-[12px]">
                    <span className="text-muted-foreground">{b.label}</span>
                    <span className="mono tabular">{b.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${b.pct}%` }}
                      transition={{ duration: 0.4 }}
                      className="h-full rounded-full"
                      style={{ background: riskColor(riskScore) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({
  label,
  value,
  valueColor,
  span,
  info,
}: {
  label: string;
  value: string;
  valueColor?: string;
  span?: boolean;
  info?: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-background/40 px-3 py-2 ${span ? "col-span-2" : ""}`}
    >
      <p className="mono flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
        {info}
      </p>
      <p className="mt-0.5 text-[13px] font-semibold" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </p>
    </div>
  );
}
