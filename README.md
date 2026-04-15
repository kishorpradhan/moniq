
# Moniq: Portfolio Intelligence Platform

Moniq is a portfolio intelligence platform that helps investors understand their investments through natural language and modern analytics.

The platform is designed for investors who manage **multi-account and cross-border portfolios**, particularly across **US and India markets**. Instead of manually navigating dashboards and spreadsheets, users can upload portfolio data and ask questions directly.

Example questions Moniq can answer:

- What are my top positions?
- How did my portfolio perform in 2024 compared to the S&P 500?
- How does my return in India investments compared to the US investments?
- What drove my returns last quarter?

**Status:** Private Beta (Invite-only)

---

# Overview

Moniq bridges the gap between **raw portfolio data and actionable insights**.

Users upload portfolio documents (CSV, PDF, broker statements), and Moniq automatically:

• Parses and validates investment data  
• Enriches positions with real-time market data  
• Calculates portfolio metrics (allocation, performance, XIRR)  
• Enables natural language portfolio queries  

The system is built as a **cloud-native microservices architecture** designed for scalability, security, and extensibility.

---

# What Makes Moniq Different

Many portfolio tools focus only on dashboards. Moniq combines **s/w engineering, financial analytics, and AI reasoning** to make portfolio analysis easier.

Key differentiators:

• Natural language portfolio analytics instead of manual dashboards  
• Cross-border portfolio support (US + India)  
• Deterministic financial calculations for accuracy  
• AI-powered explanations and insights  
• Unified ingestion of portfolio documents  

---

# System Architecture

Moniq uses a microservices architecture deployed on **Google Cloud Platform**.

```
┌─────────────────────────────┐
│        Client (Browser)     │
└──────────────┬──────────────┘
               │ HTTPS
               ▼
        ┌───────────────┐
        │  Next.js App  │
        │   (Vercel)    │
        └──────┬────────┘
               │
               ▼
       ┌─────────────────┐
       │  Portfolio API  │
       │    (FastAPI)    │
       └──────┬──────────┘
              │
      ┌───────┴──────────────────┐
      ▼                          ▼
┌──────────────┐        ┌──────────────┐
│ Upload API   │        │ Query Engine │
│ (FastAPI)    │        │ (AI Service) │
└──────┬───────┘        └──────┬───────┘
       │                        │
       ▼                        ▼
┌──────────────┐        ┌──────────────┐
│ GCS Storage  │        │ Deterministic│
│              │        │ Analytics    │
└──────┬───────┘        └──────────────┘
       │
       ▼
┌──────────────┐
│ Pub/Sub      │
│ Workers      │
└──────┬───────┘
       ▼
┌──────────────┐
│ PostgreSQL   │
│ (Cloud SQL)  │
└──────────────┘
```

Core architectural principles:

• Separation between ingestion, analytics, and query systems  
• Event-driven processing via Pub/Sub  
• Deterministic financial analytics layer  
• AI reasoning layer isolated as a separate service  

---

# AI Query Engine

Natural language portfolio questions are powered by a separate service called:

**portfolio-chat-agent**

This service is responsible for:

• Understanding user questions  
• Planning required analytics  
• Executing deterministic portfolio calculations  
• Generating human-readable explanations  

Moniq interacts with this service through an internal API.

---

## High-Level Query Flow

```
User Question
      │
      ▼
Moniq Web Application
      │
      ▼
Portfolio API
      │
      ▼
Portfolio Chat Service
      │
      ▼
Deterministic Analytics + LLM Reasoning
      │
      ▼
Response to User
```

The full architecture of the AI reasoning system is documented in the **portfolio-chat-agent** repository.

---

# Data Processing Pipeline

Portfolio data follows a structured pipeline from upload to analytics.

```
Upload → Parse → Validate → Store → Enrich → Analyze → Query
  ↓         ↓        ↓        ↓       ↓        ↓        ↓
Browser   Ingest  Validation DB    Market   Metrics  API
          Worker             SQL    Data     Worker
                                   Worker
```

Steps:

1. User uploads portfolio documents through the web interface. Currently only CSV uploads are supported. 
2. Files are stored in Google Cloud Storage.
3. Pub/Sub triggers ingestion workers.
4. Portfolio transactions are parsed and normalized.
5. Market data workers enrich holdings with prices.
6. Metrics workers compute portfolio analytics.
7. Portfolio API exposes aggregated results to the frontend.

---

# Portfolio Data Model

Moniq models portfolios using a **transaction-first architecture**.

```
Trades / Transactions
        │
        ▼
Activities Table
        │
        ▼
Position Builder
        │
        ▼
Open / Closed Positions
        │
        ▼
Portfolio Metrics
```

Key tables:

• activities – raw trade events (buy, sell, dividend)  
• prices – historical and current market prices  
• positions_metrics – calculated portfolio metrics  
• users_allowlist – beta access control  

This design ensures **deterministic financial calculations** and reproducible analytics.

---

# Data Privacy

Investor data requires strong privacy guarantees.

Moniq follows **data minimization principles**:

• Portfolio data remains inside the analytics layer  
• Raw trades are not sent directly to LLMs  
• AI models receive only computed results or metadata  
• All sensitive computations occur inside controlled services  

This architecture minimizes data exposure while still enabling AI-powered insights.

---

# Performance Goals

Moniq is designed for interactive portfolio analysis.

Target metrics:

• Upload processing: < 30 seconds  
• Portfolio queries: < 2 seconds  
• Cached analytics reuse for common queries  
• Deterministic computation for repeatability  

---

# Tech Stack

| Layer | Technology |
|------|-----------|
Frontend | Next.js 14, React, TypeScript, Tailwind |
Authentication | Firebase + Google Sign-In |
APIs | FastAPI |
Storage | Google Cloud Storage |
Messaging | Google Cloud Pub/Sub |
Database | PostgreSQL (Cloud SQL) |
Deployment | Vercel + Cloud Run |
Infrastructure | Terraform |

---

# Supported Portfolio Types

Moniq currently supports:

• US equities (stocks)  

Future releases will expand support for India and additional asset classes.

• Indian securities (NSE/BSE equities and funds)  
• Cryptocurrencies (major assets)  
• Fixed income instruments  

---

# Roadmap

Planned improvements include:

• Natural language portfolio insights  
• Advanced risk analytics (VaR, Sharpe ratio)  
• Multi-currency portfolio analysis  
• Broker integrations (Robinhood, Interactive Brokers, Zerodha)  
• Custom alerts and notifications  
• Mobile applications  

---

# Project Structure

```
moniq/
├── app/                # Next.js frontend
├── components/         # React components
├── lib/                # Utilities
├── services/           # Backend services
│   ├── upload-api/
│   ├── ingest-worker/
│   ├── market-data-worker/
│   ├── metrics-worker/
│   └── portfolio-api/
├── db/                 # Database schema and migrations
├── infra/              # Terraform infrastructure
└── README.md
```

---

# Author

**Kishor Pradhan**

Engineering leader with experience building large-scale data platforms across advertising, commerce, and financial systems.

Moniq explores how **s/w engineering and AI systems can combine to create better investment intelligence platforms.**
