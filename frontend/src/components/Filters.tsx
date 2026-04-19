import type { DistressCategory } from "@/types";
import { Button } from "@/components/ui/Button";

interface FiltersProps {
  maturity: number | null;
  category: DistressCategory | null;
  minScore: number;
  onChange: (next: {
    maturity: number | null;
    category: DistressCategory | null;
    minScore: number;
  }) => void;
}

const MATURITIES: Array<{ label: string; value: number | null }> = [
  { label: "All", value: null },
  { label: "2026", value: 2026 },
  { label: "2027", value: 2027 },
];

const CATEGORIES: Array<{ label: string; value: DistressCategory | null }> = [
  { label: "All", value: null },
  { label: "Operational", value: "operational" },
  { label: "Financial", value: "financial" },
  { label: "Hybrid", value: "hybrid" },
];

export function Filters({ maturity, category, minScore, onChange }: FiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/5 bg-charcoal-800/60 backdrop-blur-md px-4 py-3">
      <Group label="Debt Maturity">
        {MATURITIES.map((m) => (
          <Button
            key={m.label}
            size="sm"
            variant={maturity === m.value ? "neon" : "ghost"}
            onClick={() => onChange({ maturity: m.value, category, minScore })}
          >
            {m.label}
          </Button>
        ))}
      </Group>
      <Divider />
      <Group label="Category">
        {CATEGORIES.map((c) => (
          <Button
            key={c.label}
            size="sm"
            variant={category === c.value ? "neon" : "ghost"}
            onClick={() => onChange({ maturity, category: c.value, minScore })}
          >
            {c.label}
          </Button>
        ))}
      </Group>
      <Divider />
      <Group label={`Min Score · ${minScore}`}>
        <input
          type="range"
          min={0}
          max={90}
          step={5}
          value={minScore}
          onChange={(e) =>
            onChange({ maturity, category, minScore: Number(e.target.value) })
          }
          className="sp-range w-40 accent-neon-red"
        />
      </Group>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

function Divider() {
  return <span className="h-5 w-px bg-white/5" />;
}
