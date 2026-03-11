# AI Media Billing Reconciliation Platform

An AI-powered system designed to automate **media invoice extraction, validation, and reconciliation**.  
Built during a hackathon to demonstrate how **AI agents and modern data workflows** can eliminate manual billing verification in media operations.

The platform combines **AI document extraction, reconciliation logic, and user-facing applications** to streamline media billing workflows.

---

# Overview

Media agencies handle thousands of invoices across platforms such as TV, Digital, and Programmatic advertising. Manual reconciliation between invoices, campaign data, and billing systems is slow and error-prone.

This project introduces an **AI-driven reconciliation system** that:

1. Extracts structured data from invoices
2. Standardizes invoice formats
3. Reconciles them against expected campaign or billing data
4. Generates discrepancy reports
5. Provides a mobile and web interface for review

---

# Architecture
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


---

# Repository Structure
NXT24BNGAccelerator-main
│
├── MediaBillingMobileApp
│ Mobile application for invoice upload and reconciliation reporting
│
├── MediaBillingNotebook
│ AI agents and document extraction logic
│
├── MediaBillingReconcilliation
│ Web dashboard for reviewing reconciliation results
│
└── README.md


---

# Components

## 1. MediaBillingNotebook

AI extraction and data processing layer.

This module demonstrates how **AI agents can parse and interpret unstructured media invoices**.

### Key Features

- Multi-format document ingestion
- AI-powered field extraction
- Mapping different invoice formats to a standardized schema
- Agent-based processing pipeline

### AI Agents

The system demonstrates a **multi-agent architecture**:

- Data Extraction Agent
- Invoice Normalization Agent
- Validation Agent
- Reconciliation Preparation Agent

### Technologies

- Python
- Jupyter Notebook
- CrewAI
- OpenAI / LLM APIs

### Example Data Mapping

Invoice templates are standardized using JSON mappings:
mapping/
media_invoice_1.json
media_invoice_2.json
media_invoice_3.json
media_invoice_4.json
media_invoice_5.json


These mappings help convert vendor-specific invoices into a **common schema**.

---

# 2. MediaBillingMobileApp

Mobile application that allows users to:

- Upload invoices
- Extract invoice data
- View reconciliation reports

### Features

- Login screen
- Invoice extraction interface
- Reconciliation report viewing

### Tech Stack

- React Native
- TypeScript
- Expo
- REST API integration

### Main Screens
LoginScreen
InvoiceExtractorScreen
ReconciliationReportScreen


### Project Structure
MediaBillingMobileApp/src
│
├── navigation
│ AppNavigator.tsx
│
├── screens
│ LoginScreen.tsx
│ InvoiceExtractorScreen.tsx
│ ReconciliationReportScreen.tsx
│
├── services
│ api.ts
│
└── types


---

# 3. MediaBillingReconciliation

Web-based interface to **review discrepancies and reconciliation results**.

Users can:

- View extracted invoice data
- Compare expected vs billed amounts
- Review discrepancies
- Generate reconciliation reports

### Tech Stack

- React
- TypeScript
- CSS
- Vite / modern frontend tooling

### Key UI Components
DiscrepancyReport
DiscrepancyReview
InvoiceComparison


---

# Reconciliation Logic

The reconciliation engine compares:

| Field | Invoice Data | Expected Data |
|------|--------------|---------------|
| Campaign | Invoice | Campaign system |
| Media Vendor | Invoice | Contract |
| Amount | Invoice | Planned spend |
| Impressions | Invoice | Delivery report |
| Billing Period | Invoice | Campaign schedule |

The system flags discrepancies such as:

- Overbilling
- Missing campaign data
- Incorrect billing periods
- Media vendor mismatches

---

# Workflow

### Step 1 — Upload Invoice

User uploads invoice through:

- Mobile app
- Web interface

### Step 2 — AI Extraction

AI agents extract structured fields:
Vendor
Campaign
Invoice Amount
Billing Period
Media Type
Line Items


### Step 3 — Data Normalization

Different invoice formats are converted to a **standard schema**.

### Step 4 — Reconciliation

Invoice data is compared against expected campaign data.

### Step 5 — Discrepancy Report

System generates a report highlighting:

- mismatches
- anomalies
- potential billing errors

---

# Setup

## 1. Clone Repository

```bash
git clone https://github.com/<your-repo>/media-reconciliation-agent.git
cd media-reconciliation-agent

## Running the Notebook
cd MediaBillingNotebook
pip install -r requirements.txt
jupyter notebook

### Open
MediaBillingCrew.ipynb

## Running the Web App
cd MediaBillingReconcilliation
npm install
npm run dev

## Running the Mobile App
cd MediaBillingMobileApp
npm install
npm start
#### This will start the Expo development server.


## Example Use Case
Media agencies often receive hundreds of invoices monthly. Historically, manual verification required:
* **Downloading** individual invoices.
* **Checking** campaign schedules manually.
* **Matching** amounts against internal records.
* **Generating** status reports.

This system replaces these manual steps with an automated, intelligent workflow.

## Hackathon Objective
The goal of this hackathon project was to demonstrate how AI agents can transform operational workflows in media finance and billing operations.

### Key Outcomes
* **Automated Invoice Parsing:** Eliminates manual data entry.
* **Standardized Data Extraction:** Ensures consistent formatting across different vendors.
* **Intelligent Reconciliation:** Automatically matches invoice data against campaign schedules.
* **Interactive Dashboards:** Provides visual insights into billing status and discrepancies.

## Future Improvements
Potential enhancements to scale this prototype into a production-grade tool include:
* **Full Backend API Service:** For seamless software integration.
* **Platform Integration:** Direct connections with media platforms like Google Ads, Meta, and DV360.
* **Automated Fraud Detection:** Identifying suspicious billing patterns.
* **Machine Learning Anomaly Detection:** Flagging outliers in pricing or volume.
* **Real-time Reconciliation Pipelines:** Processing invoices as they arrive.
* **Enterprise Billing Integration:** Syncing data directly with ERP systems.

## Contributors
* **Hackathon Team**