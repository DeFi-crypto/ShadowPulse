import type { DistressAsset, GeoJSONResponse, MapDataResponse } from "@/types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

function buildParams(filters: {
  maturity?: number | null;
  category?: string | null;
  minScore?: number | null;
}): string {
  const params = new URLSearchParams();
  if (filters.maturity) params.set("maturity", String(filters.maturity));
  if (filters.category) params.set("category", filters.category);
  if (filters.minScore) params.set("min_score", String(filters.minScore));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchAssets(filters: {
  maturity?: number | null;
  category?: string | null;
  minScore?: number | null;
}): Promise<MapDataResponse> {
  const res = await fetch(`${API_BASE}/api/assets${buildParams(filters)}`);
  if (!res.ok) throw new Error(`assets ${res.status}`);
  return res.json();
}

export async function fetchAsset(assetId: string): Promise<DistressAsset> {
  const res = await fetch(`${API_BASE}/api/assets/${assetId}`);
  if (!res.ok) throw new Error(`asset ${res.status}`);
  return res.json();
}

export async function fetchMapData(filters: {
  maturity?: number | null;
  category?: string | null;
  minScore?: number | null;
}): Promise<GeoJSONResponse> {
  const res = await fetch(`${API_BASE}/api/map-data${buildParams(filters)}`);
  if (!res.ok) throw new Error(`map-data ${res.status}`);
  return res.json();
}
