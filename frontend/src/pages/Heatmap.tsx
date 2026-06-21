import { AnimatePresence, motion } from "framer-motion";
import { Bot, Filter, MapPin, ShieldAlert, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AiChatPanel } from "../components/ai/AiChatPanel";
import { EarthIntro } from "../components/geo/EarthIntro";
import { TiranaMap, TIRANA_ZONES } from "../components/geo/TiranaMap";
import { FocusCard } from "../components/ui/FocusCard";
import { RiskBadge } from "../components/ui/RiskBadge";
import { LossTooltip } from "../components/ui/LossTooltip";
import { useCustomers } from "../hooks/useCustomers";
import { useRisk } from "../hooks/useRisk";
import { eur, riskColor, CRIT_RED, AMBER } from "../lib/risk";
import type { CustomerListItem } from "../types/domain";

type RiskFilter = "all" | "critical" | "suspicious";

function InvestigationCard({
  customer,
  onInvestigate,
  investigating,
}: {
  customer: CustomerListItem;
  onInvestigate: () => void;
  investigating: boolean;
}) {
  const risk = useRisk(customer.customer_id);
  const reason = risk.data?.reasons?.[0] ?? "Analyzing detection evidence...";
  const color = riskColor(customer.risk_score);

  return (
    <div className="p-5">
      <div className="flex items-center gap-3">
        <div
          className="mono flex h-12 w-12 items-center justify-center rounded-full text-[16px] font-bold"
          style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}
        >
          {Math.round(customer.risk_score ?? 0)}
        </div>
        <div>
          <h3 className="text-[16px] font-semibold">{customer.name}</h3>
          <p className="mono text-[11px] text-muted-foreground">
            {customer.customer_id} · {customer.district}
          </p>
        </div>
        <div className="ml-auto mr-6">
          <RiskBadge status={customer.status} size="md" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-background/40 px-3 py-2">
          <p className="mono flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Est. loss
            <LossTooltip label={customer.loss_label} />
          </p>
          <p className="mt-0.5 text-[13px] font-semibold">{eur(customer.estimated_loss_eur)}</p>
        </div>
        <div className="rounded-xl border border-border bg-background/40 px-3 py-2">
          <p className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Confidence</p>
          <p className="mt-0.5 text-[13px] font-semibold">{Math.round(customer.confidence_score ?? 0)}%</p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-background/40 p-3">
        <p className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Why flagged</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{reason}</p>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onInvestigate}
          disabled={investigating}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-medium text-primary-foreground transition-colors disabled:opacity-50"
          style={{ background: AMBER }}
        >
          <ShieldAlert className="h-3.5 w-3.5" strokeWidth={2} />
          {investigating ? "Investigating…" : "Investigate with AI"}
        </button>
        <Link
          to={`/customers/${customer.customer_id}`}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-muted px-3 text-[12.5px] font-medium text-foreground/80 transition-colors hover:text-foreground"
        >
          Full profile
        </Link>
      </div>
    </div>
  );
}

