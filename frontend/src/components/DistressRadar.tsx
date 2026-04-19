import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import type { DistressAsset } from "@/types";

interface DistressRadarProps {
  asset: DistressAsset;
}

export function DistressRadar({ asset }: DistressRadarProps) {
  const data = buildRadar(asset);
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#2A313B" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "JetBrains Mono" }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ fill: "#475569", fontSize: 9 }}
            stroke="#2A313B"
            tickCount={5}
          />
          <Radar
            name="Distress"
            dataKey="value"
            stroke="#FF3B30"
            fill="#FF3B30"
            fillOpacity={0.35}
            strokeWidth={1.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function buildRadar(asset: DistressAsset) {
  const { signals } = asset;
  const npl = Math.max(0, Math.min(100, (signals.sec_data.npl_delta_pct ?? 0) * 1.3));
  const warn = Math.max(0, Math.min(100, signals.warn.warn_count * 15));
  const sentiment = Math.max(0, Math.min(100, (1 - signals.sentiment.score) * 50 + signals.sentiment.keywords.length * 5));
  const lien =
    signals.lien.lien_status === "filed"
      ? 100
      : signals.lien.lien_status === "pending"
      ? 60
      : 0;
  const topShare = Math.max(0, ...signals.sec_data.top_tenants.map((t) => t.pct_abr));
  const tenant = Math.min(100, (topShare / 20) * 100);

  return [
    { axis: "NPL Δ", value: Math.round(npl) },
    { axis: "WARN", value: Math.round(warn) },
    { axis: "Sentiment", value: Math.round(sentiment) },
    { axis: "Lien", value: Math.round(lien) },
    { axis: "Tenant Conc.", value: Math.round(tenant) },
  ];
}
