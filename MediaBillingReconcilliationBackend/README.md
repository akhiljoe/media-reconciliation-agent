# MediaBillingReconcilliation Backend

Flask API server for the Media Billing Reconcilliation application.

## Project Structure

```
MediaBillingReconcilliationBackend/
├── app.py                 # Main Flask application
├── api/                   # API routes and endpoints
├── services/             # Business logic services
│   └── campaign_notebook.py   # Campaign generation logic
├── utils/                # Utility modules
│   └── file_parsers.py   # File parsing utilities
├── uploads/              # Uploaded files storage
├── requirements.txt      # Python dependencies
└── .env                  # Environment variables
```

## Setup

1. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

4. **Run the server:**
   ```bash
   python app.py
   ```

Server will start on http://localhost:5000

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/upload-file` - Upload and parse files (PDF, CSV, XML, Images)
- `POST /api/generate-campaign` - Generate marketing campaign
- `POST /api/generate-research` - Generate market research

## Supported File Types

- PDF (.pdf)
- CSV (.csv)
- XML (.xml)
- Images (.jpg, .jpeg, .png, .gif, .bmp)
