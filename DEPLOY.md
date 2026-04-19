# Deploying ShadowPulse

ShadowPulse ships with production configs for every major push-to-deploy
platform. Pick whichever pairing you prefer — **backend** is a FastAPI
Docker image, **frontend** is a Vite static build that can be served by
any CDN or an `nginx` container.

| Platform | Backend | Frontend | Config |
|----------|---------|----------|--------|
| Docker Compose (single VPS) | ✅ | ✅ | [`docker-compose.yml`](./docker-compose.yml) |
| Fly.io | ✅ | — | [`fly.toml`](./fly.toml) |
| Render | ✅ | ✅ | [`render.yaml`](./render.yaml) |
| Railway | ✅ | — | [`railway.toml`](./railway.toml) |
| Vercel | — | ✅ | [`frontend/vercel.json`](./frontend/vercel.json) |
| Netlify | — | ✅ | [`netlify.toml`](./netlify.toml) |
| GitHub Container Registry | ✅ | ✅ | [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) |

---

## Option A · One-click Render (recommended for first deploy)

Render reads [`render.yaml`](./render.yaml) and provisions both services
(`shadowpulse-backend` as a Docker web service + `shadowpulse-frontend`
as a static site) in one shot.

1. Push this repo to GitHub (already done on branch
   `cursor/shadowpulse-scaffold-ba15`).
2. Open <https://dashboard.render.com/select-repo?type=blueprint> and
   pick the repo.
3. When prompted, paste:
   - `OPENAI_API_KEY` — optional, enables LLM 10-Q extraction + verdicts.
   - `VITE_MAPBOX_TOKEN` — optional, enables the 3D Mapbox layer.
4. Click **Apply**. First build takes ~4 minutes. The frontend env var
   `VITE_API_BASE` auto-wires to the backend's hostname via
   `fromService`.

Both services redeploy on every push to `main`, and Render spins up
preview environments for PRs.

---

## Option B · Fly.io (backend) + Vercel (frontend)

### 1. Backend → Fly

```bash
brew install flyctl                        # or curl -L https://fly.io/install.sh | sh
fly auth login
fly launch --no-deploy --copy-config       # picks up fly.toml
fly secrets set \
    OPENAI_API_KEY=sk-... \
    SEC_USER_AGENT="Your Name you@example.com"
fly deploy
```

Your backend is now live at `https://shadowpulse-backend.fly.dev`.

### 2. Frontend → Vercel

```bash
cd frontend
npx vercel link
npx vercel env add VITE_API_BASE production   # paste https://shadowpulse-backend.fly.dev
npx vercel env add VITE_MAPBOX_TOKEN production
npx vercel deploy --prod
```

Or use the web UI: "New Project" → import the repo → set **Root
Directory** to `frontend`, framework **Vite**, then add the two env
vars.

---

## Option C · Railway (single-repo monorepo)

```bash
brew install railway
railway login
railway init            # select "existing project" or create one
railway up              # builds backend Dockerfile via railway.toml
railway variables set \
    OPENAI_API_KEY=sk-... \
    USE_LIVE_DATA=true
railway domain          # gives you a *.up.railway.app URL
```

For the frontend on Railway, add a second service pointing at
`frontend/` with build command `npm ci && npm run build` and start
command `npx serve -s dist -l ${PORT}` (or deploy to Vercel/Netlify).

---

## Option D · Self-host via Docker Compose

Everything in one VPS. Requires Docker 24+ with Compose v2.

```bash
# On the host
git clone https://github.com/DeFi-crypto/ShadowPulse.git
cd ShadowPulse

# Provide optional secrets
cat > .env <<'EOF'
OPENAI_API_KEY=sk-...
VITE_MAPBOX_TOKEN=pk....
USE_LIVE_DATA=true
EOF

docker compose up -d --build
```

- Frontend: <http://YOUR_HOST:8080>
- Backend:  <http://YOUR_HOST:8000/api/health>

The nginx config in `frontend/nginx.conf` reverse-proxies `/api/*` to the
`backend` service, so the SPA can call the API via same-origin URLs.

Put Caddy / Traefik / Cloudflare in front for TLS.

---

## Option E · Kubernetes / anywhere Docker runs

The CI workflow at `.github/workflows/ci.yml` pushes tagged images to
GitHub Container Registry on every push to `main`:

- `ghcr.io/<owner>/shadowpulse/backend:latest`
- `ghcr.io/<owner>/shadowpulse/frontend:latest`

Drop those image references into whatever platform you operate
(ECS, Cloud Run, Kubernetes, Nomad, Coolify, Dokku, Caprover, …). The
backend listens on `$PORT` (default 8000) and exposes `/api/health`
for probes. The frontend listens on port 80.

---

## Environment Reference

### Backend (`backend/.env` or platform secrets)

| Key | Default | Purpose |
|-----|---------|---------|
| `ENVIRONMENT` | `development` | Emitted by `/api/health`. |
| `USE_LIVE_DATA` | `false` | Enable live SEC + scraper calls. Automatic fallback to `mock_data.json` on any failure. |
| `OPENAI_API_KEY` | _unset_ | Enables LLM 10-Q extraction + institutional verdict. Heuristic fallback otherwise. |
| `OPENAI_MODEL` | `gpt-4o-mini` | Override model. |
| `SEC_USER_AGENT` | _default_ | Required by SEC EDGAR; supply `Name email@example.com`. |
| `REIT_TICKERS` | `SLG,BXP,VNO,KRG,MAC` | Tickers to monitor. |

### Frontend (build-time)

| Key | Purpose |
|-----|---------|
| `VITE_API_BASE` | Fully qualified backend URL (leave blank if using same-origin nginx proxy). |
| `VITE_MAPBOX_TOKEN` | Enables 3D Mapbox layer. Fallback SVG renders without it. |

---

## Smoke-test a deployment

```bash
curl -fsS https://YOUR_BACKEND/api/health
curl -fsS https://YOUR_BACKEND/api/map-data | jq '.features | length'
```

You should see `{"status":"ok"}` and a non-zero feature count.

## Cost Snapshot

- **Render starter** (backend) + static site (frontend): free tier works
  for demos; ~$7/mo for always-on backend.
- **Fly.io** `shared-cpu-1x/512mb`: free quota covers this instance.
- **Railway** hobby: ~$5/mo.
- **Vercel / Netlify** frontend: free.
- **OpenAI + Mapbox**: pass-through, scales with requests.
