import { ChevronRight, Activity } from "lucide-react";
import type { DistressAsset } from "@/types";
import { severityClass, severityLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

interface AssetListProps {
  assets: DistressAsset[];
  selectedId: string | null;
  onSelect: (asset: DistressAsset) => void;
}

export function AssetList({ assets, selectedId, onSelect }: AssetListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-neon-red" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-200">
              Asset Watchlist
            </div>
            <div className="text-[10px] text-slate-500">
              {assets.length} positions monitored
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {assets.map((asset) => {
          const selected = asset.asset_id === selectedId;
          const label = severityLabel(asset.distress_score);
          return (
            <button
              key={asset.asset_id}
              onClick={() => onSelect(asset)}
              className={`group w-full border-b border-white/5 px-4 py-3 text-left transition-colors ${
                selected
                  ? "bg-neon-red/5 border-l-2 border-l-neon-red"
                  : "hover:bg-white/3 border-l-2 border-l-transparent"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Badge tone="slate">{asset.ticker}</Badge>
                    <span className="text-xs text-slate-500">
                      {asset.debt_maturity_year}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-sm font-medium text-slate-100">
                    {asset.owner_reit}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-slate-500">
                    {asset.address}
                  </div>
                </div>
                <div className="flex w-[64px] shrink-0 flex-col items-end gap-1 tabular-nums">
                  <span
                    className={`font-mono text-xl font-semibold leading-none ${severityClass(
                      asset.distress_score,
                    )}`}
                  >
                    {asset.distress_score.toFixed(0)}
                  </span>
                  <Badge
                    tone={
                      label === "HIGH"
                        ? "red"
                        : label === "MEDIUM"
                        ? "yellow"
                        : "green"
                    }
                  >
                    {label}
                  </Badge>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                <span>{asset.top_red_flags[0] ?? "—"}</span>
                <ChevronRight
                  className={`h-3.5 w-3.5 transition-transform ${
                    selected ? "translate-x-0.5 text-neon-red" : "text-slate-600"
                  }`}
                />
              </div>
            </button>
          );
        })}
        {assets.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-500">
            No assets match current filters.
          </div>
        )}
      </div>
    </div>
  );
}
