"""
Generic chat endpoint — forwards messages to Groq and streams back SSE.
Used by the existing /api/ai/chat Next.js proxy.
"""
import json
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.groq_client import get_groq_client, DEFAULT_MODEL

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    model: str = DEFAULT_MODEL
    system: str | None = None


def _sse(data: str) -> str:
    return f"data: {data}\n\n"


@router.post("/chat")
async def chat(body: ChatRequest):
    client = get_groq_client()

    msgs = []
    if body.system:
        msgs.append({"role": "system", "content": body.system})
    msgs.extend(m.model_dump() for m in body.messages)

    def generate():
        stream = client.chat.completions.create(
            model=body.model,
            messages=msgs,
            stream=True,
            max_tokens=1024,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                yield _sse(json.dumps({"content": delta}))
        yield _sse("[DONE]")

    return StreamingResponse(generate(), media_type="text/event-stream")
