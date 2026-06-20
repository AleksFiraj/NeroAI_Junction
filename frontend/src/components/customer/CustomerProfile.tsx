import type { ReactNode } from "react";
import { useCustomer } from "../../hooks/useCustomer";
import { useRisk } from "../../hooks/useRisk";
import { AiSummaryCard } from "../ai/AiSummaryCard";
import { RiskBadge } from "../ui/RiskBadge";
import { ConsumptionChart } from "./ConsumptionChart";
import { RiskScoreCard } from "./RiskScoreCard";
import { TriggerChecklist } from "./TriggerChecklist";

function Skeleton() {
  return (
    <div className="space-y-5">
      <div className="h-24 animate-pulse rounded-xl bg-surface-2" />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-xl bg-surface-2 lg:col-span-2" />
        <div className="h-64 animate-pulse rounded-xl bg-surface-2" />
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-surface-2" />
    </div>
  );
}

export function CustomerProfile({
  customerId,
  actions,
}: {
  customerId: string;
  actions?: ReactNode;
}) {
  const customer = useCustomer(customerId);
  const risk = useRisk(customerId);

  if (customer.isLoading || risk.isLoading) return <Skeleton />;
  if (customer.isError || !customer.data) {
    return (
      <div className="rounded-xl border border-critical/30 bg-critical/5 p-6 text-[13px] text-critical">
        Customer data unavailable.
      </div>
    );
  }

  const c = customer.data;
  const p = c.customer_profile as Record<string, unknown>;
  const winter = p?.expected_winter_kwh as number | undefined;
  const summer = p?.expected_summer_kwh as number | undefined;

  const profileItems = [
    { label: "Archetype", value: String(p?.archetype ?? "-") },
    { label: "District", value: c.district },
    { label: "Building", value: c.building_id },
    { label: "Property", value: c.property_type },
    { label: "Occupants", value: String(c.occupants) },
    { label: "Area", value: `${c.area_m2?.toFixed(0)} m2` },
    { label: "Exp. winter", value: winter ? `${winter.toFixed(0)} kWh` : "-" },
    { label: "Exp. summer", value: summer ? `${summer.toFixed(0)} kWh` : "-" },
  ];

  const components = {
    personal_anomaly: risk.data?.personal_anomaly ?? 0,
    seasonal_deviation: risk.data?.seasonal_deviation ?? 0,
    peer_deviation: risk.data?.peer_deviation ?? 0,
    geographic_anomaly: risk.data?.geographic_anomaly ?? 0,
  };

  return (
    <div className="space-y-5">
      {/* Profile header */}
      <div className="rounded-xl border border-border bg-surface-1 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 font-mono text-[15px] font-semibold text-accent">
              {(c.name || "?").charAt(0)}
            </div>
            <div>
              <h2 className="text-[18px] font-semibold tracking-tight text-text">{c.name}</h2>
              <p className="mt-0.5 font-mono text-[11.5px] text-text-muted">
                {c.customer_id} · {c.district} · {c.building_id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {c.fraud_type && (
              <span className="rounded-md border border-critical/40 bg-critical/10 px-2.5 py-1 text-[11px] font-medium text-critical">
                {c.fraud_type}
              </span>
            )}
            <RiskBadge status={risk.data?.status} size="md" />
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {profileItems.map((it) => (
            <div key={it.label} className="rounded-md border border-border bg-surface-2/40 px-3 py-2">
              <dt className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-subtle">
                {it.label}
              </dt>
              <dd className="mt-0.5 text-[12.5px] font-medium text-text">{it.value}</dd>
            </div>
          ))}
        </dl>

        {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
      </div>

      {/* AI summary (below info, above risk) */}
      <AiSummaryCard customerId={customerId} />

      {/* Risk + triggers */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <RiskScoreCard
            riskScore={risk.data?.risk_score ?? 0}
            confidence={risk.data?.confidence_score ?? 0}
            status={risk.data?.status ?? "Normal"}
            estimatedLoss={risk.data?.estimated_loss_eur}
            components={components}
          />
        </div>
        <div className="lg:col-span-2">
          <TriggerChecklist triggers={risk.data?.triggers ?? []} />
        </div>
      </div>

      {/* Consumption */}
      <ConsumptionChart data={c.consumption_history} />
    </div>
  );
}
