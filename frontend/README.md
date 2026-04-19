# ShadowPulse War Map · Frontend

React + TypeScript + Vite dashboard for the ShadowPulse institutional CRE
distress monitor. Uses Tailwind CSS, lightweight Shadcn-style primitives,
Mapbox GL, and Recharts.

## Quickstart

```bash
cd frontend
npm install

# Optional: enable 3D Mapbox. Without this the app renders a stylized
# fallback topology so the UI still demonstrates pulsing distress pins.
cp .env.example .env
# then edit .env to set VITE_MAPBOX_TOKEN

npm run dev
```

The dev server (Vite, port 5173) proxies `/api/*` to the FastAPI backend at
`http://localhost:8000`, so run the backend first (see `../backend/README.md`).

## Feature Map

- **Dark institutional theme** (`#0B0E11` charcoal + neon accents).
- **3D Mapbox layer** with pulsing distress pins (auto-fallback SVG map
  when `VITE_MAPBOX_TOKEN` is missing).
- **Hover tooltip** showing REIT name, score, and top 3 red flags.
- **Asset Intelligence Panel** with:
  - 5-axis **Radar Chart** (Recharts) of NPL Δ / WARN / Sentiment / Lien / Tenant Concentration.
  - **Smoking Gun Feed** of WARN headlines, flagged reviews, and lien filings.
  - **Institutional Verdict** (LLM-generated BUY/HOLD/SELL/SHORT recommendation).
- **Global filters** — Debt Maturity Year (2026/2027), Distress Category
  (Operational / Financial / Hybrid), and minimum score slider.
- **Watchlist sidebar** sorted by score with severity badges.

## Tech Choices

- **Vite + React 19** — instant HMR, excellent dev ergonomics.
- **Tailwind CSS v3** — matches Shadcn/ui design tokens; custom charcoal
  palette + neon colors defined in `tailwind.config.js`.
- **Shadcn-style primitives** hand-rolled in `components/ui/*` to keep the
  dependency graph small while preserving the design API.
- **Recharts** for the radar chart — reliable, accessible, zero config.
- **Mapbox GL** with graceful fallback — production-ready 3D WebGL map
  when a token is present, stylized SVG topology otherwise.
