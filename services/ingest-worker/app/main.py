import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.db import get_db_conn
from app.ingestion.handler import handle_pubsub


app = FastAPI()
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/pubsub")
async def pubsub(request: Request):
    conn = get_db_conn()
    try:
        return await handle_pubsub(request, conn)
    finally:
        conn.close()
