import logging
import os
from typing import Optional

import firebase_admin
from firebase_admin import auth as firebase_auth
from fastapi import HTTPException, Request

from app.repositories import demo_sessions as demo_sessions_repo
from app.repositories import users as users_repo

logger = logging.getLogger("portfolio-api")


def _init_firebase():
    if firebase_admin._apps:
        return
    project_id = (
        os.getenv("FIREBASE_PROJECT_ID")
        or os.getenv("GOOGLE_CLOUD_PROJECT")
        or os.getenv("PROJECT_ID")
    )
    firebase_admin.initialize_app(options={"projectId": project_id})


def _get_bearer_token(request: Request) -> Optional[str]:
    auth_header = request.headers.get("authorization")
    if not auth_header:
        return None
    if not auth_header.lower().startswith("bearer "):
        return None
    return auth_header.split(" ", 1)[1].strip()


def _get_demo_session_id(request: Request) -> Optional[str]:
    value = request.headers.get("x-moniq-demo-session")
    return value.strip() if value else None


def _demo_user_from_session(request: Request, conn) -> Optional[dict]:
    session_id = _get_demo_session_id(request)
    if not session_id:
        return None

    with conn.cursor() as cur:
        session = demo_sessions_repo.get_session(cur, session_id)
        if not session:
            raise HTTPException(status_code=401, detail="Invalid or expired demo session")
        demo_sessions_repo.ensure_demo_user(cur, session["demoUserId"])
        conn.commit()

    return {
        "id": session["demoUserId"],
        "email": demo_sessions_repo.DEMO_EMAIL,
        "is_demo": True,
        "demo_session_id": session_id,
    }


def require_user(request: Request, conn) -> dict:
    demo_user = _demo_user_from_session(request, conn)
    if demo_user:
        return demo_user

    if os.getenv("AUTH_BYPASS") == "true":
        return {
            "id": os.getenv("AUTH_BYPASS_USER_ID", "test-user"),
            "email": os.getenv("AUTH_BYPASS_EMAIL", "test@example.com"),
        }

    _init_firebase()
    token = _get_bearer_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Missing auth token")

    try:
        decoded = firebase_auth.verify_id_token(token)
    except Exception as exc:  # noqa: BLE001
        logger.warning("auth_invalid", extra={"error": str(exc)})
        raise HTTPException(status_code=401, detail="Invalid auth token") from exc

    firebase_uid = decoded.get("uid")
    email = decoded.get("email")
    if not firebase_uid or not email:
        raise HTTPException(status_code=401, detail="Invalid auth token")

    email = email.lower()
    with conn.cursor() as cur:
        if not users_repo.is_allowlisted(cur, email):
            raise HTTPException(status_code=403, detail="Beta access required")

        user = users_repo.get_user_by_firebase_uid(cur, firebase_uid)
        if not user:
            user = users_repo.create_user(cur, firebase_uid, email)
            conn.commit()

    return user
