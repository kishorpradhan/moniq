# Ingest Worker

Consumes Pub/Sub push messages from GCS finalize events and processes uploaded files.

## Local Setup
1. `cd services/ingest-worker`
2. `python -m venv .venv`
3. `source .venv/bin/activate`
4. `pip install -r requirements.txt`
5. `uvicorn app.main:app --reload --port 8081`

## Endpoint
- `POST /pubsub` (Pub/Sub push)
- `GET /health`
