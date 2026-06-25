# Moniq Web App Architecture

This document is editable Markdown. The diagrams use Mermaid, so they can be changed directly in this file or pasted into https://mermaid.live.

## System Context

```mermaid
flowchart TB
  user["Investor<br/>Browser"]
  firebase["Firebase Auth<br/>Identity provider"]
  web["Moniq Web App<br/>Next.js / React / TypeScript<br/>Vercel or Node host"]

  subgraph nextApi["Next.js API Routes"]
    uploadProxy["Upload proxy<br/>/api/uploads/*"]
    portfolioProxy["Portfolio proxy<br/>/api/portfolio/*<br/>/api/auth/me<br/>/api/uploads/recent"]
    chatProxy["Chat proxy<br/>/api/chat/*"]
    betaRequest["Beta request<br/>/api/beta-request"]
  end

  subgraph gcp["Google Cloud Platform"]
    uploadApi["Upload API<br/>FastAPI on Cloud Run"]
    portfolioApi["Portfolio API<br/>FastAPI on Cloud Run"]
    ingestWorker["Ingest Worker<br/>FastAPI on Cloud Run"]
    metricsWorker["Metrics Worker<br/>FastAPI on Cloud Run"]
    marketDataWorker["Market Data Worker<br/>FastAPI on Cloud Run"]
    gcs["Cloud Storage<br/>uploaded files"]
    pubsubUploads["Pub/Sub<br/>uploaded-files"]
    pubsubGcs["Pub/Sub<br/>gcs-files-added"]
    pubsubIngestion["Pub/Sub<br/>ingestion-completed"]
    cloudSql["Cloud SQL PostgreSQL<br/>activities, prices, positions_metrics,<br/>ingestion_runs, users_allowlist"]
    secrets["Secret Manager<br/>DB passwords and market data keys"]
    artifactRegistry["Artifact Registry<br/>service images"]
  end

  chatAgent["Portfolio Chat Agent<br/>external/internal AI service"]
  marketProviders["Market data providers<br/>StockData / Alpha Vantage / Stooq"]

  user -->|"HTTPS"| web
  web -->|"Firebase client SDK"| firebase
  web --> uploadProxy
  web --> portfolioProxy
  web --> chatProxy
  web --> betaRequest

  uploadProxy -->|"x-api-key + bearer token"| uploadApi
  portfolioProxy -->|"bearer token"| portfolioApi
  chatProxy -->|"question + conversation context"| chatAgent

  uploadApi -->|"verify Firebase ID token"| firebase
  portfolioApi -->|"verify Firebase ID token"| firebase
  uploadApi -->|"signed PUT URL"| gcs
  uploadApi -->|"publish upload metadata"| pubsubUploads
  uploadApi --> cloudSql

  gcs -->|"OBJECT_FINALIZE notification"| pubsubGcs
  pubsubUploads -->|"push /pubsub"| ingestWorker
  pubsubGcs -->|"push /pubsub"| ingestWorker
  ingestWorker -->|"read uploaded file"| gcs
  ingestWorker -->|"parse, validate, normalize"| cloudSql
  ingestWorker -->|"publish account recompute event"| pubsubIngestion

  pubsubIngestion -->|"push /pubsub/ingestion-complete"| metricsWorker
  metricsWorker -->|"read activities + prices<br/>write metrics"| cloudSql

  marketDataWorker -->|"refresh prices"| marketProviders
  marketDataWorker -->|"write prices"| cloudSql

  portfolioApi -->|"read user portfolio data"| cloudSql
  chatAgent -->|"deterministic portfolio tools / analytics"| portfolioApi

  uploadApi -.-> secrets
  portfolioApi -.-> secrets
  ingestWorker -.-> secrets
  metricsWorker -.-> secrets
  marketDataWorker -.-> secrets
  artifactRegistry -.-> uploadApi
  artifactRegistry -.-> portfolioApi
  artifactRegistry -.-> ingestWorker
  artifactRegistry -.-> metricsWorker
  artifactRegistry -.-> marketDataWorker
```

