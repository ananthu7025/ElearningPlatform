"""
Arbitration & Mediation endpoints — practice-lab ARBITRATION_MEDIATION module.

POST /mediation/chat   → LLM plays the addressed party/parties, streams SSE reply
POST /mediation/report → Evaluates the full session, returns validated JSON
"""
import json
import re
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field, field_validator, ValidationError
from services.groq_client import get_groq_client, DEFAULT_MODEL, ROLEPLAY_PARAMS, REPORT_PARAMS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mediation")

# ── limits ────────────────────────────────────────────────────────────────────
MAX_MESSAGES   = 40      # 20 turns × 2 roles
MAX_FACTS      = 12
MAX_TEXT_CHARS = 1500
MAX_BG_CHARS   = 800
MAX_NAME_CHARS = 80


# ── helpers ───────────────────────────────────────────────────────────────────

def _clean(text: str, max_len: int) -> str:
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    text = re.sub(r"[ \t]+", " ", text).strip()
    return text[:max_len]


def _sse(data: str) -> str:
    return f"data: {data}\n\n"


def _facts_block(facts: list[str]) -> str:
    return "\n".join(f"- {f}" for f in facts) if facts else "- (no specific facts)"


# ── input models ──────────────────────────────────────────────────────────────

class Message(BaseModel):
    role: str
    content: str
    addressedTo: str | None = None

    @field_validator("role")
    @classmethod
    def valid_role(cls, v: str) -> str:
        if v not in ("user", "assistant"):
            raise ValueError("role must be user or assistant")
        return v

    @field_validator("content")
    @classmethod
    def sanitize(cls, v: str) -> str:
        return _clean(v, MAX_TEXT_CHARS)


class PartyContext(BaseModel):
    name: str
    role: str = ""
    position: str = ""
    interests: str = ""
    facts: list[str] = []

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        return _clean(v, MAX_NAME_CHARS)

    @field_validator("position", "interests")
    @classmethod
    def sanitize_text(cls, v: str) -> str:
        return _clean(v, 400)

    @field_validator("facts")
    @classmethod
    def trim_facts(cls, v: list[str]) -> list[str]:
        return [_clean(f, 200) for f in v[:MAX_FACTS]]


class ScenarioContext(BaseModel):
    mode: str = "mediation"          # "mediation" | "arbitration"
    disputeType: str | None = None
    background: str | None = None
    partyA: PartyContext
    partyB: PartyContext
    applicableLaw: list[str] = []
    instructions: str | None = None

    @field_validator("mode")
    @classmethod
    def valid_mode(cls, v: str) -> str:
        return v if v in ("mediation", "arbitration") else "mediation"

    @field_validator("background")
    @classmethod
    def sanitize_bg(cls, v: str | None) -> str | None:
        return _clean(v, MAX_BG_CHARS) if v else None


class ChatRequest(BaseModel):
    scenario: ScenarioContext
    messages: list[Message]
    addressedTo: str = "both"   # "partyA" | "partyB" | "both"

    @field_validator("addressedTo")
    @classmethod
    def valid_addressed_to(cls, v: str) -> str:
        return v if v in ("partyA", "partyB", "both") else "both"


class ReportRequest(BaseModel):
    scenario: ScenarioContext
    messages: list[Message]
    addressedTo: str = "both"


# ── validated output model ────────────────────────────────────────────────────

_GRADES = {"Fail", "Pass", "Merit", "Distinction"}


class MediationReport(BaseModel):
    overallScore:             int = Field(ge=0, le=100)
    grade:                    str
    summary:                  str
    neutralityScore:          int = Field(ge=0, le=100)
    issueIdentificationScore: int = Field(ge=0, le=100)
    activeListeningScore:     int = Field(ge=0, le=100)
    processManagementScore:   int = Field(ge=0, le=100)
    resolutionQualityScore:   int = Field(ge=0, le=100)
    strengths:                list[str] = []
    improvements:             list[str] = []
    recommendation:           str

    @field_validator(
        "overallScore", "neutralityScore", "issueIdentificationScore",
        "activeListeningScore", "processManagementScore", "resolutionQualityScore",
        mode="before",
    )
    @classmethod
    def clamp_score(cls, v) -> int:
        return max(0, min(100, int(v)))

    @field_validator("grade", mode="before")
    @classmethod
    def normalise_grade(cls, v: str) -> str:
        v = str(v).strip().capitalize()
        return v if v in _GRADES else "Fail"

    @field_validator("summary", "recommendation", mode="before")
    @classmethod
    def ensure_str(cls, v) -> str:
        return str(v).strip() or "No assessment provided."

    @field_validator("strengths", "improvements", mode="before")
    @classmethod
    def ensure_list(cls, v) -> list[str]:
        if not isinstance(v, list):
            return []
        return [str(i).strip() for i in v if i]


