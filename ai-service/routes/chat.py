"""
Generic chat endpoint — LexAI law exam prep tutor.
Streams SSE tokens; consumed by /api/ai/chat Next.js proxy.
"""
import json
import re
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from services.groq_client import get_groq_client, DEFAULT_MODEL, CHAT_PARAMS

router = APIRouter()

# ── limits ────────────────────────────────────────────────────────────────────
MAX_MESSAGES = 20       # keep recent context, drop oldest
MAX_MSG_CHARS = 2000    # per-message cap
MAX_SYSTEM_CHARS = 500  # system prompt cap


# ── input models ─────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str

    @field_validator("role")
    @classmethod
    def valid_role(cls, v: str) -> str:
        if v not in ("user", "assistant"):
            raise ValueError("role must be user or assistant")
        return v

    @field_validator("content")
    @classmethod
    def sanitize(cls, v: str) -> str:
        return _clean(v, MAX_MSG_CHARS)


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    system: str | None = None

    @field_validator("system")
    @classmethod
    def sanitize_system(cls, v: str | None) -> str | None:
        return _clean(v, MAX_SYSTEM_CHARS) if v else None


# ── helpers ───────────────────────────────────────────────────────────────────

def _clean(text: str, max_len: int) -> str:
    """Strip control chars, normalize whitespace, and truncate."""
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    text = re.sub(r"[ \t]+", " ", text).strip()
    return text[:max_len]


def _sse(data: str) -> str:
    return f"data: {data}\n\n"


SYSTEM_PROMPT = (
    "You are LexAI, an expert law exam preparation assistant for CLAT, AILET, "
    "and general legal studies in India. Answer questions accurately, citing "
    "relevant acts and sections when applicable. If you are unsure, say so — "
    "never fabricate case names, section numbers, or legal principles. "
    "Keep answers focused and clear. Do not write more than needed."
)


# ── route ─────────────────────────────────────────────────────────────────────

@router.post("/chat")
async def chat(body: ChatRequest):
    if not body.messages:
        raise HTTPException(status_code=400, detail="messages cannot be empty")

    client = get_groq_client()

    # Use caller-supplied system only if provided; otherwise use built-in
    system = body.system or SYSTEM_PROMPT

    msgs: list[dict] = [{"role": "system", "content": system}]
    # Keep only the most recent MAX_MESSAGES turns
    msgs.extend(m.model_dump() for m in body.messages[-MAX_MESSAGES:])

    async def generate():
        try:
            stream = await client.chat.completions.create(
                model=DEFAULT_MODEL,
                messages=msgs,
                stream=True,
                **CHAT_PARAMS,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    yield _sse(json.dumps({"content": delta}))
        except Exception as exc:
            yield _sse(json.dumps({"error": "AI service error", "detail": str(exc)}))
        finally:
            yield _sse("[DONE]")

    return StreamingResponse(generate(), media_type="text/event-stream")
