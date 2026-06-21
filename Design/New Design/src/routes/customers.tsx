import { createFileRoute } from "@tanstack/react-router";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/voltguard/AppShell";
import { customers, riskLevel, type Customer } from "@/lib/voltguard-data";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Nero AI — Customers" },
      { name: "description", content: "Browse and search the customer base." },
    ],
  }),
  component: CustomersPage,
});

// Palette sampled from the reference screenshot
const SALMON = "#F4A89A";   // risk numbers — soft coral
const CRIT_RED = "#EF4444"; // critical pill accent
const AMBER = "#F59E0B";    // avatar / suspicious
const MINT = "#10B981";     // normal / € amounts

const toneFor = (r: number) => {
  const lvl = riskLevel(r);
  if (lvl === "critical") return CRIT_RED;
  if (lvl === "suspicious") return AMBER;
  return MINT;
};

function CustomerCard({ c }: { c: Customer }) {
  const lvl = riskLevel(c.risk);
  const pillColor = toneFor(c.risk);
  const initial = c.name.charAt(0);
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div
          className="grid h-9 w-9 place-items-center rounded-md text-sm font-semibold"
          style={{ background: `color-mix(in oklab, ${AMBER} 18%, transparent)`, color: AMBER }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold leading-tight truncate">{c.name}</div>
          <div className="mono text-[11px] text-muted-foreground">{c.id}</div>
        </div>
        <span
          className="mono inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]"
          style={{ borderColor: `${pillColor}55`, color: pillColor, background: `color-mix(in oklab, ${pillColor} 12%, transparent)` }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: pillColor }} />
          {lvl}
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Risk</div>
          <div className="mono text-3xl font-bold leading-none" style={{ color: SALMON }}>{c.risk}</div>
        </div>
        <div className="text-right text-sm">
          <div className="text-foreground/90">{c.district}</div>
          <div className="text-muted-foreground">{c.property}</div>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-3 text-right mono text-sm" style={{ color: MINT }}>
        €{c.loss}
      </div>
    </div>
  );
}

function CustomersPage() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = term
      ? customers.filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            c.id.toLowerCase().includes(term) ||
            c.district.toLowerCase().includes(term),
        )
      : customers;
    return base.slice(0, 48);
  }, [q]);

  return (
    <AppShell eyebrow="Customers" title="Browse and search the customer base">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, ID, or district..."
            className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div className="mono text-xs text-muted-foreground sm:px-3">
          {customers.length.toLocaleString()} customers
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm hover:border-primary/40">
          <SlidersHorizontal className="h-4 w-4" /> Filter
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((c) => (
          <CustomerCard key={c.id} c={c} />
        ))}
      </div>
    </AppShell>
  );
}