def _fallback_report() -> dict:
    return MediationReport(
        overallScore=0, grade="Fail",
        summary="Evaluation could not be completed. Please try again.",
        neutralityScore=0, issueIdentificationScore=0,
        activeListeningScore=0, processManagementScore=0,
        resolutionQualityScore=0,
        strengths=[], improvements=[],
        recommendation="Please retry the session and submit again.",
    ).model_dump()


# ── system prompt builders ────────────────────────────────────────────────────

def _party_summary(party: PartyContext) -> str:
    lines = [
        f"Name: {party.name}",
        f"Role: {party.role}" if party.role else "",
        f"Position: {party.position}" if party.position else "",
        f"Underlying interests: {party.interests}" if party.interests else "",
    ]
    if party.facts:
        lines.append("Facts:\n" + _facts_block(party.facts))
    return "\n".join(l for l in lines if l)


def _build_chat_system(s: ScenarioContext, addressed_to: str) -> str:
    """
    Build the system prompt for the chat turn.
    The LLM plays Party A, Party B, or both — depending on who the student addressed.
    """
    mode_desc = (
        "The student is acting as the ARBITRATOR — a neutral third party who will hear submissions "
        "from both sides and ultimately issue a binding award."
        if s.mode == "arbitration"
        else
        "The student is acting as the MEDIATOR — a neutral facilitator helping both parties "
        "find a mutually agreeable settlement."
    )

    background = s.background or "A legal dispute between two parties."
    laws = ", ".join(s.applicableLaw) if s.applicableLaw else "applicable law"
    dispute = s.disputeType or "Legal"

    if addressed_to == "partyA":
        party = s.partyA
        other = s.partyB
        intro = f"You are {party.name} ({party.role or 'Party A'}) in a {dispute} dispute."
        rules = f"""STRICT RULES:
1. Stay in character as {party.name} at all times.
2. Respond naturally and conversationally — you are not a lawyer; speak as a party to the dispute.
3. Reveal your facts gradually — only when the student asks the right questions.
4. Show realistic emotions: frustration, anxiety, defensiveness, occasional relief.
5. Keep replies to 2–4 sentences unless asked for more detail.
6. Do NOT acknowledge you are an AI or a simulation.
7. You are aware the opposing party is {other.name} ({other.role or 'Party B'})."""
    elif addressed_to == "partyB":
        party = s.partyB
        other = s.partyA
        intro = f"You are {party.name} ({party.role or 'Party B'}) in a {dispute} dispute."
        rules = f"""STRICT RULES:
1. Stay in character as {party.name} at all times.
2. Respond naturally and conversationally — you are not a lawyer; speak as a party to the dispute.
3. Reveal your facts gradually — only when the student asks the right questions.
4. Show realistic emotions: defensiveness, frustration, cautious openness.
5. Keep replies to 2–4 sentences unless asked for more detail.
6. Do NOT acknowledge you are an AI or a simulation.
7. You are aware the opposing party is {other.name} ({other.role or 'Party A'})."""
    else:
        # "both" — joint session or opening; LLM responds as both parties in turn
        intro = (
            f"You play BOTH parties in a {dispute} dispute:\n\n"
            f"PARTY A — {s.partyA.name} ({s.partyA.role or 'Claimant'}):\n{_party_summary(s.partyA)}\n\n"
            f"PARTY B — {s.partyB.name} ({s.partyB.role or 'Respondent'}):\n{_party_summary(s.partyB)}"
        )
        rules = f"""STRICT RULES:
1. Respond as BOTH parties, labelling each reply clearly:
   "{s.partyA.name}: <their response>"
   "{s.partyB.name}: <their response>"
2. Each party should be 1–3 sentences. Keep them distinct in tone and position.
3. Party A is typically more assertive/aggrieved; Party B is typically more defensive.
4. Reveal facts gradually — only when the student asks or creates space for them.
5. Do NOT break character or acknowledge you are an AI."""

    if addressed_to in ("partyA", "partyB"):
        party_detail = _party_summary(party)
    else:
        party_detail = ""  # already embedded in intro for "both"

    return f"""{intro}

DISPUTE BACKGROUND:
{background}

{f"YOUR DETAILS:{chr(10)}{party_detail}" if party_detail else ""}

APPLICABLE LAW: {laws}

CONTEXT — {mode_desc}

{rules}"""


