"""
Drafting endpoints — CASE_DRAFTING and CONTRACT_DRAFTING practice modules.

POST /drafting/analyze  → Evaluate a student's draft, return validated JSON report
POST /drafting/chat     → AI tutor chat about the draft (streaming SSE)
"""
import json
import re
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field, field_validator, ValidationError
from services.groq_client import get_groq_client, DEFAULT_MODEL, CHAT_PARAMS, REPORT_PARAMS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/drafting")

# ── limits ────────────────────────────────────────────────────────────────────
MAX_DRAFT_CHARS = 4000
MAX_MESSAGES = 20       # last 10 turns × 2 roles
MAX_FACTS = 12
MAX_CLAUSES = 15
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


class CaseDraftContext(BaseModel):
    moduleType: str
    title: str
    facts: list[str] = []
    issues: list[str] = []
    applicableLaw: list[str] = []
    instructions: str = ""
    brief: str | None = None
    contractType: str | None = None
    partyA: str | None = None
    partyB: str | None = None
    background: str | None = None
    requiredClauses: list[str] = []

    @field_validator("moduleType")
    @classmethod
    def valid_module(cls, v: str) -> str:
        if v not in ("CASE_DRAFTING", "CONTRACT_DRAFTING"):
            raise ValueError("moduleType must be CASE_DRAFTING or CONTRACT_DRAFTING")
        return v

    @field_validator("facts", "issues", "applicableLaw")
    @classmethod
    def trim_lists(cls, v: list[str]) -> list[str]:
        return [_clean(i, 200) for i in v[:MAX_FACTS]]

    @field_validator("requiredClauses")
    @classmethod
    def trim_clauses(cls, v: list[str]) -> list[str]:
        return [_clean(c, 200) for c in v[:MAX_CLAUSES]]


class AnalyzeRequest(BaseModel):
    scenario: CaseDraftContext
    draftText: str

    @field_validator("draftText")
    @classmethod
    def sanitize_draft(cls, v: str) -> str:
        return _clean(v, MAX_DRAFT_CHARS)


class ChatRequest(BaseModel):
    scenario: CaseDraftContext
    draftText: str
    messages: list[Message]

    @field_validator("draftText")
    @classmethod
    def sanitize_draft(cls, v: str) -> str:
        return _clean(v, MAX_DRAFT_CHARS)


# ── validated output models ───────────────────────────────────────────────────

_GRADES = {"Fail", "Pass", "Merit", "Distinction"}


class DraftingReport(BaseModel):
    overallScore: int = Field(ge=0, le=100)
    grade: str
    summary: str
    # case drafting fields (optional for contract)
    issuesCovered: list[str] = []
    issuesMissed: list[str] = []
    # contract drafting fields (optional for case)
    clausesCovered: list[str] = []
    clausesMissed: list[str] = []
    structureScore: int = Field(ge=0, le=100)
    legalAccuracyScore: int = Field(ge=0, le=100)
    languageScore: int = Field(ge=0, le=100)
    strengths: list[str] = []
    improvements: list[str] = []
    recommendation: str

    @field_validator("overallScore", "structureScore", "legalAccuracyScore", "languageScore", mode="before")
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

    @field_validator(
        "issuesCovered", "issuesMissed", "clausesCovered", "clausesMissed",
        "strengths", "improvements", mode="before",
    )
    @classmethod
    def ensure_list(cls, v) -> list[str]:
        if not isinstance(v, list):
            return []
        return [str(i).strip() for i in v if i]


def _fallback_report() -> dict:
    return DraftingReport(
        overallScore=0, grade="Fail",
        summary="Evaluation could not be completed. Please try again.",
        structureScore=0, legalAccuracyScore=0, languageScore=0,
        recommendation="Please resubmit your draft.",
    ).model_dump()


# ── helpers ───────────────────────────────────────────────────────────────────

def _clean(text: str, max_len: int) -> str:
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    text = re.sub(r"[ \t]+", " ", text).strip()
    return text[:max_len]


def _sse(data: str) -> str:
    return f"data: {data}\n\n"


def _list_block(items: list[str], fallback: str = "None provided") -> str:
    return "\n".join(f"- {i}" for i in items) if items else fallback


# ── system prompt builders ────────────────────────────────────────────────────

