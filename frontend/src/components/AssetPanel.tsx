import { X, AlertTriangle, FileWarning, Megaphone, Building2, Flame } from "lucide-react";
import type { DistressAsset } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DistressRadar } from "@/components/DistressRadar";
import { formatCurrency, formatPct, severityClass, severityLabel } from "@/lib/utils";

interface AssetPanelProps {
  asset: DistressAsset | null;
  onClose: () => void;
}

export function AssetPanel({ asset, onClose }: AssetPanelProps) {
  if (!asset) {
    return (
      <aside className="hidden lg:flex h-full w-[420px] shrink-0 flex-col items-center justify-center border-l border-white/5 bg-charcoal-800/40 p-6 text-center">
        <Flame className="h-8 w-8 text-slate-600 mb-3" />
        <div className="text-xs uppercase tracking-widest text-slate-500">
          Select an asset to open intel panel
        </div>
        <div className="mt-2 max-w-[260px] text-[11px] text-slate-600">
          Click a pulsing pin on the War Map to surface SEC 10-Q extracts, WARN notices, mechanic's liens, and the institutional verdict.
        </div>
      </aside>
    );
  }

  const score = asset.distress_score;
  const severity = severityLabel(score);
  const scoreClass = severityClass(score);

  return (
    <aside className="flex h-full w-full lg:w-[420px] shrink-0 flex-col border-l border-white/5 bg-charcoal-800/60 backdrop-blur-md animate-fadeIn">
      <header className="flex items-start justify-between gap-3 border-b border-white/5 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge tone="slate">{asset.ticker}</Badge>
            <Badge tone={severity === "HIGH" ? "red" : severity === "MEDIUM" ? "yellow" : "green"}>
              {severity} RISK
            </Badge>
            <Badge tone="blue">{asset.distress_category.toUpperCase()}</Badge>
          </div>
          <div className="font-semibold text-slate-100 truncate">{asset.owner_reit}</div>
          <div className="text-xs text-slate-400 truncate">{asset.address}</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Close"
          onClick={onClose}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-white/5 bg-charcoal-700/60 p-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">
              Distress Score
            </div>
            <div className={`mt-0.5 font-display text-5xl font-semibold ${scoreClass}`}>
              {score.toFixed(0)}
              <span className="text-lg text-slate-500">/100</span>
            </div>
          </div>
          <div className="max-w-[55%] text-right">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
              Debt Maturity
            </div>
            <div className="font-mono text-sm text-slate-200">
              {asset.debt_maturity_year}
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Signal Breakdown</CardTitle>
            <Badge tone="red">5-Axis</Badge>
          </CardHeader>
          <CardContent>
            <DistressRadar asset={asset} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEC 10-Q Pulse</CardTitle>
            <span className="text-[10px] font-mono text-slate-500">
              {asset.signals.sec_data.filing_date ?? "—"}
            </span>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <KV
              label="NPL Current / Prior"
              value={`${formatCurrency(asset.signals.sec_data.npl_current)} vs ${formatCurrency(asset.signals.sec_data.npl_previous)}`}
              accent={
                (asset.signals.sec_data.npl_delta_pct ?? 0) > 20 ? "red" : undefined
              }
            />
            <KV
              label="NPL Δ QoQ"
              value={formatPct(asset.signals.sec_data.npl_delta_pct)}
              accent={
                (asset.signals.sec_data.npl_delta_pct ?? 0) > 20 ? "red" : undefined
              }
            />
            <KV
              label="ACL Commercial"
              value={formatCurrency(asset.signals.sec_data.acl_commercial)}
            />
            <div className="pt-3 mt-3 border-t border-white/5">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
                Top 5 Tenants (% ABR)
              </div>
              <ul className="space-y-1">
                {asset.signals.sec_data.top_tenants.slice(0, 5).map((t) => (
                  <li
                    key={t.name}
                    className="flex justify-between text-xs text-slate-200"
                  >
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-3 w-3 text-slate-500" /> {t.name}
                    </span>
                    <span
                      className={`font-mono ${
                        t.pct_abr >= 10
                          ? "text-neon-red"
                          : t.pct_abr >= 5
                          ? "text-neon-yellow"
                          : "text-slate-300"
                      }`}
                    >
                      {t.pct_abr.toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Smoking Gun Feed</CardTitle>
            <Badge tone="yellow">
              {asset.signals.sentiment.flagged_reviews.length + asset.signals.warn.headlines.length} ITEMS
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <SignalGroup
              icon={<Megaphone className="h-3.5 w-3.5 text-neon-yellow" />}
              title={`WARN · ${asset.signals.warn.warn_count} notices ${asset.signals.warn.nearest_miles != null ? `(${asset.signals.warn.nearest_miles.toFixed(1)}mi)` : ""}`}
              items={asset.signals.warn.headlines}
            />
            <SignalGroup
              icon={<FileWarning className="h-3.5 w-3.5 text-neon-red" />}
              title={`Mechanic's Liens · ${asset.signals.lien.lien_status.toUpperCase()}`}
              items={asset.signals.lien.filings}
              empty="No liens on record."
            />
            <SignalGroup
              icon={<AlertTriangle className="h-3.5 w-3.5 text-neon-red" />}
              title={`Sentiment · ${asset.signals.sentiment.vibe.toUpperCase()}`}
              items={asset.signals.sentiment.flagged_reviews}
              empty="No flagged reviews surfaced."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Institutional Verdict</CardTitle>
            <Badge tone="red">LLM</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
              {asset.institutional_verdict ?? "Analysis pending."}
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}

interface KVProps {
  label: string;
  value: string;
  accent?: "red" | "yellow";
}

function KV({ label, value, accent }: KVProps) {
  const cls =
    accent === "red"
      ? "text-neon-red"
      : accent === "yellow"
      ? "text-neon-yellow"
      : "text-slate-200";
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500 uppercase tracking-wider">{label}</span>
      <span className={`font-mono ${cls}`}>{value}</span>
    </div>
  );
}

interface SignalGroupProps {
  icon: React.ReactNode;
  title: string;
  items: string[];
  empty?: string;
}

function SignalGroup({ icon, title, items, empty }: SignalGroupProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400">
        {icon} {title}
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-slate-500 italic">{empty ?? "No items."}</div>
      ) : (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li
              key={i}
              className="text-xs text-slate-200 border-l-2 border-white/5 pl-2.5 leading-snug"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
