# LexAI — Python AI Service
### Architecture, Scope & Feature Plan

---

## 1. Overview

LexAI is a standalone Python microservice that powers all AI features on the LedxElearn platform.
It runs alongside the Next.js app as a separate process and communicates over HTTP.
The Next.js app never calls an external LLM directly — everything is routed through this service.

**Platform context:** Law exam preparation (CLAT, AILET, constitutional law).
All AI features are built with legal reasoning, case law, and exam patterns in mind.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | FastAPI | Async, fast, built-in streaming support |
| LLM | Groq — Llama 3 70B | Free tier, OpenAI-compatible API, very fast |
| Embeddings | sentence-transformers | Runs locally, zero cost, no API key |
| Vector DB | pgvector (PostgreSQL) | Same DB already used by Prisma — no extra infra |
| Job queue | BullMQ (existing) | Next.js worker already wired for embed jobs |
| Auth | x-internal-key header | Simple shared secret, service-to-service only |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LedxElearn (Next.js)                     │
│                                                             │
│  Student UI  ──►  /api/ai/chat    ──────────────────────┐  │
│  Tutor UI    ──►  /api/ai/grade   ──────────────────┐   │  │
│  Doubt UI    ──►  /api/ai/doubt   ──────────────┐   │   │  │
│  Case Lab    ──►  /api/ai/analyze ──────────┐   │   │   │  │
│  MCQ Lab     ──►  /api/ai/mcq     ──────┐   │   │   │   │  │
│  BullMQ      ──►  worker/embed    ──┐   │   │   │   │   │  │
└──────────────────────────────────│──│───│───│───│───│───│──┘
                                   │  │   │   │   │   │   │
                    x-internal-key │  │   │   │   │   │   │
                    ───────────────▼──▼───▼───▼───▼───▼───▼──
                   ┌────────────────────────────────────────┐
                   │         Python AI Service              │
                   │         FastAPI  :8000                  │
                   │                                        │
                   │  POST /embed     ◄── lesson indexing   │
                   │  POST /chat      ◄── RAG tutor (SSE)   │
                   │  POST /grade     ◄── assignment grading │
                   │  POST /doubt     ◄── doubt auto-answer  │
                   │  POST /analyze   ◄── case study AI      │
                   │  POST /mcq       ◄── MCQ generator      │
                   └───────────┬───────────────┬────────────┘
                               │               │
                   ┌───────────▼──┐    ┌───────▼───────┐
                   │  PostgreSQL  │    │  Groq API      │
                   │  + pgvector  │    │  (Llama 3 70B) │
                   │  lesson_chunks│    │  Free tier     │
                   └──────────────┘    └───────────────┘
```

---

## 4. Project Structure

```
ai-service/
│
├── main.py                  # App entry — registers all routers, runs db init
├── config.py                # Pydantic Settings — reads from .env
├── auth.py                  # Dependency: validates x-internal-key on every request
├── db.py                    # pgvector connection pool + db_init() helper
├── models.py                # All Pydantic request/response schemas
│
├── routes/
│   ├── chat.py              # POST /chat    — streaming RAG tutor
│   ├── embed.py             # POST /embed   — lesson indexing
│   ├── grade.py             # POST /grade   — assignment grading
│   ├── doubt.py             # POST /doubt   — auto-answer student doubts
│   ├── analyze.py           # POST /analyze — case study / legal draft analyzer
│   └── mcq.py               # POST /mcq     — generate practice MCQs from lesson
│
└── services/
    ├── embedder.py          # sentence-transformers wrapper (encode text → vector)
    ├── vector_store.py      # pgvector CRUD: upsert_chunks(), search()
    ├── llm.py               # Groq client: stream_chat(), complete()
    └── rag.py               # retrieve_context(query, lesson_id?) → formatted string
```

---

## 5. Database Schema (pgvector)

One new table added to the **existing PostgreSQL database** (no Prisma migration needed).
Run `db_init()` on service startup.

```sql
-- Enable the pgvector extension (once per database)
CREATE EXTENSION IF NOT EXISTS vector;