export function HeatmapPage() {
  const [phase, setPhase] = useState<"globe" | "map">("globe");
  const [selected, setSelected] = useState<CustomerListItem | null>(null);
  const [investigating, setInvestigating] = useState(false);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const { data } = useCustomers();

  const highRisk = useMemo(
    () =>
      (data ?? []).filter((c) => {
        if (c.status !== "Critical" && c.status !== "Suspicious") return false;
        if (riskFilter === "critical" && c.status !== "Critical") return false;
        if (riskFilter === "suspicious" && c.status !== "Suspicious") return false;
        return true;
      }),
    [data, riskFilter],
  );

  const overlayOpen = Boolean(selected);
  const flaggedCount = highRisk.length;
  const zoneCount = activeZone
    ? highRisk.filter((c) => c.district === activeZone).length
    : flaggedCount;

  const handleClose = () => {
    setSelected(null);
    setInvestigating(false);
  };

  const handleZoneClick = (zone: string) => {
    setActiveZone((prev) => (prev === zone ? null : zone));
  };

  const clearFilters = () => {
    setActiveZone(null);
    setRiskFilter("all");
  };

  const hasActiveFilters = activeZone !== null || riskFilter !== "all";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 pt-6">
        <h2 className="text-xl font-semibold tracking-tight">Tirana risk map</h2>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: CRIT_RED }} /> Critical
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: AMBER }} /> Suspicious
            </span>
          </div>
          <span className="h-4 w-px bg-border" />
          <span className="mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {zoneCount} flagged
          </span>
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              hasActiveFilters
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Filter className="h-3 w-3" />
            Filter
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
              {/* Zone filter */}
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Zone:</span>
                <div className="flex flex-wrap gap-1.5">
                  {TIRANA_ZONES.map((z) => (
                    <button
                      key={z.name}
                      onClick={() => handleZoneClick(z.name)}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                        activeZone === z.name
                          ? "bg-primary/15 text-primary border border-primary/40"
                          : "border border-border bg-background/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {z.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk level filter */}
              <div className="flex items-center gap-2 border-l border-border pl-3">
                <span className="text-xs text-muted-foreground">Risk:</span>
                {(["all", "critical", "suspicious"] as RiskFilter[]).map((level) => {
                  const colors: Record<RiskFilter, string> = { all: "var(--color-foreground)", critical: CRIT_RED, suspicious: AMBER };
                  const labels: Record<RiskFilter, string> = { all: "All", critical: "Critical", suspicious: "Suspicious" };
                  return (
                    <button
                      key={level}
                      onClick={() => setRiskFilter(level)}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                        riskFilter === level
                          ? "border border-primary/40 bg-primary/10"
                          : "border border-border bg-background/40 text-muted-foreground hover:text-foreground"
                      }`}
                      style={riskFilter === level ? { color: colors[level] } : undefined}
                    >
                      {labels[level]}
                    </button>
                  );
                })}
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="ml-auto inline-flex items-center gap-1 rounded-md border border-border bg-background/40 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-3 w-3" /> Clear all
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active zone indicator */}
      {activeZone && !showFilters && (
        <div className="flex items-center gap-2 border-b border-border px-6 py-2.5">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">{activeZone}</span>
          <button
            onClick={() => setActiveZone(null)}
            className="ml-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
          <span className="mono ml-auto text-[10px] text-muted-foreground">
            {zoneCount} flagged in zone
          </span>
        </div>
      )}

      {/* Map area */}
      <div className="relative h-[600px] w-full overflow-hidden">
        <AnimatePresence mode="wait">
          {phase === "globe" && (
            <motion.div
              key="globe"
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <EarthIntro onDone={() => setPhase("map")} />
            </motion.div>
          )}
        </AnimatePresence>

        {phase === "map" && (
          <motion.div
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`h-full w-full transition-[filter,opacity] duration-300 ${
              overlayOpen ? "pointer-events-none blur-[2px] opacity-60" : ""
            }`}
          >
            <TiranaMap
              customers={highRisk}
              onSelect={setSelected}
              height={600}
              activeZone={activeZone}
              onZoneClick={handleZoneClick}
              maxMarkers={activeZone ? 200 : 40}
            />
          </motion.div>
        )}
      </div>

      <FocusCard
        open={overlayOpen}
        onClose={handleClose}
        width={investigating ? "max-w-4xl" : "max-w-lg"}
      >
        {selected && (
          <div className="flex max-h-[70vh] gap-0">
            <div className={investigating ? "w-1/2 shrink-0" : "w-full"}>
              <InvestigationCard
                customer={selected}
                onInvestigate={() => setInvestigating(true)}
                investigating={investigating}
              />
            </div>

            <AnimatePresence>
              {investigating && (
                <motion.div
                  key="chat-card"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "50%", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col overflow-hidden border-l border-border"
                >
                  <div className="flex items-center gap-2 border-b border-border px-5 py-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Bot className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                    <h4 className="text-[13px] font-semibold">AI Investigation</h4>
                  </div>
                  <div className="min-h-0 flex-1 p-4">
                    <AiChatPanel customerId={selected.customer_id} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </FocusCard>
    </div>
  );
}
