"""
LedX AI Service — FastAPI + Groq
Run: uvicorn main:app --reload --port 8000
"""
import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from routes.chat import router as chat_router
from routes.interview import router as interview_router

app = FastAPI(title="LedX AI Service", version="1.0.0")

# Allow Next.js dev server and production origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", os.getenv("NEXT_PUBLIC_APP_URL", "")],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ── Internal key guard ────────────────────────────────────────────────────────
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "")

@app.middleware("http")
async def verify_internal_key(request: Request, call_next):
    # Skip health check
    if request.url.path == "/health":
        return await call_next(request)
    key = request.headers.get("x-internal-key", "")
    if INTERNAL_SECRET and key != INTERNAL_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return await call_next(request)


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(chat_router)
app.include_router(interview_router)


@app.get("/health")
def health():
    return {"status": "ok"}
