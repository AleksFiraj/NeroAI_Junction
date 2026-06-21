import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  CalendarPlus,
  CheckCircle2,
  Database,
  HelpCircle,
  Loader2,
  Search,
  ShieldAlert,
  Thermometer,
  TrendingDown,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AiSummaryCard } from "../components/ai/AiSummaryCard";
import { BulkUploadForm } from "../components/inspector/BulkUploadForm";
import { NewReadingForm } from "../components/inspector/NewReadingForm";
import { useAdvanceMonth, useReviewCustomer } from "../hooks/useAdmin";
import { useCustomers } from "../hooks/useCustomers";
import { useRisk } from "../hooks/useRisk";
import { SALMON, MINT, AMBER, CRIT_RED } from "../lib/risk";
import { RiskBadge } from "../components/ui/RiskBadge";
import type { CustomerListItem } from "../types/domain";

const FINDING_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  drop: TrendingDown,
  peer: Users,
  seasonal: Thermometer,
  persistence: Activity,
  geographic: Zap,
  meter: ShieldAlert,
  default: CheckCircle2,
};

function pickIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes("drop")) return FINDING_ICONS.drop;
  if (t.includes("peer") || t.includes("building")) return FINDING_ICONS.peer;
  if (t.includes("season") || t.includes("winter") || t.includes("temperature")) return FINDING_ICONS.seasonal;
  if (t.includes("persist") || t.includes("low")) return FINDING_ICONS.persistence;
  if (t.includes("geo") || t.includes("hotspot") || t.includes("cluster")) return FINDING_ICONS.geographic;
  if (t.includes("meter") || t.includes("flat") || t.includes("integrity")) return FINDING_ICONS.meter;
  return FINDING_ICONS.default;
}

function FindingCard({ title, color }: { title: string; color: string }) {
  const Icon = pickIcon(title);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background/40 px-4 py-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${color}1a`, color }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-[12.5px] font-medium leading-tight">{title}</span>
    </div>
  );
}

function InspectorDetail({ customer }: { customer: CustomerListItem }) {
  const risk = useRisk(customer.customer_id);
  const review = useReviewCustomer();
  const reasons = risk.data?.reasons ?? [];

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="mono flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{customer.customer_id}</span>
              <span>·</span>
              <span>{customer.district}</span>
            </div>
            <div className="mt-1 text-xl font-semibold">{customer.name}</div>
          </div>
          <RiskBadge status={customer.status} size="md" />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => review.mutate({ customerId: customer.customer_id, status: "fraud" })}
            disabled={review.isPending}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
            style={{
              color: SALMON,
              borderColor: `${SALMON}55`,
              background: `${SALMON}14`,
            }}
          >
            <XCircle className="h-4 w-4" /> Mark fraud
          </button>
          <button
            onClick={() => review.mutate({ customerId: customer.customer_id, status: "resolved" })}
            disabled={review.isPending}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
            style={{
              color: MINT,
              borderColor: `${MINT}55`,
              background: `${MINT}14`,
            }}
          >
            <CheckCircle2 className="h-4 w-4" /> Resolve
          </button>
        </div>
      </section>

      {/* AI Summary */}
      <section
        className="rounded-2xl border border-border p-6"
        style={{
          background: `linear-gradient(135deg, ${AMBER}14, var(--color-card))`,
        }}
      >
        <AiSummaryCard customerId={customer.customer_id} />
      </section>

      {/* Risk Score + Explainability side by side */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
        {/* Risk score — compact */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-6">
          <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Risk score
          </div>
          <div className="mono mt-3 text-6xl font-bold" style={{ color: SALMON }}>
            {Math.round(customer.risk_score ?? 0)}
          </div>
          <div className="mono mt-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            / 100
          </div>
        </div>

        {/* Explainability findings */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-base font-semibold">Explainability engine</div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {reasons.length > 0
              ? reasons.slice(0, 6).map((r, i) => {
                  const title = r.includes(":") ? r.split(":")[0] : r.split("—")[0] || r;
                  const colors = [CRIT_RED, AMBER, MINT, SALMON];
                  return (
                    <FindingCard
                      key={i}
                      title={title.trim()}
                      color={colors[i % colors.length]}
                    />
                  );
                })
              : (
                <FindingCard title="No triggers fired" color={MINT} />
              )}
          </div>
        </div>
      </section>

      {/* Data entry */}
      <NewReadingForm customerId={customer.customer_id} />
    </div>
  );
}

export function InspectorPage() {
  const { data } = useCustomers();
  const advance = useAdvanceMonth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const queue = useMemo(
    () =>
      (data ?? [])
        .filter(
          (c) =>
            c.review_status === "open" &&
            (c.status === "Critical" || c.status === "Suspicious"),
        )
        .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0)),
    [data],
  );

  const filteredQueue = q
    ? queue.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    : queue;

  useEffect(() => {
    if (!selectedId && queue.length) setSelectedId(queue[0].customer_id);
    if (selectedId && !queue.find((c) => c.customer_id === selectedId)) {
      setSelectedId(queue[0]?.customer_id ?? null);
    }
  }, [queue, selectedId]);

  const selected = queue.find((c) => c.customer_id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      {/* Admin toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-6 py-4">
        <div>
          <h3 className="text-base font-semibold">Inspection queue</h3>
          <p className="text-xs text-muted-foreground">{queue.length} open high-risk cases</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowBulkUpload((v) => !v)}
            className={[
              "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              showBulkUpload
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border bg-muted hover:border-primary/40",
            ].join(" ")}
          >
            <Database className="h-3.5 w-3.5" strokeWidth={2} />
            Bulk upload
          </button>
          <button
            onClick={() => advance.mutate()}
            disabled={advance.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium transition-colors hover:border-primary/40 disabled:opacity-60"
          >
            {advance.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
            ) : (
              <CalendarPlus className="h-3.5 w-3.5" strokeWidth={2} />
            )}
            {advance.isPending ? "Advancing + retraining..." : "Advance month (all customers)"}
          </button>
        </div>
      </div>

      {/* Bulk Upload Panel */}
      <AnimatePresence>
        {showBulkUpload && (
          <BulkUploadForm onClose={() => setShowBulkUpload(false)} />
        )}
      </AnimatePresence>

      {/* Customer queue (horizontal scrollable list) */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search queue..."
              className="w-full rounded-lg border border-border bg-background/40 py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {filteredQueue.length} cases
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto p-4">
          {filteredQueue.map((c) => {
            const active = c.customer_id === selectedId;
            return (
              <button
                key={c.customer_id}
                onClick={() => setSelectedId(c.customer_id)}
                className={[
                  "flex shrink-0 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                  active
                    ? "border-primary/60 bg-primary/10"
                    : "border-border bg-background/40 hover:border-primary/30",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold whitespace-nowrap">{c.name}</div>
                  <div className="mono text-[11px] text-muted-foreground">{c.district}</div>
                </div>
                <div className="mono text-lg font-bold" style={{ color: SALMON }}>
                  {Math.round(c.risk_score ?? 0)}
                </div>
              </button>
            );
          })}
          {queue.length === 0 && (
            <p className="px-4 py-4 text-sm text-muted-foreground">
              Queue is clear. No open high-risk cases.
            </p>
          )}
        </div>
      </div>

      {/* Detail panel (full width) */}
      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div
            key={selected.customer_id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <InspectorDetail customer={selected} />
          </motion.div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">
            Select a case from the queue.
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
