import { createFileRoute } from "@tanstack/react-router";
import { Users, AlertTriangle, MapPin, Euro, Zap } from "lucide-react";
import { AppShell } from "@/components/voltguard/AppShell";
import { customers, stats } from "@/lib/voltguard-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nero AI — Command Center" },
      { name: "description", content: "Tirana grid fraud overview dashboard." },
    ],
  }),
  component: Dashboard,
});

// Palette sampled from the reference screenshot
const SALMON = "#F4A89A";  // critical risk numbers + pills (soft coral on dark)
const RING_RED = "#EF4444"; // donut ring + Critical legend dot
const MINT = "#10B981";    // Normal — Secondary
const AMBER = "#F59E0B";   // Suspicious — Primary

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "critical";
}) {
  const labelColor = tone === "critical" ? SALMON : "var(--color-muted-foreground)";
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div
        className="mono flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]"
        style={{ color: labelColor }}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-4 text-4xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function RiskDonut() {
  // Match the reference: thick solid red ring on dark track, large size.
  return (
    <div className="relative grid place-items-center">
      <svg width="280" height="280" viewBox="0 0 200 200">
        <circle
          cx="100" cy="100" r="72" fill="none"
          stroke="var(--color-muted)" strokeWidth="2"
        />
        <circle
          cx="100" cy="100" r="72" fill="none"
          stroke={RING_RED} strokeWidth="44"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-4xl font-bold tracking-tight">1k</div>
        <div className="mono mt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Total
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const top = customers.slice(0, 10);
  return (
    <AppShell eyebrow="Command Center" title="Tirana grid fraud overview">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total Customers" value={stats.totalCustomers.toLocaleString()} />
        <StatCard icon={AlertTriangle} label="High-Risk Customers" value={String(stats.highRiskCustomers)} tone="critical" />
        <StatCard icon={MapPin} label="High-Risk Areas" value={String(stats.highRiskAreas)} />
        <StatCard icon={Euro} label="Est. Financial Losses" value={`€${stats.estLosses.toLocaleString()}`} />
        <StatCard icon={Zap} label="Anomalies Detected" value={String(stats.anomalies)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-border bg-card lg:col-span-2">
          {/* Subheader strip */}
          <div className="border-b border-border bg-muted/40 px-6 py-4">
            <h2 className="text-base font-semibold">Top 10 high-risk customers</h2>
          </div>
          <div className="px-6 py-2">
            {top.map((c, i) => (
              <div key={c.id} className="flex items-center gap-4 py-3">
                <div className="mono w-6 text-sm text-muted-foreground">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="mono text-xs text-muted-foreground">
                    {c.district} · {c.property}
                  </div>
                </div>
                <div className="mono text-sm" style={{ color: SALMON }}>€{c.loss}</div>
                <div
                  className="mono text-lg font-bold w-8 text-right"
                  style={{ color: SALMON }}
                >
                  {c.risk}
                </div>
                <span
                  className="mono inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.14em]"
                  style={{
                    color: SALMON,
                    borderColor: `${SALMON}55`,
                    background: `${SALMON}14`,
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: SALMON }} />
                  Critical
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold">Risk distribution</h2>
          <div className="mt-6 grid place-items-center">
            <RiskDonut />
          </div>
          <div className="mt-6 flex flex-col items-center gap-2 text-sm">
            <div className="flex items-center gap-6">
              <span className="mono flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: MINT }} />
                Normal {stats.normal}
              </span>
              <span className="mono flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: AMBER }} />
                Suspicious {stats.suspicious}
              </span>
            </div>
            <span className="mono flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: RING_RED }} />
              Critical {stats.critical}
            </span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

