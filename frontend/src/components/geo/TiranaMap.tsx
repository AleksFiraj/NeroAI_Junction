import { useEffect, useRef } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { riskColor, SALMON } from "../../lib/risk";
import type { CustomerListItem } from "../../types/domain";

const TIRANA_CENTER: [number, number] = [41.3275, 19.8187];

export interface ZoneDef {
  name: string;
  center: [number, number];
  bounds: [number, number][];
}

export const TIRANA_ZONES: ZoneDef[] = [
  {
    name: "Tiranë Center",
    center: [41.3275, 19.8187],
    bounds: [[41.3225,19.8090],[41.3225,19.8280],[41.3325,19.8280],[41.3325,19.8090]],
  },
  {
    name: "Blloku",
    center: [41.3208, 19.8164],
    bounds: [[41.3165,19.8090],[41.3165,19.8240],[41.3250,19.8240],[41.3250,19.8090]],
  },
  {
    name: "Kinostudio",
    center: [41.345, 19.8478],
    bounds: [[41.3390,19.8380],[41.3390,19.8580],[41.3510,19.8580],[41.3510,19.8380]],
  },
  {
    name: "Laprakë",
    center: [41.3395, 19.7944],
    bounds: [[41.3330,19.7830],[41.3330,19.8060],[41.3460,19.8060],[41.3460,19.7830]],
  },
  {
    name: "Kombinat",
    center: [41.3142, 19.7669],
    bounds: [[41.3050,19.7530],[41.3050,19.7810],[41.3230,19.7810],[41.3230,19.7530]],
  },
  {
    name: "Yzberisht",
    center: [41.3070, 19.7850],
    bounds: [[41.2990,19.7720],[41.2990,19.7980],[41.3150,19.7980],[41.3150,19.7720]],
  },
  {
    name: "Astir",
    center: [41.3100, 19.8050],
    bounds: [[41.3030,19.7940],[41.3030,19.8160],[41.3170,19.8160],[41.3170,19.7940]],
  },
  {
    name: "Ali Demi",
    center: [41.3275, 19.8294],
    bounds: [[41.3220,19.8210],[41.3220,19.8380],[41.3330,19.8380],[41.3330,19.8210]],
  },
  {
    name: "Sauk",
    center: [41.3000, 19.8333],
    bounds: [[41.2920,19.8210],[41.2920,19.8460],[41.3080,19.8460],[41.3080,19.8210]],
  },
  {
    name: "Fresku",
    center: [41.3453, 19.8562],
    bounds: [[41.3400,19.8460],[41.3400,19.8660],[41.3510,19.8660],[41.3510,19.8460]],
  },
];

function MapController({
  zone,
  defaultCenter,
  defaultZoom,
}: {
  zone: string | null;
  defaultCenter: [number, number];
  defaultZoom: number;
}) {
  const map = useMap();
  const prevZone = useRef<string | null>(null);

  useEffect(() => {
    if (zone === prevZone.current) return;
    prevZone.current = zone;

    if (!zone) {
      map.flyTo(defaultCenter, defaultZoom, { duration: 0.8 });
    } else {
      const z = TIRANA_ZONES.find((z) => z.name === zone);
      if (z) {
        map.flyTo(z.center, 15, { duration: 0.8 });
      }
    }
  }, [zone, map, defaultCenter, defaultZoom]);

  return null;
}

const labelIcon = (name: string) =>
  L.divIcon({
    className: "",
    html: `<span style="
      font-size:10px;
      font-weight:600;
      letter-spacing:0.06em;
      color:rgba(255,255,255,0.55);
      text-transform:uppercase;
      white-space:nowrap;
      pointer-events:none;
      text-shadow: 0 1px 4px rgba(0,0,0,0.7);
    ">${name}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

export function TiranaMap({
  customers,
  onSelect,
  height = 560,
  activeZone = null,
  onZoneClick,
  maxMarkers = 60,
}: {
  customers: CustomerListItem[];
  onSelect: (c: CustomerListItem) => void;
  height?: number;
  activeZone?: string | null;
  onZoneClick?: (zone: string) => void;
  maxMarkers?: number;
}) {
  const points = customers.filter((c) => c.latitude != null && c.longitude != null);
  const visiblePoints = activeZone
    ? points.filter((c) => c.district === activeZone)
    : points.slice(0, maxMarkers);

  return (
    <MapContainer
      center={TIRANA_CENTER}
      zoom={12}
      className="w-full overflow-hidden rounded-xl"
      style={{ height, background: "oklch(0.16 0.015 260)" }}
      scrollWheelZoom
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
      />

      <MapController zone={activeZone} defaultCenter={TIRANA_CENTER} defaultZoom={12} />

      {/* Zone overlays */}
      {TIRANA_ZONES.map((z) => {
        const isActive = activeZone === z.name;
        return (
          <Polygon
            key={z.name}
            positions={z.bounds}
            pathOptions={{
              color: isActive ? "#F59E0B" : "rgba(255,255,255,0.12)",
              fillColor: isActive ? "#F59E0B" : "transparent",
              fillOpacity: isActive ? 0.08 : 0,
              weight: isActive ? 2 : 1,
              dashArray: isActive ? undefined : "4 4",
            }}
            eventHandlers={{
              click: () => onZoneClick?.(z.name),
            }}
          />
        );
      })}

      {/* Zone labels */}
      {TIRANA_ZONES.map((z) => (
        <Marker
          key={`label-${z.name}`}
          position={z.center}
          icon={labelIcon(z.name)}
          interactive={false}
        />
      ))}

      {/* Risk markers */}
      {visiblePoints.map((c) => {
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
              fillOpacity: 0.6,
              weight: 1.5,
            }}
            eventHandlers={{ click: () => onSelect(c) }}
          >
            <Tooltip className="risk-tooltip" direction="top" offset={[0, -6]}>
              <div className="space-y-0.5">
                <p className="text-[12px] font-semibold">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {c.district} · risk{" "}
                  <span style={{ color: SALMON, fontWeight: 600 }}>{Math.round(c.risk_score ?? 0)}</span>
                </p>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
