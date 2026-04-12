"""
Client Interview endpoints — practice-lab CLIENT_INTERVIEW module.

POST /interview/chat   → LLM roleplays as the client, streams SSE reply
POST /interview/report → Evaluates the full conversation, returns validated JSON
"""
import json
import re
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field, field_validator, ValidationError
from services.groq_client import get_groq_client, DEFAULT_MODEL, ROLEPLAY_PARAMS, REPORT_PARAMS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/interview")

# ── limits ────────────────────────────────────────────────────────────────────
MAX_MESSAGES = 36       # 18 turns × 2 roles
MAX_FACTS = 15
MAX_PROVISIONS = 10
MAX_BRIEF_CHARS = 600
MAX_MSG_CHARS = 1500


# ── shared input models ───────────────────────────────────────────────────────

class Message(BaseModel):
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


class ScenarioContext(BaseModel):
    clientName: str
    caseType: str | None = None
    caseId: str | None = None
    brief: str | None = None
    facts: list[str] = []
    provisions: list[str] = []

    @field_validator("clientName")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        return _clean(v, 80)

    @field_validator("brief")
    @classmethod
    def sanitize_brief(cls, v: str | None) -> str | None:
        return _clean(v, MAX_BRIEF_CHARS) if v else None

    @field_validator("facts")
    @classmethod
    def trim_facts(cls, v: list[str]) -> list[str]:
        return [_clean(f, 200) for f in v[:MAX_FACTS]]

    @field_validator("provisions")
    @classmethod
    def trim_provisions(cls, v: list[str]) -> list[str]:
        return [_clean(p, 150) for p in v[:MAX_PROVISIONS]]


class ChatRequest(BaseModel):
    scenario: ScenarioContext
    messages: list[Message]


class ReportRequest(BaseModel):
    scenario: ScenarioContext
    messages: list[Message]


# ── validated output model ────────────────────────────────────────────────────

_GRADES = {"Fail", "Pass", "Merit", "Distinction"}


class InterviewReport(BaseModel):
    overallScore: int = Field(ge=0, le=100)
    grade: str
    summary: str
    factsDiscovered: list[str] = []
    factsMissed: list[str] = []
    strengths: list[str] = []
    improvements: list[str] = []
    communicationScore: int = Field(ge=0, le=100)
    legalAwarenessScore: int = Field(ge=0, le=100)
    empathyScore: int = Field(ge=0, le=100)
    recommendation: str

    @field_validator("overallScore", "communicationScore", "legalAwarenessScore", "empathyScore", mode="before")
    @classmethod
    def clamp_score(cls, v) -> int:
        return max(0, min(100, int(v)))

    @field_validator("grade", mode="before")
    @classmethod
    def normalise_grade(cls, v: str) -> str:
        v = str(v).strip().capitalize()
        if v not in _GRADES:
            return "Fail"
        return v

    @field_validator("summary", "recommendation", mode="before")
    @classmethod
    def ensure_str(cls, v) -> str:
        return str(v).strip() or "No assessment provided."

    @field_validator("factsDiscovered", "factsMissed", "strengths", "improvements", mode="before")
    @classmethod
    def ensure_list(cls, v) -> list[str]:
        if not isinstance(v, list):
            return []
        return [str(i).strip() for i in v if i]


def _fallback_report() -> dict:
    return InterviewReport(
        overallScore=0, grade="Fail",
        summary="Evaluation could not be completed. Please try again.",
        communicationScore=0, legalAwarenessScore=0, empathyScore=0,
        recommendation="Please retry the interview and submit again.",
    ).model_dump()


# ── helpers ───────────────────────────────────────────────────────────────────

def _clean(text: str, max_len: int) -> str:
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    text = re.sub(r"[ \t]+", " ", text).strip()
    return text[:max_len]


def _sse(data: str) -> str:
    return f"data: {data}\n\n"


def _facts_block(facts: list[str]) -> str:
    return "\n".join(f"- {f}" for f in facts) if facts else "- (none specified)"


# ── system prompt builders ────────────────────────────────────────────────────