-- Stores chunked + embedded lesson content
CREATE TABLE IF NOT EXISTS lesson_chunks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id    TEXT        NOT NULL,
  chunk_index  INTEGER     NOT NULL,
  content      TEXT        NOT NULL,
  embedding    vector(384),            -- all-MiniLM-L6-v2 produces 384 dimensions
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lesson_id, chunk_index)      -- safe to re-embed without duplicates
);

-- IVFFlat index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS lesson_chunks_embedding_idx
  ON lesson_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

## 6. Environment Variables

```bash
# ── Security ──────────────────────────────────────────────────────────────
AI_INTERNAL_SECRET=internal-secret-token   # Must match Next.js AI_INTERNAL_SECRET

# ── LLM ──────────────────────────────────────────────────────────────────
GROQ_API_KEY=gsk_...                       # Free at console.groq.com
GROQ_MODEL=llama3-70b-8192                 # or llama3-8b-8192 for lower latency

# ── Embeddings ────────────────────────────────────────────────────────────
EMBED_MODEL=all-MiniLM-L6-v2               # Local model, downloads once on first run

# ── Database ─────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:password@localhost:5432/ledx_elearn_dev

# ── RAG tuning ────────────────────────────────────────────────────────────
TOP_K=5                                    # Number of chunks to retrieve per query
CHUNK_SIZE=500                             # Characters per chunk
CHUNK_OVERLAP=50                           # Overlap between chunks
```

---

## 7. Features & Scope

---

### Feature 1 — Lesson Embedding & Indexing
**Endpoint:** `POST /embed`
**Caller:** `worker/jobs/embed.ts` via BullMQ (fires when admin saves/updates a lesson)

**What it does:**
When a tutor saves or edits a lesson, the Next.js worker queues an embed job.
The Python service receives the full lesson text, splits it into overlapping chunks,
generates vector embeddings, and stores them in pgvector for later retrieval.

**Request body:**
```json
{ "lessonId": "uuid", "content": "Full lesson text here..." }
```

**Processing steps:**
1. Delete any existing chunks for this `lessonId` (handles re-embedding on edit)
2. Split `content` into 500-character chunks with 50-character overlap
3. Batch encode all chunks using `sentence-transformers`
4. Bulk insert into `lesson_chunks` table

**Response:**
```json
{ "ok": true, "chunks": 12 }
```

---

### Feature 2 — LexAI Chat Tutor (RAG)
**Endpoint:** `POST /chat`
**Caller:** `app/api/ai/chat/route.ts` → student `/ai-tutor` page
**Streaming:** Yes — SSE (text/event-stream)

**What it does:**
Students can ask any law-related question. The AI retrieves the most relevant
lesson chunks from pgvector, injects them as context, and streams a response
using Groq. Works like a personal law tutor that has read all course materials.

**Request body:**
```json
{
  "messages": [
    { "role": "user", "content": "Explain fundamental rights under Part III" }
  ]
}
```

**Processing steps:**
1. Take the last user message and embed it with `sentence-transformers`
2. Search pgvector for the top 5 most similar lesson chunks (global — no course filter)
3. Build a system prompt:
   ```
   You are LexAI, a law exam preparation assistant for CLAT and AILET.
   Use the following course material to answer accurately:
   ─────────────────────────────────────────────
   [retrieved chunks injected here]
   ─────────────────────────────────────────────
   If the answer is not in the material, reason from first principles.
   ```
4. Call Groq with full message history + system prompt, streaming enabled
5. Format each token in OpenAI-compatible SSE:
   ```
   data: {"choices":[{"delta":{"content":"token"}}]}

   data: [DONE]

   ```

**Why SSE format matters:** The frontend parser at
`app/(student)/ai-tutor/page.tsx` reads `choices[0].delta.content`
(OpenAI format), so this exact structure is required.

---

### Feature 3 — Assignment Auto-Grader
**Endpoint:** `POST /grade`
**Caller:** New Next.js route `app/api/ai/grade/route.ts`

**What it does:**
When a student submits an assignment, a tutor can trigger AI grading.
The AI evaluates the submission against the assignment prompt and optional rubric,
then returns a score and structured feedback.

**Request body:**
```json
{
  "submissionId":   "uuid",
  "submissionText": "The Constitution of India was adopted on...",
  "assignmentPrompt": "Explain the Preamble of the Indian Constitution",
  "maxScore": 10,
  "rubric": "Award 2 marks for each: accuracy, structure, examples, legal references, clarity"
}
```

