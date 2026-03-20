# Moniq Backend (Python)

FastAPI + Google Cloud Storage upload API for Moniq.

## Endpoints
- `GET /health`
- `POST /uploads/presign`
- `POST /uploads/complete`

## Local Setup
1. `cd services/upload-api`
2. `python -m venv .venv`
3. `source .venv/bin/activate`
4. `pip install -r requirements.txt`
5. `export GCS_BUCKET=YOUR_BUCKET_NAME`
6. `export UPLOADED_FILES_TOPIC=uploadedfiles`
7. `export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json`
8. `export GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID`
9. `export UPLOAD_API_KEY=YOUR_API_KEY`
10. `uvicorn app.main:app --reload --port 8080`

## Deploy (Cloud Run)
```bash
gcloud run deploy moniq-upload-api \
  --source services/upload-api \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GCS_BUCKET=YOUR_BUCKET_NAME,UPLOADED_FILES_TOPIC=uploadedfiles,UPLOAD_API_KEY=YOUR_API_KEY
```
