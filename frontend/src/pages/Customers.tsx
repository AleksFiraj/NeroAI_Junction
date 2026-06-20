import { motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCustomers } from "../hooks/useCustomers";
import { eur, riskColor } from "../lib/risk";
import { RiskBadge } from "../components/ui/RiskBadge";
import type { CustomerListItem } from "../types/domain";

function CustomerCard({ c, index }: { c: CustomerListItem; index: number }) {
  const score = c.risk_score ?? 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.015, 0.3) }}
    >
      <Link
        to={`/customers/${c.customer_id}`}
        className="group block rounded-xl border border-border bg-surface-1 p-4 transition-colors hover:border-border-strong hover:bg-surface-2/40"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold"
              style={{ background: `${riskColor(score)}22`, color: riskColor(score) }}
            >
              {(c.name || "?").charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-text">{c.name}</p>
              <p className="truncate font-mono text-[10.5px] text-text-subtle">{c.customer_id}</p>
            </div>
          </div>
          <RiskBadge status={c.status} />
        </div>

        <div className="mt-3 flex items-center justify-between text-[11.5px] text-text-muted">
          <span className="truncate">{c.district}</span>
          <span>{c.property_type}</span>
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-subtle">Risk</p>
            <p
              className="font-mono text-[20px] font-semibold tabular"
              style={{ color: riskColor(score) }}
            >
              {Math.round(score)}
            </p>
          </div>
          {(c.estimated_loss_eur ?? 0) > 0 && (
            <span className="text-[11px] text-text-muted">{eur(c.estimated_loss_eur)}</span>
          )}
        </div>
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
    // Default view: a mixed sample of risk levels.
    return [...base].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));
  }, [data, query]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, ID, or district..."
            className="w-full rounded-md border border-border bg-surface-1 py-2 pl-9 pr-3 text-[13px] text-text placeholder:text-text-subtle focus:border-accent focus:outline-none"
          />
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-text-subtle">
          {filtered.length} customers
        </span>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface-1 px-3 font-mono text-[11px] uppercase tracking-[0.06em] text-text-muted transition-colors hover:border-border-strong hover:text-text">
          <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
          Filter
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.slice(0, 60).map((c, i) => (
            <CustomerCard key={c.customer_id} c={c} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