**Processing steps:**
1. Build a grading prompt with the rubric
2. Single (non-streaming) Groq call requesting structured JSON output
3. Parse and validate the JSON response

**Response:**
```json
{
  "score": 8,
  "feedback": "Well-structured answer with good use of legal references. The historical context of the Preamble was explained clearly.",
  "suggestions": [
    "Include the 42nd Amendment which added 'Socialist' and 'Secular'",
    "Mention the Kesavananda Bharati case on the Basic Structure doctrine"
  ],
  "rubricBreakdown": {
    "accuracy": 2,
    "structure": 2,
    "examples": 1,
    "legalReferences": 2,
    "clarity": 1
  }
}
```

---

### Feature 4 — Doubt Auto-Answer
**Endpoint:** `POST /doubt`
**Caller:** New Next.js route `app/api/ai/doubt/route.ts`
         (or called directly from `app/api/doubts/route.ts` on POST)

**What it does:**
When a student raises a doubt on a specific lesson, LexAI generates an
instant answer scoped to that lesson's content. The answer is shown to
the student immediately while also notifying the tutor for review.
This reduces wait time for students and workload for tutors.

**Request body:**
```json
{
  "doubtId":  "uuid",
  "question": "What is the difference between void and voidable agreements?",
  "lessonId": "uuid"
}
```

**Processing steps:**
1. Embed the question
2. Search pgvector scoped to `lessonId` — retrieves top 5 chunks from that lesson only
3. Single Groq call with lesson context + question
4. Return the answer

**Response:**
```json
{
  "answer": "A void agreement has no legal effect from the beginning (e.g., agreement with a minor). A voidable agreement is valid and binding until the aggrieved party chooses to avoid it (e.g., agreement obtained by coercion under Section 19, ICA)."
}
```

---

### Feature 5 — Case Study / Legal Draft Analyzer
**Endpoint:** `POST /analyze`
**Caller:** New Next.js route `app/api/ai/analyze/route.ts`
**UI location:** New student page `/practice-lab/case-analyzer`

**What it does:**
This is the most advanced feature. Students paste a legal scenario, judgment,
or draft document and the AI produces a structured legal analysis — identifying
issues, applicable laws, arguments on both sides, and a conclusion.
Modelled after how legal professionals write case briefs.

**Request body:**
```json
{
  "caseText": "Ram, aged 16, entered into a contract with Shyam to purchase a motorcycle for Rs. 50,000...",
  "analysisType": "case_brief" | "issue_spotting" | "argument_mapping" | "statute_analysis"
}
```

**Analysis types:**

| Type | What it produces |
|---|---|
| `case_brief` | Facts, Issues, Rule, Application, Conclusion (IRAC format) |
| `issue_spotting` | Lists all legal issues present in the scenario |
| `argument_mapping` | Arguments for plaintiff + arguments for defendant |
| `statute_analysis` | Identifies relevant statutes and how they apply |

**Processing steps:**
1. No vector retrieval needed — case text is passed directly as context
2. Build a structured prompt based on `analysisType`
3. Single Groq call requesting structured JSON output
4. Return the structured analysis

**Response (case_brief example):**
```json
{
  "analysisType": "case_brief",
  "facts": "Ram (minor, 16) entered a contract with Shyam to buy a motorcycle for Rs.50,000. Ram paid Rs.10,000 upfront.",
  "issues": [
    "Can a minor enter into a valid contract under the Indian Contract Act?",
    "Is Ram entitled to recover the advance paid?"
  ],
  "rule": "Section 11, ICA — Competency to contract requires majority. The Indian Majority Act sets 18 as the age of majority. A minor's agreement is void ab initio (Mohori Bibee v. Dharmodas Ghose, 1903).",
  "application": "Since Ram is 16, he lacks contractual capacity. The agreement is void ab initio. Under the doctrine of restitution (Section 65), since the contract is void, Shyam must return Rs.10,000 to Ram.",
  "conclusion": "The contract between Ram and Shyam is void. Ram can recover the Rs.10,000 advance.",
  "relevantCases": ["Mohori Bibee v. Dharmodas Ghose (1903)"],
  "relevantStatutes": ["Section 11, ICA", "Section 65, ICA", "Indian Majority Act, 1875"]
}
```

