# 🧾 AI Media Billing Reconciliation Platform

> An AI-powered system designed to automate **media invoice extraction, validation, and reconciliation** — built during a hackathon to demonstrate how AI agents and modern data workflows can eliminate manual billing verification in media operations.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Components](#components)
  - [1. MediaBillingNotebook](#1-mediabillingnotebook)
  - [2. MediaBillingMobileApp](#2-mediabillingmobileapp)
  - [3. MediaBillingReconciliation](#3-mediabillingreconciliation)
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
5. Provides a mobile and web interface for review

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
          +------------+-------------+
          |                          |
          v                          v
 +----------------+         +--------------------+
 | Web Dashboard  |         | Mobile Application |
 | Reconciliation |         | Invoice Upload     |
 | Review         |         | & Reports          |
 +----------------+         +--------------------+
```

---

## 📁 Repository Structure

```
NXT24BNGAccelerator-main/
│
├── MediaBillingMobileApp/        # Mobile app for invoice upload & reporting
│
├── MediaBillingNotebook/         # AI agents and document extraction logic
│
├── MediaBillingReconciliation/   # Web dashboard for reconciliation review
│
└── README.md
```

---

## 🧩 Components

### 1. MediaBillingNotebook

The AI extraction and data processing layer — demonstrates how **AI agents can parse and interpret unstructured media invoices**.

#### ✨ Key Features

- Multi-format document ingestion (PDF, Image, CSV)
- AI-powered field extraction
- Mapping vendor-specific invoice formats to a standardized schema
- Agent-based processing pipeline

#### 🤖 AI Agents

The system uses a **multi-agent architecture** powered by CrewAI:

| Agent | Responsibility |
|-------|---------------|
| Data Extraction Agent | Parses raw invoice documents |
| Invoice Normalization Agent | Maps vendor formats to standard schema |
| Validation Agent | Checks data quality and completeness |
| Reconciliation Preparation Agent | Prepares data for matching |

#### 🛠️ Technologies

- Python
- Jupyter Notebook
- [CrewAI](https://www.crewai.com/)
- OpenAI / LLM APIs

#### 🗂️ Invoice Mappings

Invoice templates are standardized using JSON mappings:

```
mapping/
├── media_invoice_1.json
├── media_invoice_2.json
├── media_invoice_3.json
├── media_invoice_4.json
└── media_invoice_5.json
```

These mappings convert vendor-specific invoices into a **common schema** for downstream reconciliation.

---

### 2. MediaBillingMobileApp

A mobile application enabling field users to upload invoices, extract data, and view reconciliation reports on the go.

#### ✨ Features

- User login & authentication
- Invoice upload and AI extraction interface
- Reconciliation report viewer

#### 🛠️ Tech Stack

- React Native
- TypeScript
- Expo
- REST API integration

#### 📱 Screens

```
MediaBillingMobileApp/src/
│
├── navigation/
│   └── AppNavigator.tsx
│
├── screens/
│   ├── LoginScreen.tsx
│   ├── InvoiceExtractorScreen.tsx
│   └── ReconciliationReportScreen.tsx
│
├── services/
│   └── api.ts
│
└── types/
```

---

### 3. MediaBillingReconciliation

A web-based interface to **review discrepancies and reconciliation results** in detail.

#### ✨ Features

- View extracted invoice data side-by-side
- Compare expected vs. billed amounts
- Drill into individual discrepancies
- Generate and export reconciliation reports

#### 🛠️ Tech Stack

- React
- TypeScript
- CSS
- Vite

#### 🖥️ Key UI Components

| Component | Purpose |
|-----------|---------|
| `DiscrepancyReport` | High-level report of all flagged issues |
| `DiscrepancyReview` | Detailed view for individual discrepancies |
| `InvoiceComparison` | Side-by-side invoice vs. expected data view |

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
           └─ Via mobile app or web interface

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
- npm / Expo CLI

### Clone the Repository

```bash
git clone https://github.com/akhiljoe/media-reconciliation-agent.git
cd media-reconciliation-agent
```

---

### 🐍 Running the Notebook (AI Extraction Layer)

```bash
cd MediaBillingNotebook
pip install -r requirements.txt
jupyter notebook
```

Then open **`MediaBillingCrew.ipynb`** in the Jupyter interface.

---

### 🌐 Running the Web Dashboard

```bash
cd MediaBillingReconciliation
npm install
npm run dev
```

---

### 📱 Running the Mobile App

```bash
cd MediaBillingMobileApp
npm install
npm start
```

This will start the **Expo development server**. Scan the QR code with the Expo Go app on your device.

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

- **Hackathon Team** — NXT24 BNG Accelerator

---

> *Built with ❤️ at a hackathon to modernize media billing operations using AI.*