def _analyze_system_prompt(s: CaseDraftContext, draft: str) -> str:
    if s.moduleType == "CASE_DRAFTING":
        schema = (
            '{"overallScore":<0-100>,"grade":"Fail|Pass|Merit|Distinction",'
            '"summary":"<2-3 sentences>","issuesCovered":["<issue>"],'
            '"issuesMissed":["<issue>"],"structureScore":<0-100>,'
            '"legalAccuracyScore":<0-100>,"languageScore":<0-100>,'
            '"strengths":["<strength>"],"improvements":["<area>"],'
            '"recommendation":"<actionable advice>"}'
        )
        context = f"""SCENARIO: {s.title}
{f"Brief: {s.brief}" if s.brief else ""}

CASE FACTS:
{_list_block(s.facts)}

LEGAL ISSUES TO ADDRESS:
{_list_block(s.issues)}

APPLICABLE LAW:
{_list_block(s.applicableLaw)}

INSTRUCTIONS: {s.instructions or "Standard case draft."}"""

    else:  # CONTRACT_DRAFTING
        schema = (
            '{"overallScore":<0-100>,"grade":"Fail|Pass|Merit|Distinction",'
            '"summary":"<2-3 sentences>","clausesCovered":["<clause>"],'
            '"clausesMissed":["<clause>"],"structureScore":<0-100>,'
            '"legalAccuracyScore":<0-100>,"languageScore":<0-100>,'
            '"strengths":["<strength>"],"improvements":["<area>"],'
            '"recommendation":"<actionable advice>"}'
        )
        context = f"""SCENARIO: {s.title}
CONTRACT TYPE: {s.contractType or "General"}
PARTY A: {s.partyA or "Not specified"} | PARTY B: {s.partyB or "Not specified"}
BACKGROUND: {s.background or "Not provided"}

REQUIRED CLAUSES:
{_list_block(s.requiredClauses)}

INSTRUCTIONS: {s.instructions or "Standard contract draft."}"""

    return f"""You are an expert legal education evaluator assessing a law student's draft.

{context}

STUDENT DRAFT:
{draft}

Evaluate accurately and fairly. Grading: 0-49=Fail, 50-64=Pass, 65-79=Merit, 80-100=Distinction.
If unsure about a fact, mark it as missed rather than inventing coverage.

Return ONLY valid JSON matching this exact schema:
{schema}"""


def _chat_system_prompt(s: CaseDraftContext, draft: str) -> str:
    is_case = s.moduleType == "CASE_DRAFTING"
    module_label = "case draft" if is_case else "contract draft"

    if is_case:
        context = (
            f"Scenario: {s.title}\n"
            f"Facts: {', '.join(s.facts[:6]) if s.facts else 'none'}\n"
            f"Issues: {', '.join(s.issues[:6]) if s.issues else 'none'}\n"
            f"Law: {', '.join(s.applicableLaw[:5]) if s.applicableLaw else 'none'}"
        )
    else:
        context = (
            f"Scenario: {s.title} ({s.contractType or 'General'})\n"
            f"Parties: {s.partyA or 'A'} & {s.partyB or 'B'}\n"
            f"Required clauses: {', '.join(s.requiredClauses[:8]) if s.requiredClauses else 'none'}"
        )

    return f"""You are LexAI, an expert legal tutor helping a student improve their {module_label}.

{context}

STUDENT DRAFT (first 1500 chars):
{draft[:1500]}

Your role:
- Guide with Socratic questions — do not rewrite the draft for them.
- Point out specific gaps with reference to the scenario facts/issues.
- Keep replies focused: 3–5 sentences maximum.
- Be honest and constructive — avoid empty praise.
- If asked something unrelated to the draft, redirect politely."""


# ── routes ────────────────────────────────────────────────────────────────────

@router.post("/analyze")
async def analyze_draft(body: AnalyzeRequest):
    """Evaluate a student's draft and return a validated JSON report."""
    if not body.draftText.strip():
        raise HTTPException(status_code=400, detail="draftText cannot be empty")

    client = get_groq_client()
    system = _analyze_system_prompt(body.scenario, body.draftText)

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
            report = DraftingReport(**data).model_dump()
            return JSONResponse(content={"report": report})
        except (json.JSONDecodeError, ValidationError, Exception) as exc:
            logger.warning("analyze_draft attempt %d failed: %s", attempt + 1, exc)
            if attempt == 1:
                return JSONResponse(content={"report": _fallback_report()})

    return JSONResponse(content={"report": _fallback_report()})


@router.post("/chat")
async def drafting_chat(body: ChatRequest):
    """Stream a tutor response about the student's draft."""
    if not body.messages:
        raise HTTPException(status_code=400, detail="messages cannot be empty")

    client = get_groq_client()
    system = _chat_system_prompt(body.scenario, body.draftText)

    msgs: list[dict] = [{"role": "system", "content": system}]
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
            logger.error("drafting_chat stream error: %s", exc)
            yield _sse(json.dumps({"error": "Stream error"}))
        finally:
            yield _sse("[DONE]")

    return StreamingResponse(generate(), media_type="text/event-stream")
