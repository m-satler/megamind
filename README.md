# megamind

An AI-powered stock tracker and portfolio builder.

Stack: **React + Vite + TypeScript** (frontend) · **Flask + PostgreSQL** (backend) · **TensorFlow LSTM** (prediction model).

---

## Architecture

```
 ┌────────────┐    /api/*     ┌───────────────┐    SQL    ┌──────────────┐
 │  Frontend  │ ─────────────▶│  Flask API    │──────────▶│  PostgreSQL  │
 │ (Vite:5173)│  (dev proxy)  │  (port 5000)  │           │              │
 └────────────┘               │               │           └──────────────┘
                              │   ├── auth/trades/watchlist (JWT, bcrypt)
                              │   ├── /api/stocks/*        (yfinance)
                              │   └── /api/predict/<tkr>   (LSTM)
                              └───────────────┘
```

- **Auth / trades / watchlist / portfolio** — persisted in Postgres, JWT-protected.
- **Public market data** — `/api/stocks/quote`, `/api/stocks/<ticker>`, `/api/stocks/<ticker>/history` proxied from yfinance with a short in-process cache.
- **Prediction** — `/api/predict/<ticker>` trains (first call) or loads (subsequent calls) an LSTM and forecasts the next close.

---

## Running locally

### Prerequisites

- **Python 3.10+** (3.11 recommended) · **Node 18+** · **PostgreSQL 14+**
- Windows users: ensure Microsoft VC++ build tools are present for TensorFlow.

### 1. Database

```bash
# From the repo root:
createdb megamind                      # or: psql -U postgres -c "CREATE DATABASE megamind;"
psql -d megamind -f db/schema.sql
```

### 2. Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell:  .venv\Scripts\Activate.ps1
# macOS/Linux:         source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env to point DATABASE_URL at your Postgres instance.

python app.py
# → http://localhost:5000
# Sanity check: curl http://localhost:5000/api/health
```

> **First-run note for predictions:** calling `/api/predict/<ticker>` for a new ticker trains a fresh LSTM, which can take 1–2 minutes on CPU. Subsequent calls load the cached model from `models/` and return in seconds.

### 3. Frontend

```bash
cd frontend
cp .env.example .env       # optional — defaults are fine for local dev
npm install
npm run dev
# → http://localhost:5173
```

The Vite dev server proxies `/api/*` to the Flask backend, so no CORS config is needed in development.

---

## Project layout

```
backend/
  app.py            # Flask entrypoint, blueprint registration
  auth.py           # /api/auth/*  (register, login, me)
  watchlist.py      # /api/watchlist  (CRUD, JWT-protected)
  trades.py         # /api/trades/*, /api/portfolio
  stocks.py         # /api/stocks/*  (yfinance-backed, public)
  predictor.py      # LSTM model loader/trainer (module)
  predict_api.py    # /api/predict/<ticker>
  requirements.txt
  .env.example

frontend/
  src/app/
    lib/api.ts         # Typed client for the Flask API
    pages/Home.tsx     # Terminal view — live quotes + watchlist
    pages/StockDetail.tsx  # Per-stock charts + LSTM prediction panel
    components/        # StockCard, WatchlistItem, Sidebar, Layout, ui/*
  vite.config.ts       # Dev proxy /api → :5000
  .env.example

db/
  schema.sql        # users, accounts, watchlist, portfolio, transactions

marketMachina4.0.py # Original standalone LSTM script (kept for reference)
models/             # Cached trained models (gitignored; generated at runtime)
scalers/            # Cached MinMaxScalers (gitignored; generated at runtime)
```

---

## Current status

| Feature                                  | Status |
|------------------------------------------|--------|
| Live quotes on home page                 | ✅ |
| Stock detail page (real OHLCV + charts)  | ✅ |
| LSTM price prediction endpoint           | ✅ |
| Watchlist (localStorage)                 | ✅ |
| Watchlist / portfolio persisted in DB    | ⏳ Backend ready, no login UI yet |
| Auth UI (register / login / logout)      | ⏳ API ready, UI not built |
| Docker Compose for Postgres + backend    | ⏳ Planned |

---

## License

MIT — see `LICENSE`.
