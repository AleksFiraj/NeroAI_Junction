import { createFileRoute } from "@tanstack/react-router";
import { Plus, Minus } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/voltguard/AppShell";
import { EarthIntro } from "@/components/voltguard/EarthIntro";
import { customers, riskLevel } from "@/lib/voltguard-data";

export const Route = createFileRoute("/heatmap")({
  head: () => ({
    meta: [
      { title: "Nero AI — Heatmap" },
      { name: "description", content: "Tirana risk heatmap of flagged customers." },
    ],
  }),
  component: HeatmapPage,
});

// Hash a string deterministically to a pseudo-position
function pos(seed: string, salt: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i) + salt) >>> 0;
  return ((h % 10000) / 10000);
}

function HeatmapPage() {
  const [introDone, setIntroDone] = useState(false);
  const flagged = customers.filter((c) => c.risk >= 40).slice(0, 180);
  const flaggedCount = customers.filter((c) => c.risk >= 40).length;

  // Palette synced with Dashboard / Customers / Inspector
  const SALMON = "#F4A89A";   // critical
  const CRIT_RED = "#EF4444"; // critical accent / glow
  const AMBER = "#F59E0B";    // suspicious

  return (
    <AppShell eyebrow="Geographic Intelligence" title="Tirana risk heatmap">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        {/* Title + legend bar */}
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="text-xl font-semibold tracking-tight">Tirana risk map</h2>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: CRIT_RED }} /> Critical
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: AMBER }} /> Suspicious
            </span>
            <span className="mono pl-3 text-muted-foreground border-l border-border">{flaggedCount} flagged</span>
          </div>
        </div>

        {/* Map area */}
        <div className="relative mt-4 h-[640px] w-full overflow-hidden">
          {!introDone && <EarthIntro onDone={() => setIntroDone(true)} />}
          {/* faint street-grid backdrop */}
          <svg className="absolute inset-0 h-full w-full opacity-[0.07]" preserveAspectRatio="none" viewBox="0 0 100 100">
            <defs>
              <pattern id="grid" width="6" height="6" patternUnits="userSpaceOnUse">
                <path d="M 6 0 L 0 0 0 6" fill="none" stroke="white" strokeWidth="0.15" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
            <path d="M0,60 C20,55 40,75 60,65 S95,70 100,55" stroke="white" strokeWidth="0.4" fill="none" />
            <path d="M10,90 C25,75 50,80 70,55 S95,30 100,20" stroke="white" strokeWidth="0.3" fill="none" />
          </svg>

          {/* Zoom controls */}
          <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
            <button className="grid h-9 w-9 place-items-center rounded-md bg-muted text-foreground hover:bg-accent">
              <Plus className="h-4 w-4" />
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-md bg-muted text-foreground hover:bg-accent">
              <Minus className="h-4 w-4" />
            </button>
          </div>

          {/* Risk dots */}
          {flagged.map((c) => {
            const x = pos(c.id, 1) * 92 + 4;
            const y = pos(c.id, 7) * 84 + 8;
            const isCritical = riskLevel(c.risk) === "critical";
            const color = isCritical ? CRIT_RED : AMBER;
            const size = isCritical ? 14 : 12;
            return (
              <span
                key={c.id}
                className="absolute rounded-full"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: size,
                  height: size,
                  background: color,
                  opacity: 0.7,
                  boxShadow: `0 0 ${size * 2}px ${color}`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

