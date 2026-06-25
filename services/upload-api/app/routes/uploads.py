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
from app.repositories import profiles as profiles_repo

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


def _requested_profile_id(request: Request, profile_id: str | None = None) -> str | None:
    return profile_id or request.headers.get("x-moniq-profile-id")


def _resolve_profile_id(cur, user_id: str, request: Request, profile_id: str | None = None) -> str:
    requested = _requested_profile_id(request, profile_id)
    try:
        return profiles_repo.resolve_profile_id(cur, user_id, requested)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


class PresignRequest(BaseModel):
    filename: str
    contentType: str
    profileId: str | None = None


class PresignResponse(BaseModel):
    uploadUrl: str
    filePath: str
    profileId: str


class CompleteRequest(BaseModel):
    filePath: str
    profileId: str | None = None


@router.post("/presign", response_model=PresignResponse)
def presign(payload: PresignRequest, request: Request):
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            user = require_user(request, conn)
            profile_id = _resolve_profile_id(cur, user["id"], request, payload.profileId)
    finally:
        conn.close()

    safe_name = sanitize_filename(payload.filename)
    file_path = f"uploads/{profile_id}/{int(time.time() * 1000)}-{safe_name}"

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

    return {"uploadUrl": upload_url, "filePath": file_path, "profileId": profile_id}


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
        with conn.cursor() as cur:
            user = require_user(request, conn)
            profile_id = _resolve_profile_id(cur, user["id"], request, payload.profileId)
    finally:
        conn.close()

    message = json.dumps(
        {
            "bucket": bucket_name,
            "name": payload.filePath,
            "user_id": user["id"],
            "profile_id": profile_id,
        }
    ).encode("utf-8")
    publish_future = publisher.publish(topic_path, message)
    publish_future.result(timeout=5)

    print("upload complete", {"filePath": payload.filePath, "profileId": profile_id})
    return {"success": True, "profileId": profile_id}
