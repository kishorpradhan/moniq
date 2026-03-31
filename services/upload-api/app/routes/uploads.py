import json
import os
import re
import time

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from google.cloud import pubsub_v1
from google.auth import default as google_auth_default
from google.auth import impersonated_credentials
from google.auth.transport.requests import Request as GoogleAuthRequest

from app.auth import require_user
from app.config.storage import bucket, bucket_name
from app.db import get_db_conn

router = APIRouter()
publisher = pubsub_v1.PublisherClient()
topic_name = os.getenv("UPLOADED_FILES_TOPIC")
project_id = (
    os.getenv("GOOGLE_CLOUD_PROJECT")
    or os.getenv("GCP_PROJECT")
    or os.getenv("PROJECT_ID")
)
topic_path = publisher.topic_path(project_id, topic_name) if project_id and topic_name else None
signer_email = os.getenv("UPLOAD_API_SIGNER_EMAIL")


def sanitize_filename(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]", "_", name)


class PresignRequest(BaseModel):
    filename: str
    contentType: str


class PresignResponse(BaseModel):
    uploadUrl: str
    filePath: str


class CompleteRequest(BaseModel):
    filePath: str


@router.post("/presign", response_model=PresignResponse)
def presign(payload: PresignRequest, request: Request):
    conn = get_db_conn()
    try:
        require_user(request, conn)
    finally:
        conn.close()

    safe_name = sanitize_filename(payload.filename)
    file_path = f"uploads/{int(time.time() * 1000)}-{safe_name}"

    blob = bucket.blob(file_path)
    if signer_email:
        credentials, _ = google_auth_default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        credentials.refresh(GoogleAuthRequest())
        signer = impersonated_credentials.Credentials(
            source_credentials=credentials,
            target_principal=signer_email,
            target_scopes=["https://www.googleapis.com/auth/devstorage.read_write"],
            lifetime=15 * 60,
        )
        upload_url = blob.generate_signed_url(
            version="v4",
            expiration=15 * 60,
            method="PUT",
            content_type=payload.contentType,
            service_account_email=signer_email,
            credentials=signer,
        )
    else:
        upload_url = blob.generate_signed_url(
            version="v4",
            expiration=15 * 60,
            method="PUT",
            content_type=payload.contentType,
        )

    return {"uploadUrl": upload_url, "filePath": file_path}


@router.post("/complete")
def complete(payload: CompleteRequest, request: Request):
    if not payload.filePath:
        raise HTTPException(status_code=400, detail="filePath is required")

    if not topic_path:
        raise HTTPException(
            status_code=500,
            detail="Missing Pub/Sub config (UPLOADED_FILES_TOPIC and GOOGLE_CLOUD_PROJECT)",
        )

    conn = get_db_conn()
    try:
        user = require_user(request, conn)
    finally:
        conn.close()

    message = json.dumps(
        {"bucket": bucket_name, "name": payload.filePath, "user_id": user["id"]}
    ).encode("utf-8")
    publish_future = publisher.publish(topic_path, message)
    publish_future.result(timeout=5)

    print("upload complete", {"filePath": payload.filePath})
    return {"success": True}