def _client_system_prompt(s: ScenarioContext) -> str:
    provisions_note = ", ".join(s.provisions) if s.provisions else "general legal matters"

    return f"""You are {s.clientName}, a real person seeking legal advice{f" about a {s.caseType} matter" if s.caseType else ""}.{f" Case reference: {s.caseId}." if s.caseId else ""}

YOUR SITUATION:
{s.brief or "You are dealing with a legal problem and need advice."}

FACTS YOU KNOW (reveal gradually — only when asked the right questions):
{_facts_block(s.facts)}

LEGAL AREAS INVOLVED (you do NOT know these terms — speak as a layperson):
{provisions_note}

STRICT RULES:
1. Stay in character as {s.clientName} at all times — never break character.
2. Do NOT mention legal sections, acts, or case citations — you are not a lawyer.
3. Reveal facts gradually; do not dump everything in the first message.
4. Show realistic emotions: stress, hesitation, relief, gradual trust.
5. Keep replies to 2–4 sentences. Be natural and conversational.
6. If asked something unrelated to your situation, redirect politely.
7. Never acknowledge you are an AI or a simulation."""


def _report_system_prompt(s: ScenarioContext, transcript: str) -> str:
    return f"""You are an expert legal education evaluator. Assess a law student's client interview.

SCENARIO: {s.clientName}{f" — {s.caseType}" if s.caseType else ""}
{f"Brief: {s.brief}" if s.brief else ""}

FACTS the student should discover:
{_facts_block(s.facts)}

RELEVANT LEGAL AREAS:
{", ".join(s.provisions) if s.provisions else "general legal matters"}

TRANSCRIPT:
{transcript}

Return a JSON evaluation report using EXACTLY this schema — no extra keys:
{{
  "overallScore": <0-100>,
  "grade": "Fail|Pass|Merit|Distinction",
  "summary": "<2-3 sentence assessment>",
  "factsDiscovered": ["<fact>"],
  "factsMissed": ["<fact>"],
  "strengths": ["<strength>"],
  "improvements": ["<improvement>"],
  "communicationScore": <0-100>,
  "legalAwarenessScore": <0-100>,
  "empathyScore": <0-100>,
  "recommendation": "<specific actionable advice>"
}}

Grading: 0-49=Fail, 50-64=Pass, 65-79=Merit, 80-100=Distinction.
Output valid JSON only."""


# ── routes ────────────────────────────────────────────────────────────────────

@router.post("/chat")
async def interview_chat(body: ChatRequest):
    """Stream a single character reply as the simulated client."""
    if not body.messages:
        raise HTTPException(status_code=400, detail="messages cannot be empty")

    client = get_groq_client()
    system = _client_system_prompt(body.scenario)

    msgs: list[dict] = [{"role": "system", "content": system}]
    msgs.extend(m.model_dump() for m in body.messages[-MAX_MESSAGES:])

    async def generate():
        try:
            stream = await client.chat.completions.create(
                model=DEFAULT_MODEL,
                messages=msgs,
                stream=True,
                **ROLEPLAY_PARAMS,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    yield _sse(json.dumps({"content": delta}))
        except Exception as exc:
            logger.error("interview_chat stream error: %s", exc)
            yield _sse(json.dumps({"error": "Stream error"}))
        finally:
            yield _sse("[DONE]")

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/report")
async def interview_report(body: ReportRequest):
    """Generate a validated JSON evaluation report for the completed interview."""
    if not body.messages:
        raise HTTPException(status_code=400, detail="messages cannot be empty")

    client = get_groq_client()

    # Build compact transcript (cap each line to 300 chars)
    lines = []
    for m in body.messages[-MAX_MESSAGES:]:
        speaker = body.scenario.clientName if m.role == "assistant" else "Student"
        lines.append(f"{speaker}: {m.content[:300]}")
    transcript = "\n".join(lines)

    system = _report_system_prompt(body.scenario, transcript)

    for attempt in range(2):
        try:
            completion = await client.chat.completions.create(
                model=DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": "Generate the evaluation report."},
                ],
                stream=False,
                response_format={"type": "json_object"},
                **REPORT_PARAMS,
            )
            raw = completion.choices[0].message.content or "{}"
            data = json.loads(raw)
            report = InterviewReport(**data).model_dump()
            return JSONResponse(content={"report": report})
        except (json.JSONDecodeError, ValidationError, Exception) as exc:
            logger.warning("interview_report attempt %d failed: %s", attempt + 1, exc)
            if attempt == 1:
                return JSONResponse(content={"report": _fallback_report()})

    return JSONResponse(content={"report": _fallback_report()})
