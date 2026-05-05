# Media Billing Reconciliation Backend

Flask API server. Extracts invoice data, runs reconciliation against vendor mapping files, and serves AI-driven analysis.

## Project Structure

```
MediaBillingReconcilliationBackend/
├── app.py                          # Flask application + routes
├── Dockerfile                      # Container build for Azure deploy
├── .dockerignore
├── requirements.txt                # Python deps
├── api/                            # (placeholder, currently empty)
├── services/
│   ├── auth.py                     # JWT auth + @require_auth decorator
│   ├── invoice_extractor.py        # File to canonical invoice JSON
│   ├── invoice_reconciliation.py   # Fuzzy match against mapping
│   ├── discrepancy_agent.py        # CrewAI analysis of discrepancies
│   └── email_service.py            # (kept on disk, unused in current build)
├── utils/
│   └── file_parsers.py             # PDF/CSV/XLSX/image parsing
├── mapping/                        # Vendor invoice mapping JSONs
└── uploads/                        # Local upload dir (ignored in container, /tmp/uploads used instead)
```

## Local Setup

1. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure `.env`:
   ```
   OPENAI_API_KEY=sk-proj-...
   JWT_SECRET=any-long-random-string
   AUTH_USERS={"akhil@demo.com":"<werkzeug-hash>"}
   JWT_TTL_HOURS=8
   ALLOWED_ORIGINS=http://localhost:3000
   ```

   Generate a password hash:
   ```bash
   python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('your-password'))"
   ```

   Generate a JWT secret:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

4. Run the server:
   ```bash
   python app.py
   ```

   Listens on `http://localhost:5000`.

## Run via Docker

```bash
docker build -t mr-backend:local .

docker run --rm -p 5001:5000 \
  --env-file .env \
  -e ALLOWED_ORIGINS=http://localhost:3000 \
  mr-backend:local
```

Container listens on 5000 internally, mapped to host 5001.

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

## Environment Variables

| Var | Required | Default | Notes |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes for AI | none | Plain key, no quotes |
| `JWT_SECRET` | Yes | `dev-secret-change-me` | Use a 48 char random string |
| `AUTH_USERS` | Yes | empty `{}` | JSON map of email to werkzeug hash |
| `JWT_TTL_HOURS` | No | `8` | Token validity |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | Comma separated CORS origins |
| `MAPPING_FOLDER` | No | `./mapping` | Vendor mapping JSONs |
| `UPLOAD_FOLDER` | No | `./uploads` | Where uploads land |
| `OUTPUT_FOLDER` | No | `./output` | Where reconciliation CSVs land |
| `PORT` | No | `5000` | Bind port |

## Supported File Types

PDF, CSV, XLSX, XLS, XML, images (JPG, PNG, GIF, BMP), HTML, TXT.
