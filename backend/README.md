# ShadowPulse Backend

Institutional commercial-real-estate distress monitor built on FastAPI. The
backend aggregates four "Pulse" signals into a unified 0–100 Distress Score
per asset.

## Pulse Signals

| Pulse | Source | Weight |
|-------|--------|--------|
| NPL Delta | SEC EDGAR 10-Q (LLM-extracted) | 0.30 |
| WARN Intensity | State DOL WARN notices, 5-mile radius | 0.20 |
| Sentiment Decay | Google/Yelp reviews, keyword scored | 0.20 |
| Mechanic's Lien | County recorder (mocked) + alarm bonus | 0.20 |
| Tenant Concentration | Top-5 % of ABR | 0.10 |

A filed lien adds an additional +20 alarm bonus (capped at 100).

## Quickstart

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open the interactive docs at <http://localhost:8000/docs>.

### Endpoints

- `GET /api/health` - service status and feature flags.
- `GET /api/assets` - full distress dataset (filters: `maturity`, `category`, `min_score`).
- `GET /api/assets/{asset_id}` - single asset detail.
- `GET /api/map-data` - Mapbox-ready GeoJSON FeatureCollection.

### Configuration

Settings come from environment variables (or an `.env` file in `backend/`):

| Key | Default | Purpose |
|-----|---------|---------|
| `USE_LIVE_DATA` | `false` | When `true`, engine calls SEC EDGAR + scrapers. Falls back to mock data automatically on failure or rate limits. |
| `OPENAI_API_KEY` | _unset_ | Enables LLM 10-Q extraction and the "institutional verdict" generator. Heuristic fallback is used when absent. |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model passed to the OpenAI SDK. |
| `SEC_USER_AGENT` | _see `config.py`_ | Required by the SEC: `Name email@example.com`. |
| `REIT_TICKERS` | `SLG,BXP,VNO,KRG,MAC` | Tickers monitored by the SEC service. |

### Fallback Semantics

Every external dependency is wrapped in a try/except with a mock fallback:

- **SEC rate limits / offline** -> `mock_data.json` provides seed SEC metrics.
- **WARN scraping failure** -> deterministic fixtures geo-filtered by radius.
- **LLM unavailable** -> heuristic verdict + empty LLM extraction, seeded metrics used.
- **County recorder** -> deterministic mock lien detection seeded on asset hash.
