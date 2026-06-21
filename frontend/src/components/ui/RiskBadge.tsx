import type { RiskStatus } from "../../types/domain";
import { SALMON, CRIT_RED, AMBER, MINT } from "../../lib/risk";

const config: Record<RiskStatus, { color: string }> = {
  Normal: { color: MINT },
  Suspicious: { color: AMBER },
  Critical: { color: CRIT_RED },
};

export function RiskBadge({
  status,
  size = "sm",
}: {
  status?: RiskStatus | string | null;
  size?: "sm" | "md";
}) {
  if (!status || !(status in config)) {
    return (
      <span className="mono inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground border-border">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        N/A
      </span>
    );
  }
  const c = config[status as RiskStatus];
  const sizing = size === "md" ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[10px]";

  return (
    <span
      className={`mono inline-flex items-center gap-1.5 rounded-md border uppercase tracking-[0.14em] ${sizing}`}
      style={{
        color: status === "Critical" ? SALMON : c.color,
        borderColor: `${c.color}55`,
        background: `color-mix(in oklab, ${c.color} 12%, transparent)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
      {status}
    </span>
  );
}
