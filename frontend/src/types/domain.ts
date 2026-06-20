export type RiskStatus = "Normal" | "Suspicious" | "Critical";

export interface TriggerOutput {
  trigger_name: string;
  group: string;
  score: number;
  threshold: string;
  evidence_window: string;
  features_used: string[];
  reason: string;
}

export interface CustomerListItem {
  customer_id: string;
  name: string;
  building_id: string;
  district: string;
  property_type: string;
  latitude: number | null;
  longitude: number | null;
  fraud_type: string | null;
  review_status: string;
  risk_score: number | null;
  confidence_score: number | null;
  estimated_loss_eur: number | null;
  status: RiskStatus | null;
}

export interface CustomerConsumptionPoint {
  year: number;
  month: number;
  season: string;
  temperature: number;
  consumption_kwh: number;
  anomaly: number;
  anomaly_type: string | null;
}

export interface CustomerDetail extends CustomerListItem {
  occupants: number;
  area_m2: number;
  latitude: number;
  longitude: number;
  customer_profile: Record<string, unknown>;
  groups_fired: number | null;
  reasons: string[];
  comparisons: Record<string, number>;
  triggers: TriggerOutput[];
  consumption_history: CustomerConsumptionPoint[];
}

export interface RiskData {
  customer_id: string;
  year: number;
  month: number;
  anomaly_score: number;
  personal_anomaly: number;
  seasonal_deviation: number;
  peer_deviation: number;
  geographic_anomaly: number;
  risk_score: number;
  confidence_score: number;
  status: RiskStatus;
  groups_fired: number;
  estimated_loss_eur: number;
  reasons: string[];
  comparisons: Record<string, number>;
  triggers: TriggerOutput[];
}

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DashboardData {
  kpis: Array<{ label: string; value: number; unit?: string }>;
  risk_distribution: Record<string, number>;
  top_risky_customers: CustomerListItem[];
  district_risk: Array<{ district: string; avg_risk: number; records: number }>;
  anomalies_over_time: Array<{ year: number; month: number; avg_risk: number; records: number }>;
}

export interface HeatmapData {
  district_summary: Array<{
    district: string;
    avg_risk: number;
    latitude: number;
    longitude: number;
    records: number;
  }>;
  building_summary: Array<{
    building_id: string;
    district: string;
    avg_risk: number;
    latitude: number;
    longitude: number;
    records: number;
  }>;
  hotspots: Array<{
    building_id: string;
    district: string;
    avg_risk: number;
    latitude: number;
    longitude: number;
    records: number;
  }>;
}
