# Moniq

Moniq is a personal finance web app. This repo is a simple monorepo with a Next.js frontend and an Express backend.

## Structure
- Frontend (Next.js): repo root
- Upload API (FastAPI): `services/upload-api/`
- Ingest Worker (FastAPI): `services/ingest-worker/`
- Infra (Terraform): `infra/terraform/`

## Frontend
```bash
npm install
npm run dev
```

## Upload API (Python)
```bash
cd services/upload-api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

## Ingest Worker (Python)
```bash
cd services/ingest-worker
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8081
```

## Deploy
- Frontend: Vercel (root project)
- Upload API: Cloud Run (`services/upload-api/`)
- Ingest Worker: Cloud Run (`services/ingest-worker/`)
- Infra: Terraform (`infra/terraform/`)

## Notes
- Vercel ignores `services/` via `.vercelignore`.

## Auth (Firebase Google Sign-In)
Client env vars (Next.js):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Server env vars (Cloud Run):
- `FIREBASE_PROJECT_ID` (portfolio-api + upload-api)

Chat service env vars (Next.js server):
- `CHAT_AGENT_URL` (e.g., https://portfolio-chat-agent-xxxx.a.run.app)

Beta allowlist:
- Add allowed emails to `beta_users` table (lowercase).
