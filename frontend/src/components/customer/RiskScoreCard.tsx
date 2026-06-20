import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { eur, riskBreakdown, riskColor, type RiskComponents } from "../../lib/risk";

interface Props {
  riskScore: number;
  confidence: number;
  status: string;
  estimatedLoss?: number;
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
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1F2937" strokeWidth="9" />
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
        <span className="font-mono text-[30px] font-semibold tabular" style={{ color }}>
          {Math.round(score)}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle">Risk</span>
      </div>
    </div>
  );
}

export function RiskScoreCard({ riskScore, confidence, status, estimatedLoss, components }: Props) {
  const [hover, setHover] = useState(false);
  const canBreakdown = riskScore > 60;
  const breakdown = riskBreakdown(components);

  return (
    <div
      className="relative flex flex-col items-center rounded-xl border border-border bg-surface-1 p-5"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="mb-3 flex w-full items-center justify-between">
        <h3 className="text-[13px] font-semibold text-text">Risk score</h3>
        {canBreakdown && (
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-subtle">
            hover for breakdown
          </span>
        )}
      </div>

      <Gauge score={riskScore} />

      <div className="mt-4 grid w-full grid-cols-2 gap-2">
        <Stat label="Status" value={status} valueColor={riskColor(riskScore)} />
        <Stat label="Confidence" value={`${Math.round(confidence)}%`} />
        {estimatedLoss !== undefined && (
          <Stat label="Est. loss" value={eur(estimatedLoss)} span />
        )}
      </div>

      <AnimatePresence>
        {hover && canBreakdown && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-3 top-3 z-10 rounded-lg border border-border-strong bg-surface-2/95 p-4 backdrop-blur-sm"
          >
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-text-subtle">
              Risk breakdown
            </p>
            <div className="space-y-2.5">
              {breakdown.map((b) => (
                <div key={b.label}>
                  <div className="mb-1 flex justify-between text-[12px]">
                    <span className="text-text-muted">{b.label}</span>
                    <span className="font-mono tabular text-text">{b.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
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
}: {
  label: string;
  value: string;
  valueColor?: string;
  span?: boolean;
}) {
  return (
    <div
      className={`rounded-md border border-border bg-surface-2/40 px-3 py-2 ${span ? "col-span-2" : ""}`}
    >
      <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-subtle">{label}</p>
      <p className="mt-0.5 text-[13px] font-semibold" style={{ color: valueColor ?? "#F1F5F9" }}>
        {value}
      </p>
    </div>
  );
}
