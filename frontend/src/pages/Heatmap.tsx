import { AnimatePresence, motion } from "framer-motion";
import { Search, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AiChatPanel } from "../components/ai/AiChatPanel";
import { GlobeIntro } from "../components/geo/GlobeIntro";
import { TiranaMap } from "../components/geo/TiranaMap";
import { FocusCard } from "../components/ui/FocusCard";
import { RiskBadge } from "../components/ui/RiskBadge";
import { useCustomers } from "../hooks/useCustomers";
import { useRisk } from "../hooks/useRisk";
import { eur, riskColor } from "../lib/risk";
import type { CustomerListItem } from "../types/domain";

function InvestigationCard({ customer }: { customer: CustomerListItem }) {
  const [investigating, setInvestigating] = useState(false);
  const risk = useRisk(customer.customer_id);
  const reason = risk.data?.reasons?.[0] ?? "Analyzing detection evidence...";
  const color = riskColor(customer.risk_score);

  return (
    <div className="p-5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full font-mono text-[16px] font-semibold"
          style={{ background: `${color}22`, color }}
        >
          {Math.round(customer.risk_score ?? 0)}
        </div>
        <div>
          <h3 className="text-[16px] font-semibold text-text">{customer.name}</h3>
          <p className="font-mono text-[11px] text-text-muted">
            {customer.customer_id} · {customer.district}
          </p>
        </div>
        <div className="ml-auto mr-6">
          <RiskBadge status={customer.status} size="md" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-border bg-surface-2/40 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.08em] text-text-subtle">Est. loss</p>
          <p className="mt-0.5 text-[13px] font-semibold text-text">
            {eur(customer.estimated_loss_eur)}
          </p>
        </div>
        <div className="rounded-md border border-border bg-surface-2/40 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.08em] text-text-subtle">Confidence</p>
          <p className="mt-0.5 text-[13px] font-semibold text-text">
            {Math.round(customer.confidence_score ?? 0)}%
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-md border border-border bg-surface-2/40 p-3">
        <p className="text-[10px] uppercase tracking-[0.08em] text-text-subtle">Why flagged</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-text-muted">{reason}</p>
      </div>

      <AnimatePresence mode="wait">
        {!investigating ? (
          <motion.div
            key="actions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex gap-2"
          >
            <button
              onClick={() => setInvestigating(true)}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-accent bg-accent text-[12.5px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              <ShieldAlert className="h-3.5 w-3.5" strokeWidth={2} />
              Investigate with AI
            </button>
            <Link
              to={`/customers/${customer.customer_id}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface-2 px-3 text-[12.5px] font-medium text-text-muted transition-colors hover:text-text"
            >
              Full profile
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 h-[360px] border-t border-border pt-4"
          >
            <AiChatPanel customerId={customer.customer_id} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HeatmapPage() {
  const [phase, setPhase] = useState<"globe" | "map">("globe");
  const [selected, setSelected] = useState<CustomerListItem | null>(null);
  const { data } = useCustomers();

  const highRisk = useMemo(
    () =>
      (data ?? []).filter(
        (c) => c.status === "Critical" || c.status === "Suspicious",
      ),
    [data],
  );

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {phase === "globe" ? (
          <motion.div
            key="globe"
            className="flex h-[560px] items-center justify-center"
            exit={{ opacity: 0 }}
          >
            <GlobeIntro onDone={() => setPhase("map")} />
          </motion.div>
        ) : (
          <motion.div
            key="map"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold tracking-tight text-text">
                Tirana risk map
              </h2>
              <div className="flex items-center gap-3 rounded-md border border-border bg-surface-1 px-3 py-1.5 text-[11px] text-text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-critical" /> Critical
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-warning" /> Suspicious
                </span>
                <span className="h-3 w-px bg-border-strong" />
                <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-text-subtle">
                  {highRisk.length} flagged
                </span>
              </div>
            </div>
            <TiranaMap customers={highRisk} onSelect={setSelected} />
            <p className="flex items-center gap-1.5 text-[11px] text-text-subtle">
              <Search className="h-3 w-3" /> Click a marker to investigate a customer
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <FocusCard open={Boolean(selected)} onClose={() => setSelected(null)} width="max-w-lg">
        {selected && <InvestigationCard customer={selected} />}
      </FocusCard>
    </div>
  );
}
