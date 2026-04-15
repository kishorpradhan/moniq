# Moniq: Portfolio Intelligence Platform

A comprehensive web platform for analyzing and understanding investment portfolios using natural language. Moniq enables sophisticated investors managing US and India portfolios to gain actionable insights through an intuitive interface and modern AI-powered analytics.

**Status**: Private Beta (Invite-only)

---

## 🎯 Overview

Moniq is a full-stack SaaS application that bridges the gap between raw portfolio data and actionable investment insights. Users upload their portfolio documents (CSV, PDF, broker statements), and Moniq automatically:

- Parses and validates investment data
- Enriches positions with real-time market data
- Calculates comprehensive metrics (allocation, performance, risk)
- Enables natural language queries across portfolio data

## 🏗️ Architecture

Moniq uses a **microservices architecture** deployed on Google Cloud Platform, with clear separation between frontend, APIs, and background workers:

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser)                         │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
    ┌────────┐   ┌─────────────┐  ┌──────────┐
    │Vercel  │   │Upload API   │  │Portfolio │
    │(Next.js)   │(FastAPI)    │  │API       │
    └────────┘   └────┬────────┘  └──────────┘
                      │
        ┌─────────────┴──────────────┬─────────────────┐
        ▼                            ▼                 ▼
    ┌─────────────┐         ┌──────────────┐    ┌──────────────┐
    │Google Cloud │         │Ingest Worker │    │Market Data   │
    │Storage      │         │(FastAPI)     │    │Worker        │
    │             │         │              │    │(FastAPI)     │
    └──────┬──────┘         └────┬─────────┘    └──────────────┘
           │                     │
           └─────┬───────────────┘
                 ▼
         ┌──────────────────┐
         │Cloud Pub/Sub     │
         │  Topics:         │
         │  • GCS finalize  │
         │  • Uploads       │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │Metrics Worker    │
         │(FastAPI)         │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │Cloud SQL         │
         │(PostgreSQL)      │
         └──────────────────┘
```

### Core Services

#### **Frontend (Next.js)**
- **Stack**: React 18, TypeScript, Tailwind CSS, Next.js 14
- **Deployment**: Vercel
- **Features**:
  - Authentication via Firebase + Google Sign-In
  - Dashboard with portfolio overview
  - Upload interface for portfolio documents
  - Analysis views with natural language query capability
  - Real-time portfolio summary and metrics

#### **Upload API (FastAPI)**
- **Purpose**: Handles file uploads with pre-signed URLs via Google Cloud Storage
- **Deployment**: Google Cloud Run
- **Key Endpoints**:
  - `POST /uploads/presign` - Get pre-signed URL for browser upload
  - `POST /uploads/complete` - Finalize upload and trigger ingestion
  - `GET /health` - Health check
- **Responsibilities**:
  - Generate secure pre-signed URLs for direct GCS uploads
  - Publish upload completion events to Pub/Sub
  - Validate API keys and access control

#### **Ingest Worker (FastAPI)**
- **Purpose**: Processes uploaded files and extracts portfolio data
- **Deployment**: Google Cloud Run (triggered via Pub/Sub)
- **Endpoint**: `POST /pubsub` - Receives Pub/Sub push messages
- **Responsibilities**:
  - Parse CSV, PDF, and broker statement formats
  - Validate and clean investment transaction data
  - Transform raw data into normalized activity records
  - Store activities in PostgreSQL

#### **Portfolio API (FastAPI)**
- **Purpose**: Exposes aggregated portfolio data
- **Endpoints**:
  - `GET /portfolio/summary` - Total value, asset class breakdown
  - `GET /portfolio/allocation` - Detailed allocation percentages
  - `GET /portfolio/positions` - Individual positions with metrics
  - `GET /health` - Health check

#### **Market Data Worker (FastAPI)**
- **Purpose**: Enriches positions with real-time market data
- **Responsibilities**:
  - Fetch current prices for holdings (US stocks, Indian securities)
  - Update position valuations
  - Calculate market metrics and trends
  - Triggered via Pub/Sub events

#### **Metrics Worker (FastAPI)**
- **Purpose**: Calculates portfolio analytics and performance metrics
- **Responsibilities**:
  - Compute allocation percentages by asset class
  - Calculate open/closed position returns
  - Generate performance reports
  - Triggered via Pub/Sub events

### Data Flow

1. **Upload**: User uploads portfolio document (browser → pre-signed GCS URL)
2. **Trigger**: GCS finalize event → Pub/Sub message
3. **Ingest**: Worker parses file and stores activities in database
4. **Enrich**: Market data worker updates prices and valuations
5. **Analyze**: Metrics worker calculates portfolio metrics
6. **Query**: Frontend fetches aggregated data via Portfolio API

### Database (PostgreSQL)

Schema includes:
- **activities**: Raw investment transactions (buys, sells, dividends)
- **prices**: Historical and current market prices
- **positions_metrics**: Calculated position-level metrics (open/closed status, returns, allocation)
- **users_allowlist**: Access control for beta users

Migrations are versioned and managed via SQL files in `db/migrations/`.

### Infrastructure (Terraform)

All cloud resources are Infrastructure-as-Code:

- **GCS Bucket**: Upload storage with lifecycle policies
- **Pub/Sub**: Topics for GCS events, upload notifications, and workers
- **Cloud Run**: Deploy ingest, market data, and metrics workers
- **Cloud SQL**: Managed PostgreSQL instance
- **Service Accounts**: Fine-grained IAM roles and permissions
- **Artifact Registry**: Docker image storage for workers

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (frontend)
- Python 3.10+ (backend services)
- Firebase project with Google Sign-In enabled
- Google Cloud project with billing enabled (for deployment)

### Local Development

#### Frontend
```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Update NEXT_PUBLIC_FIREBASE_* variables in .env.local

