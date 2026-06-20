import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import { riskColor } from "../../lib/risk";
import type { CustomerListItem } from "../../types/domain";

const TIRANA_CENTER: [number, number] = [41.3275, 19.8187];

export function TiranaMap({
  customers,
  onSelect,
  height = 560,
}: {
  customers: CustomerListItem[];
  onSelect: (c: CustomerListItem) => void;
  height?: number;
}) {
  const points = customers.filter((c) => c.latitude != null && c.longitude != null);

  return (
    <MapContainer
      center={TIRANA_CENTER}
      zoom={12}
      className="w-full overflow-hidden rounded-xl"
      style={{ height, background: "#0A0F1C" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
      />
      {points.map((c) => {
        const color = riskColor(c.risk_score);
        const radius = c.status === "Critical" ? 9 : 6;
        return (
          <CircleMarker
            key={c.customer_id}
            center={[c.latitude as number, c.longitude as number]}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.55,
              weight: 1.5,
            }}
            eventHandlers={{ click: () => onSelect(c) }}
          >
            <Tooltip className="risk-tooltip" direction="top" offset={[0, -6]}>
              <div className="space-y-0.5">
                <p className="text-[12px] font-semibold text-text">{c.name}</p>
                <p className="text-[11px] text-text-muted">
                  {c.district} · risk{" "}
                  <span style={{ color, fontWeight: 600 }}>{Math.round(c.risk_score ?? 0)}</span>
                </p>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
