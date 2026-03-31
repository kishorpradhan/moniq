import logging

from fastapi import FastAPI, Request

from app.auth import require_user
from app.db import get_db_conn
from app.queries import fetch_allocation, fetch_positions, fetch_recent_uploads, fetch_summary

app = FastAPI()
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


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


@app.get("/portfolio/summary")
def summary(request: Request):
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            user = require_user(request, conn)
            return fetch_summary(cur, user["id"])
    finally:
        conn.close()


@app.get("/portfolio/allocation")
def allocation(request: Request):
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            user = require_user(request, conn)
            return fetch_allocation(cur, user["id"])
    finally:
        conn.close()


@app.get("/portfolio/positions")
def positions(request: Request):
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            user = require_user(request, conn)
            return fetch_positions(cur, user["id"])
    finally:
        conn.close()


@app.get("/uploads/recent")
def uploads_recent(request: Request, limit: int = 10):
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            user = require_user(request, conn)
            return {"uploads": fetch_recent_uploads(cur, user["id"], limit=limit)}
    finally:
        conn.close()