def _build_report_system(s: ScenarioContext, transcript: str) -> str:
    mode_label = "Arbitrator" if s.mode == "arbitration" else "Mediator"
    resolution_label = "Award Quality" if s.mode == "arbitration" else "Settlement Quality"

    return f"""You are an expert ADR (Alternative Dispute Resolution) educator evaluating a law student's performance as a {mode_label}.

DISPUTE: {s.disputeType or "Legal"} | Mode: {s.mode.capitalize()}
Background: {s.background or "A dispute between two parties."}

PARTY A — {s.partyA.name} ({s.partyA.role}):
Position: {s.partyA.position}
Interests: {s.partyA.interests}
Key facts: {_facts_block(s.partyA.facts)}

PARTY B — {s.partyB.name} ({s.partyB.role}):
Position: {s.partyB.position}
Interests: {s.partyB.interests}
Key facts: {_facts_block(s.partyB.facts)}

Applicable law: {', '.join(s.applicableLaw) if s.applicableLaw else 'general law'}

FULL TRANSCRIPT:
{transcript}

Evaluate the student's performance strictly as a {mode_label}. Use these five criteria:
1. Neutrality (0–100): Did the student remain impartial and avoid favouring either party?
2. Issue Identification (0–100): Did the student correctly surface the real issues beyond stated positions?
3. Active Listening (0–100): Did the student reframe, acknowledge, summarise, and draw out interests?
4. Process Management (0–100): Did the student structure the session, manage tension, and keep both parties engaged?
5. {resolution_label} (0–100): {"Was the award reasoned, balanced, and legally grounded?" if s.mode == "arbitration" else "Did the student guide parties toward a fair, workable settlement?"}

Grading: 0–49=Fail, 50–64=Pass, 65–79=Merit, 80–100=Distinction.
Overall score = weighted average (Neutrality 20%, Issue ID 20%, Active Listening 20%, Process 20%, Resolution 20%).

Return ONLY valid JSON with EXACTLY this schema:
{{
  "overallScore": <0-100>,
  "grade": "Fail|Pass|Merit|Distinction",
  "summary": "<2-3 sentence overall assessment>",
  "neutralityScore": <0-100>,
  "issueIdentificationScore": <0-100>,
  "activeListeningScore": <0-100>,
  "processManagementScore": <0-100>,
  "resolutionQualityScore": <0-100>,
  "strengths": ["<specific strength>"],
  "improvements": ["<specific improvement>"],
  "recommendation": "<one concrete, actionable piece of advice>"
}}"""


# ── routes ────────────────────────────────────────────────────────────────────

@router.post("/chat")
async def mediation_chat(body: ChatRequest):
    """Stream a reply from whichever party/parties the student addressed."""
    if not body.messages:
        raise HTTPException(status_code=400, detail="messages cannot be empty")

    client = get_groq_client()
    system = _build_chat_system(body.scenario, body.addressedTo)

    msgs: list[dict] = [{"role": "system", "content": system}]
    # Strip the addressedTo field — the LLM only sees role + content
    for m in body.messages[-MAX_MESSAGES:]:
        msgs.append({"role": m.role, "content": m.content})

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
            logger.error("mediation_chat stream error: %s", exc)
            yield _sse(json.dumps({"error": "Stream error"}))
        finally:
            yield _sse("[DONE]")

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/report")
async def mediation_report(body: ReportRequest):
    """Generate a validated JSON evaluation report for the completed session."""
    if not body.messages:
        raise HTTPException(status_code=400, detail="messages cannot be empty")

    client = get_groq_client()

    # Build compact transcript
    lines = []
    for m in body.messages[-MAX_MESSAGES:]:
        if m.role == "user":
            to_label = ""
            if m.addressedTo and m.addressedTo != "both":
                to_label = f" [→ {body.scenario.partyA.name if m.addressedTo == 'partyA' else body.scenario.partyB.name}]"
            lines.append(f"Student{to_label}: {m.content[:300]}")
        else:
            lines.append(f"Party: {m.content[:300]}")
    transcript = "\n".join(lines)

    system = _build_report_system(body.scenario, transcript)

    for attempt in range(2):
        try:
            completion = await client.chat.completions.create(
                model=DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": "Generate the evaluation report now."},
                ],
                stream=False,
                response_format={"type": "json_object"},
                **REPORT_PARAMS,
            )
            raw = completion.choices[0].message.content or "{}"
            data = json.loads(raw)
            report = MediationReport(**data).model_dump()
            return JSONResponse(content={"report": report})
        except (json.JSONDecodeError, ValidationError, Exception) as exc:
            logger.warning("mediation_report attempt %d failed: %s", attempt + 1, exc)
            if attempt == 1:
                return JSONResponse(content={"report": _fallback_report()})

    return JSONResponse(content={"report": _fallback_report()})
