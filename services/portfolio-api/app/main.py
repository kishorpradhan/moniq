import logging

from fastapi import FastAPI

from app.db import get_db_conn
from app.queries import fetch_allocation, fetch_positions, fetch_summary, fetch_recent_uploads

app = FastAPI()
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/portfolio/summary")
def summary():
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            return fetch_summary(cur)
    finally:
        conn.close()


@app.get("/portfolio/allocation")
def allocation():
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            return fetch_allocation(cur)
    finally:
        conn.close()


@app.get("/portfolio/positions")
def positions():
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            return fetch_positions(cur)
    finally:
        conn.close()


@app.get("/uploads/recent")
def uploads_recent(limit: int = 10):
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            return {"uploads": fetch_recent_uploads(cur, limit=limit)}
    finally:
        conn.close()
