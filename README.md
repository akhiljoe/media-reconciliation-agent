# Media Billing Reconciliation Platform

AI-powered invoice extraction and reconciliation for media agencies. Upload an invoice, get a discrepancy report against expected campaign data.

Deployed on Azure free tier. Originally a hackathon prototype, now hardened with JWT auth, scoped CORS, and a containerized backend.

## Live Demo

| Component | URL |
|---|---|
| Frontend | https://icy-wave-0eebc2400.7.azurestaticapps.net |
| Backend health | https://media-recon-backend.greendesert-2f37c099.centralindia.azurecontainerapps.io/api/health |

Demo credentials are shared separately (do not commit to git).

## Stack

| Layer | Tech | Hosting |
|---|---|---|
| Frontend | React 18, TypeScript, Vite, React Router, Axios | Azure Static Web Apps (Free) |
| Backend | Python 3.11, Flask, Gunicorn, CrewAI, OpenAI, PyJWT | Azure Container Apps (Consumption, scale-to-zero) |
| Image registry | GHCR (free, private) | GitHub Container Registry |
| Secrets | Container Apps secrets | Azure |

## Architecture

```
[ Browser ]
     |
     | 1. POST /api/auth/login -> JWT
     | 2. Authorization: Bearer <jwt> on every API call
     v
[ Azure Static Web Apps ]   eastasia, free SKU
     |
     | HTTPS, CORS scoped to SWA origin
     v
[ Azure Container Apps ]    centralindia, scale-to-zero
     |
     | image pulled from
     v
[ ghcr.io/akhiljoe/media-recon-backend ]   private
     |
     | OpenAI calls (key from Container App secret)
     v
[ OpenAI API ]
```

No database. No persistent storage. Mapping JSONs baked into the container.

## Repository Structure

```
media-recon-azure/
├── frontend/                   React + Vite SPA
├── backend/                    Flask API + Dockerfile + mapping JSONs
├── deploy/                     Azure deploy scripts (project-specific)
├── deploy-template/            Reusable template for similar projects
├── AZURE_DEPLOYMENT_PLAN.md    Step by step deploy guide
├── LEARNINGS.md                Field report from the deploy
└── README.md                   This file
```

## Reconciliation Logic

The engine compares extracted invoice data against vendor mapping JSONs using **fuzzy matching** across multiple fields:

| Field | Matching strategy |
|---|---|
| Campaign name | String similarity, threshold 0.8 |
| Insertion order ID | String similarity, threshold 0.9 |
| Booked / billed impressions | Numeric, tolerance 5% |
| Net cost | Numeric, tolerance 5% |
| Date range / duration | Computed from `Dates` field |
| Geo, ad unit, format | Text similarity |

Each line item gets an overall match score. Items below 0.7 land in "no match found". Items above 0.7 with field-level discrepancies generate a discrepancy report with severity levels (LOW, MEDIUM, HIGH, CRITICAL).

A **trust score** (0 to 100) summarizes the whole invoice. Vendor-level history is also aggregated into a vendor performance grade.

## Workflow

```
Upload invoice (PDF, image, CSV, XLSX, HTML, TXT)
       |
       v
AI extraction (CrewAI)
  - Invoice header (vendor, dates, totals)
  - Line items (campaign, IO, impressions, cost, etc.)
       |
       v
Normalize to canonical schema
       |
       v
Fuzzy match against bundled mapping JSONs
       |
       v
Discrepancy report
  - per-field severity
  - trust score
  - vendor performance grade
       |
       v
Optional: AI reasoning + remediation plan per discrepancy
```

## Auth

JWT (HS256) signed with `JWT_SECRET`. Token TTL 8 hours.

Users defined in `AUTH_USERS` env var as JSON: `{"email": "<werkzeug-hash>"}`.

| Route | Auth |
|---|---|
| `GET /api/health` | Public |
| `POST /api/auth/login` | Public |
| Everything else under `/api/*` | `Authorization: Bearer <jwt>` required |

Rate limit: 5 failed login attempts per username triggers a 60 second lockout (in-memory, per replica).

Generate a password hash:
```bash
python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('your-password'))"
```

## Local Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker Desktop (only if you want to test the container locally)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
OPENAI_API_KEY=sk-proj-...
JWT_SECRET=any-long-random-string
AUTH_USERS={"akhil@demo.com": "scrypt:..."}
JWT_TTL_HOURS=8
ALLOWED_ORIGINS=http://localhost:3000
```

Run:

```bash
python app.py
```

Listens on `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens on `http://localhost:3000`. Default API base is `http://localhost:5000/api`.

