# ShadowPulse

**Institutional commercial-real-estate distress monitor** that aggregates
four live "Pulse" signals into a single 0–100 Distress Score and renders
them on a dark-institutional 3D War Map.

**Live:** <https://shadowpulse-frontend.vercel.app> · API at
<https://shadowpulse-backend.vercel.app/api/health>.

- **Backend** · FastAPI, async signal fan-out, weighted scoring,
  mock-fallback everywhere. See [`backend/README.md`](backend/README.md).
- **Frontend** · React + TypeScript + Tailwind + Shadcn-style primitives
  + Mapbox GL + Recharts. See [`frontend/README.md`](frontend/README.md).

## Distress Score Formula

```
FinalScore = (NPL Delta        × 0.30)
           + (WARN Intensity   × 0.20)
           + (Sentiment Decay  × 0.20)
           + (Lien Presence    × 0.20)
           + (Tenant Conc.     × 0.10)
           + (+20 alarm if Mechanic's Lien filed)
```

Each sub-component is normalized to 0–100 before weighting. Final score is
clipped to 0–100.

## Pulse Signals

| # | Signal | Source | Implementation |
|---|--------|--------|----------------|
| 1 | SEC / 10-Q | EDGAR submissions JSON + document fetch, LLM extraction | `app/services/sec_service.py` |
| 2 | WARN Notices | State DOL directories (NY, CA), 5-mile radius | `app/services/warn_service.py` |
| 3 | Mechanic's Liens | Mockable county recorder (deterministic hash seed) | `app/services/lien_service.py` |
| 4 | Retail Sentiment | Google / Yelp review scraper hook + keyword decay | `app/services/sentiment_service.py` |

## Run Locally

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Smoke-test without starting a server:

```bash
python smoke_test.py
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # optional: set VITE_MAPBOX_TOKEN
npm run dev            # http://localhost:5173
```

Vite proxies `/api/*` to the FastAPI backend on `:8000`.

## Endpoints

- `GET /api/health`
- `GET /api/assets?maturity=2026&category=financial&min_score=40`
- `GET /api/assets/{asset_id}`
- `GET /api/map-data` — Mapbox-ready GeoJSON FeatureCollection

## Fallback Semantics

The engine **never** hard-fails on upstream outages. Every signal has a
deterministic mock fallback (`backend/app/data/mock_data.json` or an
on-the-fly hash seed), and the LLM falls back to a heuristic verdict when
`OPENAI_API_KEY` is absent. The frontend additionally falls back to an
SVG topology when `VITE_MAPBOX_TOKEN` is missing so the UI always renders.
