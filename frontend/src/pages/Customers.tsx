import { motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCustomers } from "../hooks/useCustomers";
import { eur, SALMON, AMBER, MINT } from "../lib/risk";
import { RiskBadge } from "../components/ui/RiskBadge";
import { LossTooltip } from "../components/ui/LossTooltip";
import type { CustomerListItem } from "../types/domain";

function CustomerCard({ c, index }: { c: CustomerListItem; index: number }) {
  const score = c.risk_score ?? 0;
  const initial = (c.name || "?").charAt(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.015, 0.3) }}
    >
      <Link
        to={`/customers/${c.customer_id}`}
        className="group block rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
      >
        <div className="flex items-start gap-3">
          <div
            className="grid h-9 w-9 place-items-center rounded-md text-sm font-semibold"
            style={{ background: `color-mix(in oklab, ${AMBER} 18%, transparent)`, color: AMBER }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold leading-tight truncate">{c.name}</div>
            <div className="mono text-[11px] text-muted-foreground">{c.customer_id}</div>
          </div>
          <RiskBadge status={c.status} />
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Risk</div>
            <div className="mono text-3xl font-bold leading-none" style={{ color: SALMON }}>{Math.round(score)}</div>
          </div>
          <div className="text-right text-sm">
            <div className="text-foreground/90">{c.district}</div>
            <div className="text-muted-foreground">{c.property_type}</div>
          </div>
        </div>

        {(c.estimated_loss_eur ?? 0) > 0 && (
          <div className="mt-4 flex items-center justify-end gap-1 border-t border-border pt-3 mono text-sm" style={{ color: MINT }}>
            {eur(c.estimated_loss_eur)}
            <LossTooltip label={c.loss_label} />
          </div>
        )}
      </Link>
    </motion.div>
  );
}

export function CustomersPage() {
  const { data, isLoading } = useCustomers();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const base = q
      ? data.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.customer_id.toLowerCase().includes(q) ||
            c.district.toLowerCase().includes(q),
        )
      : data;
    return [...base].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));
  }, [data, query]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, ID, or district..."
            className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div className="mono text-xs text-muted-foreground sm:px-3">
          {(data ?? []).length.toLocaleString()} customers
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm hover:border-primary/40">
          <SlidersHorizontal className="h-4 w-4" /> Filter
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.slice(0, 48).map((c, i) => (
            <CustomerCard key={c.customer_id} c={c} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
