import logging

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

from app.auth import require_user
from app.db import get_db_conn
from app.queries import fetch_allocation, fetch_positions, fetch_recent_uploads, fetch_summary
from app.repositories import demo_sessions as demo_sessions_repo
from app.repositories import profiles as profiles_repo

app = FastAPI()
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


class DemoSessionRequest(BaseModel):
    llmCallLimit: int | None = None


class ConsumeDemoCallRequest(BaseModel):
    demoSessionId: str


class CreateProfileRequest(BaseModel):
    displayName: str
    profileType: str = "portfolio"
    isDefault: bool = False


class UpdateProfileRequest(BaseModel):
    displayName: str | None = None
    profileType: str | None = None
    isDefault: bool | None = None


def _require_mutable_user(user: dict):
    if user.get("is_demo"):
        raise HTTPException(status_code=403, detail="Demo profiles are read-only")



def _requested_profile_id(request: Request, profile_id: str | None = None) -> str | None:
    return profile_id or request.headers.get("x-moniq-profile-id")


def _resolve_profile_id(cur, user_id: str, request: Request, profile_id: str | None = None) -> str:
    requested = _requested_profile_id(request, profile_id)
    try:
        return profiles_repo.resolve_profile_id(cur, user_id, requested)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/demo/session", status_code=201)
def create_demo_session(payload: DemoSessionRequest | None = None):
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            limit = payload.llmCallLimit if payload and payload.llmCallLimit else demo_sessions_repo.DEFAULT_LLM_LIMIT
            session = demo_sessions_repo.create_session(cur, limit)
            conn.commit()
            return {"session": session}
    finally:
        conn.close()


@app.post("/demo/session/consume")
def consume_demo_session_call(payload: ConsumeDemoCallRequest):
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            session = demo_sessions_repo.consume_llm_call(cur, payload.demoSessionId)
            if not session:
                raise HTTPException(status_code=429, detail="Demo chat limit reached")
            conn.commit()
            return {"session": session}
    finally:
        conn.close()


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/auth/me")
def auth_me(request: Request):
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            user = require_user(request, conn)
            return {"userId": user["id"], "email": user["email"]}
    finally:
        conn.close()


@app.get("/profiles")
def profiles(request: Request):
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            user = require_user(request, conn)
            return {"profiles": profiles_repo.list_profiles(cur, user["id"])}
    finally:
        conn.close()


@app.post("/profiles", status_code=201)
def create_profile(payload: CreateProfileRequest, request: Request):
    display_name = payload.displayName.strip()
    if not display_name:
        raise HTTPException(status_code=400, detail="displayName is required")

    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            user = require_user(request, conn)
            _require_mutable_user(user)
            try:
                profile = profiles_repo.create_profile(
                    cur,
                    user["id"],
                    display_name,
                    payload.profileType,
                    payload.isDefault,
                )
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc
            conn.commit()
            return {"profile": profile}
    finally:
        conn.close()


@app.patch("/profiles/{profile_id}")
def update_profile(profile_id: str, payload: UpdateProfileRequest, request: Request):
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No profile fields provided")

    display_name = updates.get("displayName")
    if display_name is not None:
        display_name = display_name.strip()
        if not display_name:
            raise HTTPException(status_code=400, detail="displayName cannot be empty")

    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            user = require_user(request, conn)
            _require_mutable_user(user)
            try:
                profile = profiles_repo.update_profile(
                    cur,
                    user["id"],
                    profile_id,
                    display_name=display_name,
                    profile_type=updates.get("profileType"),
                    is_default=updates.get("isDefault"),
                )
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc
            if not profile:
                raise HTTPException(status_code=404, detail="Profile not found")
            conn.commit()
            return {"profile": profile}
    finally:
        conn.close()


@app.delete("/profiles/{profile_id}")
def delete_profile(profile_id: str, request: Request):
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            user = require_user(request, conn)
            _require_mutable_user(user)
            try:
                deleted = profiles_repo.delete_profile(cur, user["id"], profile_id)
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc
            if not deleted:
                raise HTTPException(status_code=404, detail="Profile not found")
            conn.commit()
            return {"success": True}
    finally:
        conn.close()


@app.get("/portfolio/summary")
def summary(request: Request, profile_id: str | None = None):
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            user = require_user(request, conn)
            resolved_profile_id = _resolve_profile_id(cur, user["id"], request, profile_id)
            return fetch_summary(cur, user["id"], resolved_profile_id)
    finally:
        conn.close()


@app.get("/portfolio/allocation")
def allocation(request: Request, profile_id: str | None = None):
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            user = require_user(request, conn)
            resolved_profile_id = _resolve_profile_id(cur, user["id"], request, profile_id)
            return fetch_allocation(cur, user["id"], resolved_profile_id)
    finally:
        conn.close()


@app.get("/portfolio/positions")
def positions(request: Request, profile_id: str | None = None):
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            user = require_user(request, conn)
            resolved_profile_id = _resolve_profile_id(cur, user["id"], request, profile_id)
            return fetch_positions(cur, user["id"], resolved_profile_id)
    finally:
        conn.close()


@app.get("/uploads/recent")
def uploads_recent(request: Request, limit: int = 10, profile_id: str | None = None):
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            user = require_user(request, conn)
            resolved_profile_id = _resolve_profile_id(cur, user["id"], request, profile_id)
            return {
                "uploads": fetch_recent_uploads(
                    cur, user["id"], limit=limit, profile_id=resolved_profile_id
                )
            }
    finally:
        conn.close()