---

### Feature 6 — MCQ Generator
**Endpoint:** `POST /mcq`
**Caller:** New Next.js route `app/api/ai/mcq/route.ts`
**UI location:** Admin curriculum editor + student practice area

**What it does:**
Tutors can auto-generate practice MCQs from any lesson content.
Students get generated practice questions for exam preparation.

**Request body:**
```json
{
  "lessonId": "uuid",
  "count": 5,
  "difficulty": "easy" | "medium" | "hard",
  "type": "factual" | "application" | "reasoning"
}
```

**Processing steps:**
1. Fetch top 10 chunks from `lesson_chunks` for the given `lessonId` (broad retrieval)
2. Build a prompt asking Groq to generate `count` MCQs from the content
3. Request structured JSON with 4 options, correct answer, and explanation

**Response:**
```json
{
  "questions": [
    {
      "question": "Which article of the Indian Constitution deals with the Right to Equality?",
      "options": ["Article 12", "Article 14", "Article 19", "Article 21"],
      "correctAnswer": "Article 14",
      "explanation": "Article 14 guarantees equality before law and equal protection of laws to all persons within the territory of India.",
      "difficulty": "easy"
    }
  ]
}
```

---

## 8. API Reference Summary

| Method | Endpoint | Auth | Streaming | Purpose |
|---|---|---|---|---|
| POST | `/embed` | x-internal-key | No | Index lesson content into pgvector |
| POST | `/chat` | x-internal-key | Yes (SSE) | RAG-powered AI tutor chat |
| POST | `/grade` | x-internal-key | No | Auto-grade assignment submission |
| POST | `/doubt` | x-internal-key | No | Auto-answer student doubt |
| POST | `/analyze` | x-internal-key | No | Legal case study / draft analysis |
| POST | `/mcq` | x-internal-key | No | Generate practice MCQs from lesson |
| GET | `/health` | None | No | Health check (uptime monitoring) |

---

## 9. Data Flow — RAG Pipeline

```
Student types question
        │
        ▼
  Embed question
  (sentence-transformers)
        │
        ▼
  pgvector cosine search
  top-5 lesson chunks
        │
        ▼
  Build system prompt
  (inject retrieved chunks)
        │
        ▼
  Groq Llama 3 70B
  (stream tokens)
        │
        ▼
  Format as SSE
  (OpenAI-compatible)
        │
        ▼
  Next.js proxy (/api/ai/chat)
        │
        ▼
  Student UI streams response
```

---

## 10. Next.js Routes to Add

These routes act as thin proxies — they verify the user's JWT, then forward to the Python service.

| New File | Forwards to |
|---|---|
| `app/api/ai/grade/route.ts` | `AI_SERVICE_URL/grade` |
| `app/api/ai/doubt/route.ts` | `AI_SERVICE_URL/doubt` |
| `app/api/ai/analyze/route.ts` | `AI_SERVICE_URL/analyze` |
| `app/api/ai/mcq/route.ts` | `AI_SERVICE_URL/mcq` |

Pattern is identical to the existing `app/api/ai/chat/route.ts`.

---

## 11. New Student UI Pages

| Page | Route | Feature |
|---|---|---|
| AI Tutor Chat | `/ai-tutor` | Already exists |
| Case Analyzer | `/practice-lab/case-analyzer` | Feature 5 |
| MCQ Practice | `/practice-lab/mcq` | Feature 6 |

---

## 12. Priority Order (Build Sequence)

```
Phase 1 — Core Infrastructure
  ├── config.py, auth.py, db.py, models.py
  ├── services/embedder.py
  ├── services/vector_store.py
  └── services/llm.py

Phase 2 — Foundation Endpoints (already wired in Next.js)
  ├── POST /embed      (BullMQ worker already calls this)
  └── POST /chat       (student AI tutor page already calls this)

Phase 3 — Tutor & Admin Features
  ├── POST /grade      (assignment grading)
  └── POST /mcq        (MCQ generator for admin/tutor)

Phase 4 — Advanced Student Features
  ├── POST /doubt      (instant doubt answers)
  └── POST /analyze    (case study analyzer — flagship feature)
```

---

