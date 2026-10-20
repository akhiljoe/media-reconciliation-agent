# Media Billing Reconciliation Backend

Flask API server. Extracts invoice data, runs reconciliation against vendor mapping files, and serves AI-driven analysis.

## Project Structure

```
backend/
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
   AUTH_USERS={"demo@example.com":"<werkzeug password hash>"}
   ALLOWED_ORIGINS=http://localhost:3000
   ```

   Generate a password hash:
   ```bash
   python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('your-password'))"
   ```

4. Run:
   ```bash
   python app.py
   ```
   Serves on <http://localhost:5000>. Check <http://localhost:5000/api/health>.

## Environment Variables

| Var | Required | Default | Notes |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | | Used by the extraction and discrepancy agents |
| `JWT_SECRET` | Yes | `dev-secret-change-me` | Signs login tokens; always set in any shared deployment |
| `AUTH_USERS` | Yes | | JSON map of username to werkzeug password hash |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | Comma-separated CORS origins |
| `JWT_TTL_HOURS` | No | `8` | Token lifetime |
| `PORT` | No | `5000` | |
| `FLASK_DEBUG` | No | `true` | Set `false` outside local dev (the container uses Gunicorn) |
| `UPLOAD_FOLDER`, `MAPPING_FOLDER`, `OUTPUT_FOLDER` | No | `uploads/`, `mapping/`, `output/` | |

## API

All routes except health and login require `Authorization: Bearer <token>`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check |
| POST | `/api/auth/login` | Exchange username + password for a JWT |
| POST | `/api/upload-file` | Upload an invoice file |
| POST | `/api/extract-invoice` | Extract fields into the canonical invoice schema |
| POST | `/api/reconcile-invoice` | Reconcile an invoice against the vendor mapping |
| GET | `/api/vendor-scores` | Vendor trust scores and grades |
| POST | `/api/analyze-discrepancy` | AI analysis of one discrepancy |
| POST | `/api/analyze-discrepancies-batch` | AI analysis of several discrepancies |

## Supported Input Formats

PDF, images (JPG, PNG, GIF, BMP), CSV, Excel (XLS, XLSX), XML, JSON and TXT. See `utils/file_parsers.py`.