# Start dev server (http://localhost:3000)
npm run dev
```

#### Upload API
```bash
cd services/upload-api

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export GCS_BUCKET=your-bucket-name
export UPLOAD_API_KEY=your-api-key
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export GOOGLE_CLOUD_PROJECT=your-project-id

# Start server (http://localhost:8080)
uvicorn app.main:app --reload --port 8080
```

#### Ingest Worker
```bash
cd services/ingest-worker

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start server (http://localhost:8081)
uvicorn app.main:app --reload --port 8081
```

#### Portfolio API
```bash
cd services/portfolio-api

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL=postgresql://user:password@localhost:5432/moniq_stocks

# Start server (http://localhost:8000)
uvicorn app.main:app --reload --port 8000
```

### Database Setup

```bash
cd db
python init_db.py

# Or manually run migrations
psql -h localhost -U moniq_upload -d moniq_stocks < migrations/001_create_activities.sql
```

---

## 📦 Deployment

### Frontend (Vercel)
```bash
# Automatic deployment from Git push
# Env vars configured in Vercel dashboard
# Ignores services/ directory via .vercelignore
```

### Backend Services (Cloud Run)

```bash
# Build and push ingest worker
gcloud run deploy moniq-ingest-worker \
  --source services/ingest-worker \
  --region us-central1 \
  --no-allow-unauthenticated \
  --set-env-vars DATABASE_URL=postgresql://...

# Build and push upload API
gcloud run deploy moniq-upload-api \
  --source services/upload-api \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GCS_BUCKET=...,UPLOAD_API_KEY=...

# Build and push portfolio API
gcloud run deploy moniq-portfolio-api \
  --source services/portfolio-api \
  --region us-central1 \
  --no-allow-unauthenticated \
  --set-env-vars DATABASE_URL=...
```

### Infrastructure (Terraform)

```bash
cd infra/terraform

# Setup
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your configuration

# Deploy
terraform init
terraform plan
terraform apply
```

---

## 🔐 Security & Auth

### Firebase Authentication
- Google Sign-In via Firebase
- JWT tokens passed in Authorization headers
- API key validation for service-to-service calls

### API Security
- Pre-signed URLs for GCS uploads (time-limited, single-use)
- Cloud Run service authentication (no public access to workers)
- Pub/Sub push authentication (Cloud Run verifies source)
- Fine-grained IAM roles for service accounts

### Data Security
- Encrypted in transit (TLS/SSL)
- Encrypted at rest (GCS + Cloud SQL defaults)
- User-scoped data isolation via Firebase UID
- SQL injection prevention via parameterized queries/ORM

---

## 📂 Project Structure

```
moniq/
├── app/                     # Next.js frontend
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing page
│   ├── dashboard/           # Portfolio dashboard
│   ├── upload/              # File upload interface
│   ├── analysis/            # Analytics views
│   ├── chat/                # Natural language queries
│   ├── api/                 # Next.js API routes
│   └── globals.css          # Tailwind CSS
├── components/              # Reusable React components
│   ├── Shell.tsx            # App layout wrapper
│   ├── Sidebar.tsx          # Navigation
│   ├── AuthProvider.tsx     # Firebase auth context
│   ├── PositionsList.tsx    # Holdings display
│   ├── StatCard.tsx         # Metric cards
│   └── ScreenshotPreviewCard.tsx
├── lib/                     # Utilities
│   ├── firebaseClient.ts    # Firebase initialization
│   ├── authFetch.ts         # HTTP client with auth
│   └── portfolio.ts         # Portfolio API client
├── public/                  # Static assets
├── services/                # Backend microservices
│   ├── upload-api/          # File upload service
│   ├── ingest-worker/       # File parsing & ingestion
│   ├── market-data-worker/  # Price enrichment
│   ├── metrics-worker/      # Analytics calculations
│   └── portfolio-api/       # Portfolio data API
├── db/                      # Database
│   ├── init_db.py           # Initialization script
│   └── migrations/          # SQL migration files
├── infra/                   # Infrastructure as Code
│   └── terraform/           # GCP resource definitions
├── package.json             # Frontend dependencies
└── README.md                # This file
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS |
| **Authentication** | Firebase + Google Sign-In |
| **Upload** | Google Cloud Storage (GCS) |
| **APIs** | FastAPI (Python) |
| **Message Queue** | Google Cloud Pub/Sub |
| **Database** | PostgreSQL (Cloud SQL) |
| **Deployment** | Vercel (frontend), Cloud Run (APIs) |
| **Infrastructure** | Terraform (IaC) |

---

## 📊 Supported Portfolio Types

- **US Equities**: Stocks, ETFs, Mutual Funds (via brokers like Robinhood, Fidelity, Charles Schwab)
- **Indian Securities**: Stocks, ETFs, Mutual Funds (via NSE/BSE)
- **Cryptocurrency**: Bitcoin, Ethereum, and other major cryptocurrencies
- **Bonds & Fixed Income**: Treasury securities, corporate bonds

---

## 🔄 Data Processing Pipeline

```
Upload → Parse → Validate → Store → Enrich → Analyze → Query
  ↓         ↓        ↓        ↓       ↓        ↓        ↓
Browser   Ingest  Validation DB    Market   Metrics  API
          Worker             SQL    Data     Worker
                                   Worker
```

---

## 🤝 Contributing

**Note**: This project is currently in private beta. We're working with early users to refine the product. If you're interested in contributing or providing feedback, [request beta access](https://moniq.app/request-access).

---

## 📝 License

[License information to be added]

---

## 👨‍💻 Author

Built by Kishor Pradhan

---

## 📞 Support

For questions, feature requests, or bug reports, please [reach out](https://moniq.app).

---

## 🗺️ Roadmap

- [ ] Natural language chat interface for portfolio queries
- [ ] Custom alerts and notifications
- [ ] Tax optimization recommendations
- [ ] Advanced risk analytics (VaR, Sharpe ratio)
- [ ] Mobile app (iOS/Android)
- [ ] Support for additional asset classes (crypto, options, commodities)
- [ ] Multi-currency portfolio analysis
