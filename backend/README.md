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
   AUTH_USERS={"akhil@demo.com":"<werkze