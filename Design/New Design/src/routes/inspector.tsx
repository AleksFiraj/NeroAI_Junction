import { createFileRoute } from "@tanstack/react-router";
import { Search, HelpCircle, XCircle, CheckCircle2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/voltguard/AppShell";
import { customers, type Customer } from "@/lib/voltguard-data";

export const Route = createFileRoute("/inspector")({
  head: () => ({
    meta: [
      { title: "Nero AI — Inspector" },
      { name: "description", content: "Risk-ranked inspection queue." },
    ],
  }),
  component: InspectorPage,
});

// Palette sampled from the reference screenshot
const SALMON = "#F4A89A";   // risk numbers, Critical badge, Meter Tampering, Mark fraud — soft coral
const MINT = "#10B981";     // Resolve, explainability checks — emerald
const LAVENDER = "#F59E0B"; // Summarize button + sparkles — amber (AI accent)

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-base font-semibold">{value}</div>
    </div>
  );
}

function Finding({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4" style={{ color: MINT }} />
        <div>
          <div className="font-semibold">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{body}</div>
        </div>
      </div>
    </div>
  );
}

function InspectorPage() {
  const queue = useMemo(() => customers.filter((c) => c.risk >= 90).slice(0, 18), []);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(queue[0].id);
  const filteredQueue = q
    ? queue.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    : queue;
  const selected: Customer = queue.find((c) => c.id === selectedId) ?? queue[0];

  return (
    <AppShell
      eyebrow="Field Inspector"
      title="Risk-ranked inspection queue"
      headerRight={
        <button className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
          <HelpCircle className="h-4 w-4" />
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Queue */}
        <div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search queue..."
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="mt-4 space-y-2">
            {filteredQueue.map((c) => {
              const active = c.id === selected.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={[
                    "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                    active
                      ? "border-primary/60 bg-primary/10"
                      : "border-border bg-card hover:border-primary/30",
                  ].join(" ")}
                >
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="mono text-xs text-muted-foreground">{c.district}</div>
                  </div>
                  <div className="mono text-lg font-bold" style={{ color: SALMON }}>{c.risk}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mono flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{selected.id}</span>
                  <span>·</span>
                  <span>{selected.district}</span>
                  <span>·</span>
                  <span>{selected.building}</span>
                </div>
                <div className="mt-1 text-xl font-semibold">{selected.name}</div>
              </div>
              <span
                className="mono inline-flex items-center rounded-md border px-2 py-1 text-[11px] uppercase tracking-[0.14em]"
                style={{
                  color: SALMON,
                  borderColor: `${SALMON}55`,
                  background: `${SALMON}14`,
                }}
              >
                {selected.tag ?? "Meter Tampering"}
              </span>
              <span
                className="mono inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] uppercase tracking-[0.14em]"
                style={{
                  color: SALMON,
                  borderColor: `${SALMON}55`,
                  background: `${SALMON}14`,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: SALMON }} /> Critical
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetaCell label="Profile" value={selected.archetype} />
              <MetaCell label="District" value={selected.district} />
              <MetaCell label="Building" value={selected.building} />
              <MetaCell label="Property" value={selected.property} />
              <MetaCell label="Meter type" value={selected.meterType} />
              <MetaCell label="Connection" value={selected.connectionType} />
              <MetaCell label="Exp. Winter" value={`${selected.winterKwh} kWh`} />
              <MetaCell label="Exp. Summer" value={`${selected.summerKwh} kWh`} />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  color: SALMON,
                  borderColor: `${SALMON}55`,
                  background: `${SALMON}14`,
                }}
              >
                <XCircle className="h-4 w-4" /> Mark fraud
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
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

          <section
            className="rounded-2xl border border-border p-6"
            style={{
              background: `linear-gradient(135deg, ${LAVENDER}14, var(--color-card))`,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold">
                  <Sparkles className="h-4 w-4" style={{ color: LAVENDER }} /> AI investigation summary
                </div>
                <p className="mt-2 text-sm italic text-muted-foreground">
                  Generate a concise, data-grounded brief of the most important findings.
                </p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
                style={{
                  color: LAVENDER,
                  background: `${LAVENDER}1F`,
                }}
              >
                <Sparkles className="h-4 w-4" /> Summarize
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="text-base font-semibold">Risk score</div>
              <div className="mono mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Hover for breakdown
              </div>
              <div className="mt-8 grid place-items-center">
                <div className="mono text-7xl font-bold" style={{ color: SALMON }}>{selected.risk}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="text-base font-semibold">Explainability engine</div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Finding title="Sudden drop detected" body="Sudden 69% drop in consumption compared to last quarter." />
                <Finding title="Peer deviation high" body="Usage is 7.6x lower than the building average." />
                <Finding title="Seasonal mismatch" body="Winter consumption is 77% below the expected baseline." />
                <Finding title="Low consumption persistence" body="Persistent low consumption detected for 14+ weeks." />
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
