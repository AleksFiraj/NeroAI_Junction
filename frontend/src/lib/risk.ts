import type { RiskStatus } from "../types/domain";

export function riskColor(score: number | null | undefined): string {
  const s = score ?? 0;
  if (s >= 65) return "#EF4444";
  if (s >= 38) return "#F59E0B";
  return "#10B981";
}

export function statusColor(status?: RiskStatus | string | null): string {
  if (status === "Critical") return "#EF4444";
  if (status === "Suspicious") return "#F59E0B";
  return "#10B981";
}

export function eur(value: number | null | undefined): string {
  const v = value ?? 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function monthLabel(month: number): string {
  return MONTHS[(month - 1) % 12] ?? String(month);
}

export interface RiskComponents {
  personal_anomaly: number;
  seasonal_deviation: number;
  peer_deviation: number;
  geographic_anomaly: number;
}

// Weighted contribution of each pillar to the fused risk, normalized to 100%.
export function riskBreakdown(c: RiskComponents) {
  const weighted = {
    Personal: 0.3 * (c.personal_anomaly ?? 0),
    Seasonal: 0.25 * (c.seasonal_deviation ?? 0),
    Peer: 0.25 * (c.peer_deviation ?? 0),
    Geographic: 0.2 * (c.geographic_anomaly ?? 0),
  };
  const total = Object.values(weighted).reduce((a, b) => a + b, 0) || 1;
  return (Object.entries(weighted) as Array<[string, number]>).map(([label, value]) => ({
    label,
    pct: Math.round((value / total) * 100),
  }));
}