Override the API base:
```bash
echo "VITE_API_BASE_URL=http://localhost:5001/api" > .env.local
npm run dev
```

### Run backend in Docker (optional)

```bash
cd backend
docker build -t media-recon-backend:local .
docker run --rm -p 5001:5000 \
  --env-file .env \
  -e ALLOWED_ORIGINS=http://localhost:3000 \
  media-recon-backend:local
```

`--env-file` does not strip surrounding quotes. Make sure values in `.env` are unquoted.

## Cloud Deployment

Full step by step deploy lives in [`AZURE_DEPLOYMENT_PLAN.md`](./AZURE_DEPLOYMENT_PLAN.md). Scripts are in [`deploy/`](./deploy/).

Stack is free-tier focused: Container Apps Consumption (scale-to-zero), GHCR for image hosting (avoids paid Azure Container Registry), Static Web Apps Free SKU.

For a battle-tested record of what worked and what did not, read [`LEARNINGS.md`](./LEARNINGS.md).

To deploy a similar project (any Dockerized backend + Vite SPA), copy [`deploy-template/`](./deploy-template/) and follow its README.

## Deviations from the Original Hackathon Build

This is a deliberately narrowed version of the original prototype. The differences below are intentional, not bugs.

| Original | Current | Why |
|---|---|---|
| Mobile app (Expo / React Native) | Removed from repo | Out of scope for the web demo |
| Email notifications (SMTP) | Routes removed from API | Avoids SMTP credentials, reduces attack surface |
| Login accepted any email/password | Real JWT auth against env-defined users | Demo runs publicly, needs a boundary |
| `MediaBillingNotebook/` Jupyter prototype | Removed; mapping JSONs moved to `backend/mapping/` | Notebook was dev-only; container must be self-contained |
| `MediaBillingReconcilliation/` and `MediaBillingReconcilliationBackend/` | Renamed to `frontend/` and `backend/` | Cleaner repo layout |
| Vendor history in persistent `output/` CSVs | Ephemeral `/tmp/output` inside container | Project rule forbids persistent storage |
| `app.run(debug=True)` Flask dev server | Gunicorn 2 workers, 120 sec timeout | Production WSGI server |
| CORS wildcard | CORS scoped to the SWA origin | Standard hardening |

## Project Layout Inside `backend/`

```
backend/
├── app.py                          Flask app + routes
├── Dockerfile                      Container build for Azure
├── .dockerignore
├── requirements.txt
├── api/                            (placeholder)
├── services/
│   ├── auth.py                     JWT auth + @require_auth decorator
│   ├── invoice_extractor.py        File to canonical invoice JSON
│   ├── invoice_reconciliation.py   Fuzzy match + trust scoring
│   ├── discrepancy_agent.py        CrewAI analysis
│   └── email_service.py            Kept on disk, unused
├── utils/
│   └── file_parsers.py             PDF/CSV/XLSX/image parsing
├── mapping/                        Vendor invoice mapping JSONs
└── uploads/                        Local upload dir (container uses /tmp instead)
```

## API Endpoints

Public:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check |
| POST | `/api/auth/login` | Returns JWT for valid `username`/`password` |

Protected (require `Authorization: Bearer <jwt>`):

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/upload-file` | Generic file parser |
| POST | `/api/extract-invoice` | Extract canonical invoice JSON |
| POST | `/api/reconcile-invoice` | Run reconciliation against mapping |
| POST | `/api/analyze-discrepancy` | AI reasoning for one discrepancy |
| POST | `/api/analyze-discrepancies-batch` | AI reasoning for multiple discrepancies |
| GET | `/api/vendor-scores` | Aggregate vendor performance from history |

See [`backend/README.md`](./backend/README.md) for env var reference.

## Future Work

- Persistent storage (Cosmos DB or Postgres) for cross-session vendor history
- Custom domain with managed cert
- Application Insights for proper observability
- GitHub Actions to auto-build + push to GHCR on every push to main
- Migration from env-defined users to Entra ID or B2C for production-grade auth
- Direct connectors to Google Ads, Meta, DV360 for live campaign data
- Real-time pipeline instead of batch upload
- ML anomaly detection on top of fuzzy matching

## Contributors

Originally built by a team as a hackathon prototype.
Hardened and deployed to Azure by Akhil Joe (2026).
