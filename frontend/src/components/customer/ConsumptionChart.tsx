import {
  Area,
  ComposedChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { monthLabel } from "../../lib/risk";
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
  const color = payload.kind === "drop" ? "#EF4444" : "#F59E0B";
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
    <div className="rounded-xl border border-border bg-surface-1 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-text">Consumption history</h3>
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: "#EF4444" }} /> drop
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: "#F59E0B" }} /> spike
          </span>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="kwhFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: "#64748B", fontSize: 10 }}
              axisLine={{ stroke: "#1F2937" }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={20}
            />
            <YAxis
              tick={{ fill: "#64748B", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0F1524",
                border: "1px solid #334155",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: "#94A3B8" }}
              formatter={(v: any) => [`${v} kWh`, "Consumption"]}
            />
            <Area
              type="monotone"
              dataKey="kwh"
              stroke="#3B82F6"
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
