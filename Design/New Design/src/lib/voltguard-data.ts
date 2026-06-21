// Mock data for Nero AI fraud engine

export type RiskLevel = "critical" | "suspicious" | "normal";

export type Customer = {
  id: string;
  name: string;
  district: string;
  property: "Apartment" | "Business" | "House";
  risk: number;
  loss: number;
  building: string;
  archetype: string;
  meterType: string;
  connectionType: string;
  winterKwh: number;
  summerKwh: number;
  tag?: string;
};

const districts = [
  "Yzberisht", "Tiranë Center", "Kinostudio", "Laprakë",
  "Blloku", "Astir", "Kombinat", "Don Bosko", "Selita", "Kashar",
];
const properties: Customer["property"][] = ["Apartment", "Business", "House"];
const archetypes = ["Young Family", "Retiree", "Single Worker", "SMB Office", "Restaurant", "Workshop"];

const firstNames = [
  "Elona", "Bujar", "Fatos", "Petrit", "Gentian", "Ardita", "Aurel", "Edmond",
  "Vera", "Fatmira", "Drita", "Arben", "Mirela", "Sokol", "Blerta", "Ilir",
  "Albana", "Klodian", "Erjon", "Anila",
];
const lastNames = [
  "Shehu", "Gjoka", "Frasheri", "Hysa", "Meta", "Leka", "Prifti", "Bardhi",
  "Kraja", "Nuhiu", "Kola", "Hoxha", "Berisha", "Dervishi", "Cela", "Bushati",
];

// deterministic PRNG so values are stable
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildCustomers(): Customer[] {
  const rand = mulberry32(42);
  const out: Customer[] = [];
  for (let i = 0; i < 1000; i++) {
    const fn = firstNames[Math.floor(rand() * firstNames.length)];
    const ln = lastNames[Math.floor(rand() * lastNames.length)];
    const district = districts[Math.floor(rand() * districts.length)];
    const property = properties[Math.floor(rand() * properties.length)];
    const r = rand();
    let risk: number;
    if (i < 12) risk = 99 - i * (rand() < 0.5 ? 0 : 1); // top of list
    else if (r < 0.105) risk = 70 + Math.floor(rand() * 30);
    else if (r < 0.155) risk = 40 + Math.floor(rand() * 30);
    else risk = Math.floor(rand() * 40);
    out.push({
      id: `CUST-${String(i).padStart(5, "0")}`,
      name: `${fn} ${ln}`,
      district,
      property,
      risk,
      loss: Math.floor(rand() * 300),
      building: `BLD-${district.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, "X")}-${String(Math.floor(rand() * 9999)).padStart(4, "0")}`,
      archetype: archetypes[Math.floor(rand() * archetypes.length)],
      meterType: ["Single-phase", "Three-phase", "Smart-meter"][Math.floor(rand() * 3)],
      connectionType: property === "Business" ? "Commercial" : "Residential",
      winterKwh: 200 + Math.floor(rand() * 600),
      summerKwh: 150 + Math.floor(rand() * 500),
      tag: rand() < 0.5 ? "Meter Tampering" : "Bypass Suspected",
    });
  }
  return out.sort((a, b) => b.risk - a.risk);
}

export const customers: Customer[] = buildCustomers();

export const stats = {
  totalCustomers: customers.length,
  highRiskCustomers: customers.filter((c) => c.risk >= 70).length,
  highRiskAreas: 0,
  estLosses: 10041,
  anomalies: 666,
  normal: customers.filter((c) => c.risk < 40).length,
  suspicious: customers.filter((c) => c.risk >= 40 && c.risk < 70).length,
  critical: customers.filter((c) => c.risk >= 70).length,
};

export function riskLevel(r: number): RiskLevel {
  if (r >= 70) return "critical";
  if (r >= 40) return "suspicious";
  return "normal";
}
