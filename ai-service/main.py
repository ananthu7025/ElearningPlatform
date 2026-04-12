"""
LedX AI Service — FastAPI + Groq (llama-3.3-70b-versatile)
Run: uvicorn main:app --reload --port 8000
"""
import os
import logging
import time
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routes.chat import router as chat_router
from routes.interview import router as interview_router
from routes.drafting import router as drafting_router
from routes.mediation import router as mediation_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger("ledx-ai")

app = FastAPI(title="LedX AI Service", version="2.0.0", docs_url=None, redoc_url=None)

# ── CORS ──────────────────────────────────────────────────────────────────────
_allowed_origins = ["http://localhost:3000"]
_app_url = os.getenv("NEXT_PUBLIC_APP_URL", "").strip()
if _app_url:
    _allowed_origins.append(_app_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ── Request size guard (1 MB) ─────────────────────────────────────────────────
MAX_BODY_BYTES = 1 * 1024 * 1024  # 1 MB

@app.middleware("http")
async def enforce_body_limit(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_BYTES:
        return JSONResponse(status_code=413, content={"detail": "Request body too large"})
    return await call_next(request)

# ── Internal key guard ────────────────────────────────────────────────────────
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "")

@app.middleware("http")
async def verify_internal_key(request: Request, call_next):
    if request.url.path in ("/health",):
        return await call_next(request)
    key = request.headers.get("x-internal-key", "")
    if INTERNAL_SECRET and key != INTERNAL_SECRET:
        logger.warning("Rejected request to %s — bad internal key", request.url.path)
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    return await call_next(request)

# ── Request timing log ────────────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.monotonic()
    response = await call_next(request)
    elapsed = (time.monotonic() - start) * 1000
    logger.info("%s %s → %d (%.0fms)", request.method, request.url.path, response.status_code, elapsed)
    return response

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(chat_router)
app.include_router(interview_router)
app.include_router(drafting_router)
app.include_router(mediation_router)

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}

# ── Startup validation ────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    missing = []
    for key in ("GROQ_API_KEY", "INTERNAL_SECRET"):
        if not os.getenv(key):
            missing.append(key)
    if missing:
        logger.error("Missing required env vars: %s", ", ".join(missing))
    else:
        logger.info("LedX AI Service started — all env vars present")