## Upload And Processing Flow

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant Web as Next.js Web App
  participant UploadProxy as Next.js upload routes
  participant UploadAPI as Upload API
  participant Firebase as Firebase Auth
  participant GCS as Cloud Storage
  participant UploadTopic as Pub/Sub uploaded-files
  participant GcsTopic as Pub/Sub gcs-files-added
  participant Ingest as Ingest Worker
  participant DB as Cloud SQL PostgreSQL
  participant DoneTopic as Pub/Sub ingestion-completed
  participant Metrics as Metrics Worker

  User->>Web: Select portfolio CSV
  Web->>UploadProxy: POST /api/uploads/presign
  UploadProxy->>UploadAPI: POST /uploads/presign
  UploadAPI->>Firebase: Verify bearer token
  UploadAPI->>DB: Resolve or create allowlisted user
  UploadAPI-->>UploadProxy: Signed GCS upload URL + filePath
  UploadProxy-->>Web: Signed upload details
  Web->>GCS: PUT file to signed URL
  Web->>UploadProxy: POST /api/uploads/complete
  UploadProxy->>UploadAPI: POST /uploads/complete
  UploadAPI->>Firebase: Verify bearer token
  UploadAPI->>UploadTopic: Publish bucket, object, user_id
  GCS->>GcsTopic: OBJECT_FINALIZE event
  UploadTopic->>Ingest: Push /pubsub
  GcsTopic->>Ingest: Push /pubsub
  Ingest->>GCS: Read uploaded file
  Ingest->>DB: Record ingestion run and insert activities
  Ingest->>DoneTopic: Publish account-level completion events
  DoneTopic->>Metrics: Push /pubsub/ingestion-complete
  Metrics->>DB: Recompute positions and portfolio metrics
```

## Dashboard And Chat Flow

```mermaid
flowchart LR
  browser["Browser UI<br/>dashboard, upload, analysis, chat"]
  auth["Firebase Auth<br/>ID token"]
  nextRoutes["Next.js API Routes"]
  portfolioApi["Portfolio API<br/>/portfolio/summary<br/>/portfolio/allocation<br/>/portfolio/positions<br/>/uploads/recent"]
  chatAgent["Portfolio Chat Agent<br/>/chat/run<br/>/chat/history"]
  db["Cloud SQL PostgreSQL"]

  browser -->|"Bearer token"| nextRoutes
  browser -->|"sign in / token refresh"| auth
  nextRoutes -->|"forward bearer token"| portfolioApi
  nextRoutes -->|"forward bearer token + prompt"| chatAgent
  portfolioApi -->|"verify token"| auth
  portfolioApi -->|"read scoped user data"| db
  chatAgent -->|"analytics API calls or tool results"| portfolioApi
  portfolioApi -->|"JSON portfolio data"| nextRoutes
  chatAgent -->|"answer JSON"| nextRoutes
  nextRoutes --> browser
```

## Primary Code Owners

| Area | Repository path |
| --- | --- |
| Web app pages | `app/*/page.tsx` |
| Shared UI | `components/` |
| Next.js API proxies | `app/api/**/route.ts` |
| Firebase client auth | `lib/firebaseClient.ts` |
| Upload service | `services/upload-api/` |
| Portfolio read API | `services/portfolio-api/` |
| Ingestion worker | `services/ingest-worker/` |
| Metrics worker | `services/metrics-worker/` |
| Market data worker | `services/market-data-worker/` |
| Database schema | `db/migrations/` |
| GCP infrastructure | `infra/terraform/` |

## Notes

- The web app is intentionally thin: browser pages call local Next.js API routes, and those routes proxy to backend services using environment variables such as `UPLOAD_API_URL`, `PORTFOLIO_API_URL`, and `CHAT_AGENT_URL`.
- Firebase ID tokens are verified by the Upload API and Portfolio API. Allowlist checks are backed by `users_allowlist` in PostgreSQL.
- Upload completion currently publishes an explicit `uploaded-files` event, while Cloud Storage also emits `OBJECT_FINALIZE` events to `gcs-files-added`. Both are wired to the ingest worker in Terraform.
- Portfolio metrics are recomputed after successful ingestion through the `ingestion-completed` Pub/Sub topic.
