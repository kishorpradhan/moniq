import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.routes.uploads import router as uploads_router
from app.security import require_api_key

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

allowed_hosts = os.getenv("ALLOWED_HOSTS")
if allowed_hosts:
    app.add_middleware(
        TrustedHostMiddleware, allowed_hosts=[h.strip() for h in allowed_hosts.split(",")]
    )

app.middleware("http")(require_api_key)


@app.get("/health")
def health():
    return {"ok": True}


app.include_router(uploads_router, prefix="/uploads")
