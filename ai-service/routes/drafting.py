"""
Drafting endpoints — used by CASE_DRAFTING and CONTRACT_DRAFTING practice modules.

POST /drafting/analyze  → Evaluate a student's draft, return JSON report
POST /drafting/chat     → AI tutor chat about the draft (streaming SSE)
"""
import json
import re
from fastapi import APIRouter
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from services.groq_client import get_groq_client, DEFAULT_MODEL

router = APIRouter(prefix="/drafting")


# ── shared types ──────────────────────────────────────────────────────────────

class Message(BaseModel):
    role: str      # "user" | "assistant"
    content: str


class CaseDraftContext(BaseModel):
    moduleType: str   # "CASE_DRAFTING" | "CONTRACT_DRAFTING"
    title: str
    facts: list[str] = []
    issues: list[str] = []
    applicableLaw: list[str] = []
    instructions: str = ""
    brief: str | None = None
    # contract-specific (optional for case drafting)
    contractType: str | None = None
    partyA: str | None = None
    partyB: str | None = None
    background: str | None = None
    requiredClauses: list[str] = []


class AnalyzeRequest(BaseModel):
    scenario: CaseDraftContext
    draftText: str
    model: str = DEFAULT_MODEL


class ChatRequest(BaseModel):
    scenario: CaseDraftContext
    draftText: str
    messages: list[Message]
    model: str = DEFAULT_MODEL


# ── system prompt builders ────────────────────────────────────────────────────

def _analyze_system_prompt(s: CaseDraftContext, draft: str) -> str:
    if s.moduleType == "CASE_DRAFTING":
        facts_block = "\n".join(f"- {f}" for f in s.facts) if s.facts else "None provided"
        issues_block = "\n".join(f"- {i}" for i in s.issues) if s.issues else "None provided"
        law_block = "\n".join(f"- {l}" for l in s.applicableLaw) if s.applicableLaw else "None provided"

        return f"""You are an expert legal education evaluator assessing a law student's case draft submission.

SCENARIO: {s.title}
{f"Brief: {s.brief}" if s.brief else ""}

CASE FACTS (context given to student):
{facts_block}

LEGAL ISSUES TO ADDRESS:
{issues_block}

APPLICABLE LAW / PROVISIONS:
{law_block}

STUDENT INSTRUCTIONS: {s.instructions}

STUDENT'S DRAFT:
{draft}

Evaluate the student's case draft and return a JSON report in this exact format:
{{
  "overallScore": <integer 0-100>,
  "grade": "<Fail | Pass | Merit | Distinction>",
  "summary": "<2-3 sentence overall assessment>",
  "issuesCovered": ["<issue 1>", "..."],
  "issuesMissed": ["<issue 1>", "..."],
  "structureScore": <integer 0-100>,
  "legalAccuracyScore": <integer 0-100>,
  "languageScore": <integer 0-100>,
  "strengths": ["<strength 1>", "..."],
  "improvements": ["<area 1>", "..."],
  "recommendation": "<specific, actionable advice for the student>"
}}

Respond with valid JSON only — no markdown, no extra text."""

    else:  # CONTRACT_DRAFTING
        clauses_block = "\n".join(f"- {c}" for c in s.requiredClauses) if s.requiredClauses else "None provided"

        return f"""You are an expert legal education evaluator assessing a law student's contract draft submission.

SCENARIO: {s.title}
CONTRACT TYPE: {s.contractType or "General Contract"}
PARTY A: {s.partyA or "Not specified"}
PARTY B: {s.partyB or "Not specified"}
BACKGROUND: {s.background or "Not provided"}

REQUIRED CLAUSES TO INCLUDE:
{clauses_block}

STUDENT INSTRUCTIONS: {s.instructions}

STUDENT'S CONTRACT DRAFT:
{draft}

Evaluate the student's contract draft and return a JSON report in this exact format:
{{
  "overallScore": <integer 0-100>,
  "grade": "<Fail | Pass | Merit | Distinction>",
  "summary": "<2-3 sentence overall assessment>",
  "clausesCovered": ["<clause 1>", "..."],
  "clausesMissed": ["<clause 1>", "..."],
  "structureScore": <integer 0-100>,
  "legalAccuracyScore": <integer 0-100>,
  "languageScore": <integer 0-100>,
  "strengths": ["<strength 1>", "..."],
  "improvements": ["<area 1>", "..."],
  "recommendation": "<specific, actionable advice for the student>"
}}

Respond with valid JSON only — no markdown, no extra text."""


def _chat_system_prompt(s: CaseDraftContext, draft: str) -> str:
    is_case = s.moduleType == "CASE_DRAFTING"

    if is_case:
        context_block = f"""SCENARIO: {s.title}
{f"Brief: {s.brief}" if s.brief else ""}
Facts: {", ".join(s.facts) if s.facts else "none"}
Issues to address: {", ".join(s.issues) if s.issues else "none"}
Applicable law: {", ".join(s.applicableLaw) if s.applicableLaw else "none"}"""
    else:
        context_block = f"""SCENARIO: {s.title}
Contract type: {s.contractType or "General"}
Party A: {s.partyA or "not specified"} | Party B: {s.partyB or "not specified"}
Background: {s.background or "not provided"}
Required clauses: {", ".join(s.requiredClauses) if s.requiredClauses else "none"}"""

    module_label = "case draft" if is_case else "contract draft"

    return f"""You are LexAI, an expert legal tutor helping a law student improve their {module_label}.

{context_block}

STUDENT'S SUBMITTED DRAFT:
{draft}

Your role:
- Help the student understand WHY their draft succeeded or fell short
- Guide them on legal reasoning, structure, and professional drafting standards
- Ask Socratic questions to develop their thinking rather than just giving answers
- Be encouraging but honest — point out genuine gaps
- Keep replies focused and educational (3-5 sentences typically)
- Never write the full draft for them; help them understand HOW to improve it"""


# ── SSE helper ────────────────────────────────────────────────────────────────

def _sse(data: str) -> str:
    return f"data: {data}\n\n"


# ── routes ────────────────────────────────────────────────────────────────────

@router.post("/analyze")
async def analyze_draft(body: AnalyzeRequest):
    """Evaluate a student's draft and return a structured JSON report."""
    client = get_groq_client()
    system = _analyze_system_prompt(body.scenario, body.draftText)

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

    try:
        report = json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        report = json.loads(match.group()) if match else {"raw": raw, "overallScore": 0}

    return JSONResponse(content={"report": report})


@router.post("/chat")
async def drafting_chat(body: ChatRequest):
    """Stream a tutor response about the student's draft."""
    client = get_groq_client()
    system = _chat_system_prompt(body.scenario, body.draftText)

    msgs = [{"role": "system", "content": system}]
    msgs.extend(m.model_dump() for m in body.messages)

    def generate():
        stream = client.chat.completions.create(
            model=body.model,
            messages=msgs,
            stream=True,
            max_tokens=512,
            temperature=0.7,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                yield _sse(json.dumps({"content": delta}))
        yield _sse("[DONE]")

    return StreamingResponse(generate(), media_type="text/event-stream")
