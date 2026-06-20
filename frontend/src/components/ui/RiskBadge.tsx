import type { RiskStatus } from "../../types/domain";

const config: Record<RiskStatus, { bg: string; text: string; border: string; dot: string }> = {
  Normal: {
    bg: "rgba(16,185,129,0.10)",
    text: "#10B981",
    border: "rgba(16,185,129,0.30)",
    dot: "#10B981",
  },
  Suspicious: {
    bg: "rgba(245,158,11,0.10)",
    text: "#F59E0B",
    border: "rgba(245,158,11,0.30)",
    dot: "#F59E0B",
  },
  Critical: {
    bg: "rgba(239,68,68,0.10)",
    text: "#EF4444",
    border: "rgba(239,68,68,0.32)",
    dot: "#EF4444",
  },
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
      <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-3/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] font-medium text-text-subtle">
        <span className="h-1.5 w-1.5 rounded-full bg-text-subtle/60" />
        N/A
      </span>
    );
  }
  const c = config[status as RiskStatus];
  const sizing =
    size === "md"
      ? "px-2.5 py-1 text-[11px]"
      : "px-2 py-0.5 text-[10px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-mono uppercase tracking-[0.06em] font-medium ${sizing}`}
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.dot }} />
      {status}
    </span>
  );
}
