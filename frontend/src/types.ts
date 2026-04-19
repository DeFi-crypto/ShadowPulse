export type Severity = "high" | "medium" | "low";
export type DistressCategory = "operational" | "financial" | "hybrid";

export interface TenantExposure {
  name: string;
  pct_abr: number;
  sector?: string | null;
}

export interface SECPulse {
  ticker: string;
  filing_date?: string | null;
  npl_current?: number | null;
  npl_previous?: number | null;
  npl_delta_pct?: number | null;
  acl_commercial?: number | null;
  acl_commercial_previous?: number | null;
  top_tenants: TenantExposure[];
  source_url?: string | null;
}

export interface WARNPulse {
  warn_count: number;
  headlines: string[];
  nearest_miles?: number | null;
}

export interface LienPulse {
  lien_status: "clear" | "pending" | "filed";
  count: number;
  filings: string[];
}

export interface SentimentPulse {
  vibe: "positive" | "neutral" | "cautionary" | "negative" | "critical";
  score: number;
  flagged_reviews: string[];
  keywords: string[];
}

export interface DistressSignals {
  sec_data: SECPulse;
  warn: WARNPulse;
  lien: LienPulse;
  sentiment: SentimentPulse;
}

export interface DistressAsset {
  asset_id: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  owner_reit: string;
  ticker: string;
  asset_type: "office" | "retail" | "mixed_use" | "industrial";
  debt_maturity_year: number;
  distress_category: DistressCategory;
  distress_score: number;
  top_red_flags: string[];
  institutional_verdict?: string | null;
  signals: DistressSignals;
}

export interface MapDataResponse {
  assets: DistressAsset[];
  generated_at: string;
  source: "live" | "mock" | "hybrid";
}

export interface GeoFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    asset_id: string;
    address: string;
    owner_reit: string;
    ticker: string;
    asset_type: string;
    debt_maturity_year: number;
    distress_category: DistressCategory;
    distress_score: number;
    top_red_flags: string[];
    severity: Severity;
  };
}

export interface GeoJSONResponse {
  type: "FeatureCollection";
  features: GeoFeature[];
  generated_at: string;
  source: string;
}
