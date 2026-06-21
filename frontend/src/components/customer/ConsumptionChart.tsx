import {
  Area,
  ComposedChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { monthLabel, CRIT_RED, AMBER } from "../../lib/risk";
import type { CustomerConsumptionPoint } from "../../types/domain";

interface Row {
  label: string;
  kwh: number;
  anomaly: number;
  marker: number | null;
  kind: "drop" | "high" | "flag" | null;
}

function buildRows(history: CustomerConsumptionPoint[]): Row[] {
  return history.map((p, i) => {
    const prev = i > 0 ? history[i - 1].consumption_kwh : p.consumption_kwh;
    const delta = prev ? (p.consumption_kwh - prev) / prev : 0;
    let kind: Row["kind"] = null;
    if (p.anomaly) kind = delta > 0 ? "high" : "drop";
    else if (delta <= -0.35) kind = "drop";
    else if (delta >= 0.4) kind = "high";
    return {
      label: `${monthLabel(p.month)} ${String(p.year).slice(2)}`,
      kwh: Math.round(p.consumption_kwh),
      anomaly: p.anomaly,
      marker: kind ? Math.round(p.consumption_kwh) : null,
      kind,
    };
  });
}

function AnomalyDot(props: any) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload?.kind) return null;
  const color = payload.kind === "drop" ? CRIT_RED : AMBER;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={color} fillOpacity={0.18} />
      <circle cx={cx} cy={cy} r={3} fill={color} />
    </g>
  );
}

export function ConsumptionChart({ data }: { data: CustomerConsumptionPoint[] }) {
  const rows = buildRows(data);
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold">Consumption history</h3>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: CRIT_RED }} /> drop
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: AMBER }} /> spike
          </span>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="kwhFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={AMBER} stopOpacity={0.3} />
                <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: "oklch(0.70 0.02 260)", fontSize: 10 }}
              axisLine={{ stroke: "oklch(1 0 0 / 8%)" }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={20}
            />
            <YAxis
              tick={{ fill: "oklch(0.70 0.02 260)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "oklch(0.20 0.018 260)",
                border: "1px solid oklch(1 0 0 / 8%)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "oklch(0.70 0.02 260)" }}
              formatter={(v: any) => [`${v} kWh`, "Consumption"]}
            />
            <Area
              type="monotone"
              dataKey="kwh"
              stroke={AMBER}
              strokeWidth={2}
              fill="url(#kwhFill)"
            />
            <Scatter dataKey="marker" shape={<AnomalyDot />} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
