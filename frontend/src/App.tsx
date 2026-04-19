import { useEffect, useMemo, useState } from "react";
import { Crosshair, Radar as RadarIcon, ShieldAlert } from "lucide-react";
import { fetchAssets } from "@/api";
import type { DistressAsset, DistressCategory, MapDataResponse } from "@/types";
import { AssetList } from "@/components/AssetList";
import { AssetPanel } from "@/components/AssetPanel";
import { Filters } from "@/components/Filters";
import { WarMap } from "@/components/WarMap";
import { Badge } from "@/components/ui/Badge";

interface FilterState {
  maturity: number | null;
  category: DistressCategory | null;
  minScore: number;
}

export function App() {
  const [data, setData] = useState<MapDataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    maturity: null,
    category: null,
    minScore: 0,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAssets({
      maturity: filters.maturity,
      category: filters.category,
      minScore: filters.minScore,
    })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
        if (res.assets.length > 0 && !selectedId) {
          setSelectedId(res.assets[0].asset_id);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "fetch failed");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filters, selectedId]);

  const selected: DistressAsset | null = useMemo(() => {
    if (!data || !selectedId) return null;
    return data.assets.find((a) => a.asset_id === selectedId) ?? null;
  }, [data, selectedId]);

  const highCount = (data?.assets ?? []).filter((a) => a.distress_score >= 70).length;
  const mediumCount = (data?.assets ?? []).filter(
    (a) => a.distress_score >= 40 && a.distress_score < 70,
  ).length;

  return (
    <div className="flex h-screen flex-col bg-charcoal-900 text-slate-100">
      <Header
        highCount={highCount}
        mediumCount={mediumCount}
        total={data?.assets.length ?? 0}
        source={data?.source ?? "mock"}
      />

      <div className="border-b border-white/5 bg-charcoal-900/80 px-4 py-2.5 backdrop-blur">
        <Filters
          maturity={filters.maturity}
          category={filters.category}
          minScore={filters.minScore}
          onChange={(next) => setFilters(next)}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[300px] shrink-0 border-r border-white/5 bg-charcoal-800/40 xl:flex">
          <AssetList
            assets={data?.assets ?? []}
            selectedId={selectedId}
            onSelect={(a) => setSelectedId(a.asset_id)}
          />
        </div>

        <main className="relative flex min-w-0 flex-1 flex-col">
          <div className="relative flex-1">
            <WarMap
              assets={data?.assets ?? []}
              selectedId={selectedId}
              onSelect={(a) => setSelectedId(a.asset_id)}
            />
            {loading && <LoadingOverlay />}
            {error && <ErrorOverlay message={error} />}
            <Legend />
          </div>
        </main>

        <div className="hidden lg:flex">
          <AssetPanel asset={selected} onClose={() => setSelectedId(null)} />
        </div>
      </div>
    </div>
  );
}

function Header({
  highCount,
  mediumCount,
  total,
  source,
}: {
  highCount: number;
  mediumCount: number;
  total: number;
  source: string;
}) {
  return (
    <header className="flex items-center justify-between border-b border-white/5 bg-charcoal-900/90 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neon-red/10 border border-neon-red/40">
          <RadarIcon className="h-4 w-4 text-neon-red" />
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg font-semibold tracking-tight">
              ShadowPulse
            </span>
            <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-widest text-slate-500">
              CRE Distress Monitor
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone="red">
          <ShieldAlert className="h-3 w-3" />
          {highCount} HIGH
        </Badge>
        <Badge tone="yellow">
          <Crosshair className="h-3 w-3" />
          {mediumCount} MED
        </Badge>
        <Badge tone="slate">{total} Assets</Badge>
        <Badge tone={source === "live" ? "green" : "blue"}>
          {source.toUpperCase()}
        </Badge>
      </div>
    </header>
  );
}

function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-lg border border-white/5 bg-charcoal-800/80 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 backdrop-blur">
      <div className="mb-1 text-slate-500">Pulse Severity</div>
      <div className="flex items-center gap-3">
        <LegendDot color="#FF3B30" label="≥70 High" />
        <LegendDot color="#FFCC00" label="40–69 Med" />
        <LegendDot color="#34C759" label="<40 Low" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
      {label}
    </span>
  );
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-charcoal-900/60 backdrop-blur-sm">
      <div className="rounded-lg border border-white/10 bg-charcoal-800/90 px-4 py-3 text-xs uppercase tracking-widest text-slate-300">
        Sweeping pulses...
      </div>
    </div>
  );
}

function ErrorOverlay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
      <div className="max-w-md rounded-lg border border-neon-red/40 bg-neon-red/10 p-4 text-sm text-neon-red">
        <div className="font-semibold uppercase tracking-wider mb-1">
          Pulse API unavailable
        </div>
        <div className="text-xs text-slate-300">
          {message} · Ensure the backend is running at{" "}
          <code className="font-mono text-slate-200">localhost:8000</code>.
        </div>
      </div>
    </div>
  );
}
