# 🧾 AI Media Billing Reconciliation Platform

> An AI-powered system designed to automate **media invoice extraction, validation, and reconciliation** — built during a hackathon to demonstrate how AI agents and modern data workflows can eliminate manual billing verification in media operations.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Cloud Deployment](#cloud-deployment)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Components](#components)
  - [1. Frontend](#1-frontend)
  - [2. Backend](#2-backend)
- [Reconciliation Logic](#reconciliation-logic)
- [Workflow](#workflow)
- [Setup & Installation](#setup--installation)
- [Example Use Case](#example-use-case)
- [Hackathon Objective](#hackathon-objective)
- [Future Improvements](#future-improvements)
- [Contributors](#contributors)

---

## 📖 Overview

Media agencies handle thousands of invoices across platforms such as TV, Digital, and Programmatic advertising. Manual reconciliation between invoices, campaign data, and billing systems is slow and error-prone.

This project introduces an **AI-driven reconciliation system** that:

1. Extracts structured data from invoices
2. Standardizes invoice formats across vendors
3. Reconciles them against expected campaign or billing data
4. Generates detailed discrepancy reports
5. Provides a web interface for review

---

## ☁️ Cloud Deployment

The web stack runs on Azure free tier. Full step by step plan and CLI scripts live in [`AZURE_DEPLOYMENT_PLAN.md`](./AZURE_DEPLOYMENT_PLAN.md) and [`deploy/`](./deploy/).

**Stack:**

| Layer | Hosting | SKU |
|---|---|---|
| Frontend | Azure Static Web Apps | Free |
| Backend | Azure Container Apps (Consumption, scale to zero) | Free quota |
| Secrets | Container Apps secrets | Free |

### Deviations from the original architecture

The cloud deploy intentionally narrows the surface for a free-tier demo. These differences are **deliberate**, not bugs.

| Original | Deployed | Why |
|---|---|---|
| Mobile app (Expo) | Removed from repo | Out of scope for the web demo |
| Email notifications (SMTP) | Routes removed from API | Avoids SMTP credential burden, reduces attack surface |
| Login accepts any email/password | Real JWT auth against env-defined users | Demo runs publicly, needed a boundary |
| `MediaBillingNotebook/` (Jupyter prototype + mapping JSONs) | Removed; mapping JSONs moved into `backend/mapping/` | Notebook was dev-only. Container must be self contained. |
| Long folder names `MediaBillingReconcilliation/` and `MediaBillingReconcilliationBackend/` | Renamed to `frontend/` and `backend/` | Cleaner repo layout |
| Vendor history persisted in `output/` CSVs | `output/` is `/tmp` inside container, lost on cold start | Project rule forbids persistent storage |
| Always-on Flask `app.run(debug=True)` | Gunicorn 2 workers, 120 sec timeout | Production WSGI server |
| CORS wildcard | CORS scoped to the Static Web App origin | Standard hardening |

### Auth in the deployed build

- Login endpoint: `POST /api/auth/login` returns a JWT.
- Demo users are stored as `AUTH_USERS` env var (JSON map of email to werkzeug hash).
- Token TTL: 8 hours by default (`JWT_TTL_HOURS`).
- 5 failed login attempts triggers a 60 second per-username lockout.
- All `/api/*` routes except `/api/health` and `/api/auth/login` require `Authorization: Bearer <jwt>`.

See `backend/README.md` for env var details and how to generate password hashes.

---

## 🏗️ Architecture

```
            +----------------------+
            |  Media Invoice Files |
            | (PDF / Image / CSV)  |
            +----------+-----------+
                       |
                       v
             +--------------------+
             | AI Extraction Layer|
             |  (CrewAI Agents)   |
             +--------------------+
                       |
                       v
             +--------------------+
             | Structured Invoice |
             |      Data          |
             +--------------------+
                       |
                       v
             +--------------------+
             | Reconciliation     |
             | Logic Engine       |
             +--------------------+
                       |
                       v
             +--------------------+
             | Web Dashboard      |
             | Reconciliation     |
             | Review             |
             +--------------------+
```

---

## 📁 Repository Structure

```
media-recon-azure/
│
├── frontend/                   # React + Vite web dashboard
│
├── backend/                    # Flask API + JWT auth + Dockerfile
│
├── deploy/                     # Azure deploy scripts
│
├── AZURE_DEPLOYMENT_PLAN.md    # Step by step Azure deploy guide
│
└── README.md
```

---

## 🧩 Components

### 1. Frontend

A web-based interface to **review discrepancies and reconciliation results** in detail.

#### ✨ Features

- Login with JWT auth
- Upload invoices (PDF, image, CSV, XLSX)
- View extracted invoice data side-by-side
- Compare expected vs. billed amounts
- Drill into individual discrepancies
- Generate and export reconciliation reports

#### 🛠️ Tech Stack

- React 18
- TypeScript
- Vite
- React Router
- Axios

#### 🖥️ Key UI Components

| Component | Purpose |
|-----------|---------|
| `Login` | JWT-backed authentication form |
| `InvoiceExtractor` | Upload and extract invoice data |
| `DiscrepancyReport` | High-level report of all flagged issues |
| `DiscrepancyReview` | Detailed view for individual discrepancies |

---

### 2. Backend

Flask API that handles invoice extraction, reconciliation, and AI-driven analysis.

#### ✨ Features

- Multi-format document ingestion (PDF, Image, CSV, XLSX, XML, HTML, TXT)
- AI-powered field extraction via CrewAI
- Vendor-specific invoice format mapping
- Fuzzy reconciliation against bundled mapping JSONs
- Trust score and vendor performance scoring
- JWT auth with per-user rate limiting

#### 🤖 AI Agents

The system uses a **multi-agent architecture** powered by CrewAI:

| Agent | Responsibility |
|-------|---------------|
| Data Extraction Agent | Parses raw invoice documents |
| Invoice Normalization Agent | Maps vendor formats to standard schema |
| Discrepancy Analyst | Reasons over flagged differences |
| Remediation Specialist | Suggests action plans |

#### 🛠️ Tech Stack

- Python 3.11
- Flask + Flask-CORS + Gunicorn
- CrewAI
- OpenAI
- PyJWT
- pdfplumber, pytesseract (OCR), pandas, openpyxl
- Docker

#### 🗂️ Invoice Mappings

Vendor invoice templates are standardized using JSON mappings bundled inside `backend/mapping/`:

```
backend/mapping/
├── media_invoice_1.json
├── media_invoice_2.json
├── media_invoice_3.json
├── media_invoice_4.json
└── media_invoice_5.json
```

These convert vendor-specific invoices into a **common schema** for downstream reconciliation.

---

## ⚖️ Reconciliation Logic

The reconciliation engine compares invoice data against expected campaign data across key fields:

| Field | Source: Invoice | Source: Expected |
|-------|-----------------|------------------|
| Campaign | Invoice | Campaign system |
| Media Vendor | Invoice | Contract |
| Amount | Invoice | Planned spend |
| Impressions | Invoice | Delivery report |
| Billing Period | Invoice | Campaign schedule |

### 🚩 Flagged Discrepancy Types

- **Overbilling** — Invoice amount exceeds contracted or planned spend
- **Missing Campaign Data** — Invoice references an unrecognized campaign
- **Incorrect Billing Period** — Dates do not align with the campaign schedule
- **Media Vendor Mismatch** — Vendor name or ID does not match contract records

---

## 🔄 Workflow

```
Step 1 ── Upload Invoice
           └─ Via web interface

Step 2 ── AI Extraction
           └─ Agents extract: Vendor, Campaign, Invoice Amount,
              Billing Period, Media Type, Line Items

Step 3 ── Data Normalization
           └─ Vendor-specific formats → standard schema

Step 4 ── Reconciliation
           └─ Invoice data compared against expected campaign data

Step 5 ── Discrepancy Report
           └─ Flags mismatches, anomalies, and potential billing errors
```

---

## ⚙️ Setup & Installation

### Prerequisites

- Python 3.8+
- Node.js 18+
- npm

### Clone the Repository

```bash
git clone https://github.com/akhiljoe/media-reconciliation-agent.git
cd media-reconciliation-agent
```

---

### 🌐 Running the Web Dashboard

```bash
cd frontend
npm install
npm run dev
```

Vite serves on **http://localhost:3000** (forced by `vite.config.ts`).

> Note: the `start_frontend.sh` script comment incorrectly says port 5173. The actual port is 3000.

### 🔧 Running the Backend API

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure .env with required vars (see backend README)
# Required: OPENAI_API_KEY, JWT_SECRET, AUTH_USERS

python app.py
```

Backend listens on **http://localhost:5000**.

Login uses real auth now. Generate a password hash:

```bash
python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('your-password'))"
```

Add to `.env`:

```
AUTH_USERS={"akhil@demo.com": "scrypt:..."}
JWT_SECRET=any-long-random-string
```

Mapping JSONs are bundled in `backend/mapping/`.

---

## 💡 Example Use Case

Media agencies often receive hundreds of invoices monthly. Historically, manual verification required:

- 📥 **Downloading** individual invoices from multiple platforms
- 🔍 **Checking** campaign schedules manually in spreadsheets
- 🔢 **Matching** amounts against internal records line by line
- 📊 **Generating** status reports for finance and operations teams

This system replaces all of these manual steps with an **automated, intelligent workflow** — reducing processing time from days to minutes.

---

## 🏆 Hackathon Objective

The goal of this hackathon project was to demonstrate how **AI agents can transform operational workflows** in media finance and billing operations.

### Key Outcomes

| Outcome | Description |
|---------|-------------|
| 🤖 Automated Invoice Parsing | Eliminates manual data entry across invoice formats |
| 📐 Standardized Data Extraction | Ensures consistent formatting across different vendors |
| 🔗 Intelligent Reconciliation | Automatically matches invoices against campaign schedules |
| 📊 Interactive Dashboards | Visual insights into billing status and discrepancies |

---

## 🚀 Future Improvements

Potential enhancements to scale this prototype into a production-grade tool:

- **Full Backend API Service** — Seamless integration with existing software stacks
- **Platform Integration** — Direct connections with Google Ads, Meta, and DV360
- **Automated Fraud Detection** — Identifying suspicious or anomalous billing patterns
- **ML Anomaly Detection** — Flagging statistical outliers in pricing or volume data
- **Real-time Reconciliation Pipelines** — Processing invoices as they arrive
- **Enterprise Billing Integration** — Syncing directly with ERP and finance systems

---

## 👥 Contributors

- **Hackathon Team** — original prototype team

---

> *Built with ❤️ at a hackathon to modernize media billing operations using AI.*
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     