## 13. Dependencies (`requirements.txt`)

```
fastapi>=0.111
uvicorn[standard]>=0.29
groq>=0.9
sentence-transformers>=2.7
psycopg2-binary>=2.9
pgvector>=0.3
pydantic-settings>=2.2
python-dotenv>=1.0
```

No GPU required. `sentence-transformers` runs on CPU with the `all-MiniLM-L6-v2` model.
First run downloads the model (~80 MB). Subsequent runs use the local cache.

---

## 14. Server Specifications — Full LedxElearn Platform

This covers the hardware and software requirements for running the **complete platform**:
Next.js app · Python AI service · BullMQ workers · PostgreSQL · Redis.

External services (Mux, Cloudflare R2, Razorpay, Resend, Groq) are cloud-hosted
and do not affect server sizing.

---

### Full Platform — Services on the Server

| Service | What it does | Self-hosted? |
|---|---|---|
| Next.js app | Student/tutor/admin UI + API routes | Yes |
| BullMQ workers | Certificate, email, embed jobs | Yes (same machine) |
| Python AI service | RAG chat, grading, case analyzer, MCQ | Yes |
| PostgreSQL + pgvector | Primary database + vector storage | Yes |
| Redis | Job queue for BullMQ | Yes |
| Mux | Video encoding + streaming | No (cloud) |
| Cloudflare R2 | File/PDF/image storage | No (cloud) |
| Razorpay | Payment processing | No (cloud) |
| Resend | Transactional emails | No (cloud) |
| Groq | LLM inference (AI features) | No (cloud, free tier) |

---

### Tier 1 — Local Dev Machine (Laptop / Desktop)

Use this when developing on your own computer.

**Hardware:**

| Component | Minimum | Recommended |
|---|---|---|
| CPU | 4 cores | 6–8 cores |
| RAM | **8 GB** | 16 GB |
| Storage | **30 GB free SSD** | 50 GB SSD |
| Network | Broadband (for Groq, Mux, R2 APIs) | — |
| GPU | Not required | Not required |

**RAM breakdown (all processes running simultaneously):**

| Process | Approx. RAM |
|---|---|
| Next.js dev server (`next dev`) | ~700 MB |
| BullMQ workers (`tsx watch worker/index.ts`) | ~200 MB |
| Python FastAPI + sentence-transformers loaded | ~500 MB |
| PostgreSQL | ~300 MB |
| Redis | ~60 MB |
| OS + browser + VS Code / IDE | ~2.5 GB |
| **Total** | **~4.3 GB** → 8 GB minimum |

> On a 4 GB machine Next.js dev mode will be sluggish and may OOM.
> 8 GB is the real minimum for comfortable local development.

---

### Tier 2 — Dev / Staging VPS (Cloud Server)

Use this for a shared dev environment, QA testing, or staging before production.
A single VPS running all services.

**Hardware:**

| Component | Minimum | Recommended |
|---|---|---|
| CPU | **2 vCPUs** | 4 vCPUs |
| RAM | **4 GB** | 8 GB |
| Storage | **40 GB SSD** | 60 GB SSD |
| Bandwidth | 1 TB/month | 2 TB/month |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

**RAM breakdown (production-built Next.js, not dev mode):**

| Process | Approx. RAM |
|---|---|
| Next.js (`next start`) | ~350 MB |
| BullMQ workers | ~180 MB |
| Python FastAPI + model | ~500 MB |
| PostgreSQL | ~300 MB |
| Redis | ~60 MB |
| OS overhead | ~400 MB |
| **Total** | **~1.8 GB** → 4 GB gives headroom |

**Affordable VPS options that meet this spec:**

| Provider | Plan | vCPU | RAM | SSD | Price/month |
|---|---|---|---|---|---|
| Hetzner | CX22 | 2 | 4 GB | 40 GB | ~€4 |
| DigitalOcean | Basic Droplet | 2 | 4 GB | 80 GB | ~$24 |
| Vultr | Regular Cloud | 2 | 4 GB | 80 GB | ~$24 |
| Contabo | VPS S | 4 | 8 GB | 200 GB | ~€5 |

> **Hetzner CX22** or **Contabo VPS S** offer the best value for a staging server.

---

### Tier 3 — Production Server (Small Institute, up to ~500 students)

