"""
Client Interview endpoints — used by the practice-lab CLIENT_INTERVIEW module.

POST /interview/chat   → LLM roleplays as the client, streams reply
POST /interview/report → LLM evaluates the full conversation, returns JSON report
"""
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from services.groq_client import get_groq_client, DEFAULT_MODEL

router = APIRouter(prefix="/interview")


# ── shared types ──────────────────────────────────────────────────────────────

class Message(BaseModel):
    role: str      # "user" | "assistant"
    content: str


class ScenarioContext(BaseModel):
    clientName: str
    caseType: str | None = None
    caseId: str | None = None
    brief: str | None = None
    facts: list[str] = []
    provisions: list[str] = []


class ChatRequest(BaseModel):
    scenario: ScenarioContext
    messages: list[Message]
    model: str = DEFAULT_MODEL


class ReportRequest(BaseModel):
    scenario: ScenarioContext
    messages: list[Message]
    model: str = DEFAULT_MODEL


# ── system prompt builders ────────────────────────────────────────────────────

def _client_system_prompt(s: ScenarioContext) -> str:
    facts_block = "\n".join(f"- {f}" for f in s.facts) if s.facts else "- (No specific facts provided)"
    provisions_note = ", ".join(s.provisions) if s.provisions else "general legal matters"

    return f"""You are {s.clientName}, a person seeking legal advice{f" regarding a {s.caseType} matter" if s.caseType else ""}.
{f"Case reference: {s.caseId}" if s.caseId else ""}

{"Your background and situation:" + chr(10) + s.brief if s.brief else ""}

Facts about your situation (things you know but may not immediately volunteer):
{facts_block}

Relevant legal areas (you are NOT aware of these by name — speak as a layperson):
{provisions_note}

ROLEPLAY RULES:
- Speak in first person as {s.clientName} — naturally, emotionally, and authentically
- Do NOT mention legal acts, sections, or provisions by name; you are not a lawyer
- Do NOT volunteer all information at once — open up gradually as the student asks good questions
- Show appropriate emotions: stress, relief, hesitation, trust-building
- Keep replies conversational and realistic (2–4 sentences typically)
- If asked something irrelevant, politely redirect back to your situation
- Never break character or acknowledge you are an AI"""


def _report_system_prompt(s: ScenarioContext, transcript: str) -> str:
    facts_block = "\n".join(f"- {f}" for f in s.facts) if s.facts else "None specified"
    provisions_block = "\n".join(f"- {p}" for p in s.provisions) if s.provisions else "None specified"

    return f"""You are an expert legal education evaluator assessing a law student's client interview performance.

SCENARIO: {s.clientName}{f" — {s.caseType}" if s.caseType else ""}
{f"Case ID: {s.caseId}" if s.caseId else ""}
{f"Client Brief: {s.brief}" if s.brief else ""}

KEY FACTS the student should have discovered:
{facts_block}

RELEVANT LEGAL AREAS:
{provisions_block}

INTERVIEW TRANSCRIPT:
{transcript}

Generate a structured evaluation report in the following JSON format:
{{
  "overallScore": <integer 0-100>,
  "grade": "<Fail | Pass | Merit | Distinction>",
  "summary": "<2-3 sentence overall assessment>",
  "factsDiscovered": ["<fact 1>", "..."],
  "factsMissed": ["<fact 1>", "..."],
  "strengths": ["<strength 1>", "..."],
  "improvements": ["<area 1>", "..."],
  "communicationScore": <integer 0-100>,
  "legalAwarenessScore": <integer 0-100>,
  "empathyScore": <integer 0-100>,
  "recommendation": "<specific advice for the student>"
}}

Respond with valid JSON only — no markdown, no extra text."""


# ── routes ────────────────────────────────────────────────────────────────────

def _sse(data: str) -> str:
    return f"data: {data}\n\n"


@router.post("/chat")
async def interview_chat(body: ChatRequest):
    """Stream a single LLM reply as the client character."""
    client = get_groq_client()

    system = _client_system_prompt(body.scenario)
    msgs = [{"role": "system", "content": system}]
    msgs.extend(m.model_dump() for m in body.messages)

    def generate():
        stream = client.chat.completions.create(
            model=body.model,
            messages=msgs,
            stream=True,
            max_tokens=512,
            temperature=0.85,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                yield _sse(json.dumps({"content": delta}))
        yield _sse("[DONE]")

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/report")
async def interview_report(body: ReportRequest):
    """Generate a JSON evaluation report for the completed interview."""
    client = get_groq_client()

    # Build readable transcript
    lines = []
    for m in body.messages:
        speaker = body.scenario.clientName if m.role == "assistant" else "Student"
        lines.append(f"{speaker}: {m.content}")
    transcript = "\n".join(lines)

    system = _report_system_prompt(body.scenario, transcript)

    completion = client.chat.completions.create(
        model=body.model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": "Generate the evaluation report now."},
        ],
        stream=False,
        max_tokens=1024,
        temperature=0.3,
    )

    raw = completion.choices[0].message.content or "{}"

    # Parse and return JSON report
    try:
        report = json.loads(raw)
    except json.JSONDecodeError:
        # Attempt to extract JSON from the response if wrapped in markdown
        import re
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        report = json.loads(match.group()) if match else {"raw": raw, "overallScore": 0}

    return JSONResponse(content={"report": report})