**Hardware:**

| Component | Minimum | Recommended |
|---|---|---|
| CPU | **4 vCPUs** | 8 vCPUs |
| RAM | **8 GB** | 16 GB |
| Storage | **80 GB SSD** | 160 GB SSD |
| Bandwidth | 3 TB/month | 5 TB/month |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

**RAM breakdown (production, concurrent load):**

| Process | Approx. RAM |
|---|---|
| Next.js (2 instances via PM2) | ~700 MB |
| BullMQ workers (concurrency: cert×2, email×5, embed×1) | ~300 MB |
| Python FastAPI (2 uvicorn workers) | ~900 MB |
| PostgreSQL (connection pooling, PgBouncer) | ~600 MB |
| Redis | ~100 MB |
| OS + monitoring + logs | ~600 MB |
| **Total** | **~3.2 GB** → 8 GB for safe headroom |

---

### Software Requirements (All Tiers)

| Software | Version | Notes |
|---|---|---|
| OS | Ubuntu 22.04 LTS | Debian 12 also works |
| Node.js | 20 LTS | Use nvm to install |
| Python | 3.11 | Use pyenv to install |
| PostgreSQL | 15 or 16 | apt install postgresql-16 |
| pgvector extension | 0.7.0+ | `apt install postgresql-16-pgvector` |
| Redis | 7.x | apt install redis-server |
| Nginx | 1.24+ | Reverse proxy (prod only) |
| PM2 | Latest | Process manager for Next.js + workers |

---

### Ports Used

| Port | Service | Exposed publicly? |
|---|---|---|
| 80 / 443 | Nginx (reverse proxy) | Yes |
| 3000 | Next.js | No (behind Nginx) |
| 8000 | Python AI service | No (behind Nginx or internal only) |
| 5432 | PostgreSQL | No (localhost only) |
| 6379 | Redis | No (localhost only) |

The Python AI service should **not** be publicly accessible — only Next.js talks to it via `AI_SERVICE_URL=http://localhost:8000`. The `x-internal-key` provides a second layer of protection.

---

### Storage Breakdown

| Item | Dev | Production |
|---|---|---|
| OS + base packages | 5 GB | 5 GB |
| Node.js + npm cache | 500 MB | 500 MB |
| `node_modules/` | 1.5 GB | 1.5 GB |
| Next.js `.next/` build output | 300 MB | 300 MB |
| Python venv + deps | 1.5 GB | 1.5 GB |
| sentence-transformers model cache | 80 MB | 80 MB |
| PostgreSQL data | 500 MB | 5–20 GB (grows with content) |
| Redis RDB snapshots | 50 MB | 200 MB |
| Logs | 100 MB | 1–2 GB |
| **Total** | **~10 GB** → 30 GB | **~12–30 GB** → 80 GB |

> Video files are **not** stored on the server — Mux handles all video.
> Documents/PDFs go to **Cloudflare R2**. Only DB + code lives on the server.

---

### External API Keys Needed (Free Tiers Available)

| Service | Purpose | Free Tier |
|---|---|---|
| Groq | LLM for all AI features | Yes — generous free tier |
| Mux | Video upload + streaming | Yes — free for low usage |
| Cloudflare R2 | File storage | Yes — 10 GB free |
| Razorpay | Payments | Yes — test mode free |
| Resend | Transactional email | Yes — 3,000 emails/month free |

---

### Quick Verification Commands (Ubuntu Server)

```bash
# Check all services are running
systemctl status postgresql redis-server nginx

# Verify pgvector is installed
psql -U postgres -c "SELECT extversion FROM pg_extension WHERE extname='vector';"

# Check Python AI service is up
curl http://localhost:8000/health

# Check Next.js is up
curl http://localhost:3000/api/health

# Check Redis
redis-cli ping   # → PONG

# Check free memory
free -h

# Check disk usage
df -h /
```

---

## 15. Getting Started

```bash
# 1. Get a free Groq API key
#    → https://console.groq.com  (sign up, create API key)

# 2. Create the service
cd ai-service
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Set env vars
cp .env.example .env
# fill in GROQ_API_KEY and DATABASE_URL

# 4. Run (db table auto-created on startup)
uvicorn main:app --reload --port 8000
```
