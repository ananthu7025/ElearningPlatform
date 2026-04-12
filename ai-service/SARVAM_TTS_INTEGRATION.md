# Sarvam AI Text-to-Speech — Client Interview Voice Feature

Add spoken audio to the Client Interview practice module so the AI client character
speaks each reply aloud using Sarvam AI's `bulbul:v1` TTS model.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Sarvam AI TTS API Reference](#2-sarvam-ai-tts-api-reference)
3. [Architecture](#3-architecture)
4. [Environment Variables](#4-environment-variables)
5. [Backend — New TTS Proxy Route](#5-backend--new-tts-proxy-route)
6. [Frontend — ClientInterviewChat.tsx Changes](#6-frontend--clientinterviewchattsx-changes)
7. [Voice Selection Strategy](#7-voice-selection-strategy)
8. [Testing](#8-testing)
9. [Limitations & Gotchas](#9-limitations--gotchas)
10. [Cost & Rate Limits](#10-cost--rate-limits)

---

## 1. Overview

After every AI client reply streams in, the assembled text is sent to Sarvam AI TTS.
The returned WAV audio is decoded in the browser and played automatically.
Students can mute/unmute at any time. A speaking indicator shows when the client
is talking.

**Chosen approach: post-stream sentence-queued playback**

```
SSE stream finishes → split reply into sentences → fetch TTS for each sentence
→ play audio chunks back-to-back → show speaking indicator while audio plays
```

This is simpler and more reliable than mid-stream TTS (no race conditions, no
overlapping requests), while still sounding natural because sentences play in order
with no gap.

---

## 2. Sarvam AI TTS API Reference

### Sign Up
1. Go to **https://dashboard.sarvam.ai** and create a free account
2. Navigate to **API Keys** → **Generate Key**
3. Copy the key — you will add it as `SARVAM_API_KEY` in Next.js `.env.local`

### Endpoint

```
POST https://api.sarvam.ai/text-to-speech
```

### Request Headers

```
api-subscription-key: <your-api-key>
Content-Type: application/json
```

### Request Body

```json
{
  "inputs": ["Text to speak. Maximum ~500 characters per string."],
  "target_language_code": "en-IN",
  "speaker": "meera",
  "pace": 1.0,
  "pitch": 0,
  "loudness": 1.5,
  "speech_sample_rate": 22050,
  "enable_preprocessing": true,
  "model": "bulbul:v1"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `inputs` | `string[]` | Array of text strings. Each string ≤ 500 chars. Max 3 strings per call. |
| `target_language_code` | string | See language codes below. Default `en-IN`. |
| `speaker` | string | Voice name. See voice options below. |
| `pace` | float | Speech speed. `0.5` (slow) – `2.0` (fast). Default `1.0`. |
| `pitch` | int | Pitch shift in semitones. `-6` to `+6`. Default `0`. |
| `loudness` | float | Volume multiplier. `0.5` – `2.0`. Default `1.5`. |
| `speech_sample_rate` | int | `8000`, `16000`, or `22050`. Default `22050` (best quality). |
| `enable_preprocessing` | bool | Expands abbreviations, numbers. Recommended `true`. |
| `model` | string | Always `"bulbul:v1"` (current production model). |

### Response

```json
{
  "audios": ["<base64-encoded-wav-string>"],
  "request_id": "uuid"
}
```

The `audios` array has one entry per input string. Each entry is a **base64-encoded WAV** file.

### Available Voices

| Speaker | Gender | Accent |
|---------|--------|--------|
| `meera` | Female | Indian English |
| `pavithra` | Female | Indian English |
| `maitreyi` | Female | Indian English |
| `aroha` | Female | Indian English |
| `dia` | Female | Indian English |
| `arvind` | Male | Indian English |
| `amol` | Male | Indian English |
| `amartya` | Male | Indian English |
| `neel` | Male | Indian English |

### Supported Language Codes

| Code | Language |
|------|----------|
| `en-IN` | English (India) |
| `hi-IN` | Hindi |
| `bn-IN` | Bengali |
| `kn-IN` | Kannada |
| `ml-IN` | Malayalam |
| `mr-IN` | Marathi |
| `ta-IN` | Tamil |
| `te-IN` | Telugu |
| `gu-IN` | Gujarati |

---

## 3. Architecture

```
Browser (ClientInterviewChat.tsx)
  │
  │  POST /api/ai/tts   { text, speaker }
  ▼
Next.js API Route (/app/api/ai/tts/route.ts)
  │  — auth check (session required)
  │  — text sanitization + chunking
  │  POST https://api.sarvam.ai/text-to-speech
  ▼
Sarvam AI
  │  { audios: ["base64wav"] }
  ▼
Next.js API Route
  │  — decodes base64 → binary
  │  — returns audio/wav blob
  ▼
Browser
  — AudioContext decodes WAV
  — Plays through speaker
  — Shows speaking indicator
```

The Next.js proxy keeps the `SARVAM_API_KEY` server-side (never exposed to browser)
and re-uses the existing session-based auth pattern.

---

## 4. Environment Variables

### Next.js `.env.local`

```env
# Existing
AI_SERVICE_URL="http://localhost:8000"
AI_INTERNAL_SECRET="internal-secret-token"

# New — Sarvam AI
SARVAM_API_KEY="your-sarvam-api-key-here"
```

---

## 5. Backend — New TTS Proxy Route

### Create `/app/api/ai/tts/route.ts`

```typescript
/**
 * TTS proxy — server-side only, keeps SARVAM_API_KEY secret.
 * Accepts { text, speaker?, languageCode? }
 * Returns audio/wav binary.
 */
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const SARVAM_URL = "https://api.sarvam.ai/text-to-speech"
const SARVAM_KEY = process.env.SARVAM_API_KEY ?? ""

// Hard cap per chunk Sarvam accepts
const MAX_CHUNK_CHARS = 500

const ALLOWED_SPEAKERS = new Set([
  "meera", "pavithra", "maitreyi", "aroha", "dia",
  "arvind", "amol", "amartya", "neel",
])

const ALLOWED_LANG_CODES = new Set([
  "en-IN", "hi-IN", "bn-IN", "kn-IN", "ml-IN",
  "mr-IN", "ta-IN", "te-IN", "gu-IN", "pa-IN", "od-IN",
])

export async function POST(req: NextRequest) {
  // Auth guard — must be a logged-in student/tutor/admin
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!SARVAM_KEY) {
    return NextResponse.json({ error: "TTS not configured" }, { status: 503 })
  }

  let text: string
  let speaker: string
  let languageCode: string

  try {
    const body = await req.json()
    text         = String(body.text ?? "").trim().slice(0, 1000) // max 1000 chars total
    speaker      = ALLOWED_SPEAKERS.has(body.speaker) ? body.speaker : "meera"
    languageCode = ALLOWED_LANG_CODES.has(body.languageCode) ? body.languageCode : "en-IN"
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 })
  }

  // Split into ≤500 char chunks at sentence boundaries
  const chunks = splitIntoChunks(text, MAX_CHUNK_CHARS)

  try {
    const sarvamRes = await fetch(SARVAM_URL, {
      method: "POST",
      headers: {
        "api-subscription-key": SARVAM_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: chunks,
        target_language_code: languageCode,
        speaker,
        pace: 1.0,
        pitch: 0,
        loudness: 1.5,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
        model: "bulbul:v1",
      }),
      signal: AbortSignal.timeout(15_000), // 15s timeout
    })

    if (!sarvamRes.ok) {
      const errText = await sarvamRes.text()
      console.error("[TTS] Sarvam error", sarvamRes.status, errText)
      return NextResponse.json({ error: "TTS provider error" }, { status: 502 })
    }

    const data = await sarvamRes.json()
    const audios: string[] = data.audios ?? []

    if (!audios.length) {
      return NextResponse.json({ error: "No audio returned" }, { status: 502 })
    }

    // Concatenate all WAV audio buffers (strip headers from all but first)
    const wavBuffer = mergeWavBase64(audios)

    return new NextResponse(wavBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": wavBuffer.byteLength.toString(),
        // Cache identical text+speaker combos for 1 hour in the browser
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (err) {
    console.error("[TTS] Fetch error:", err)
    return NextResponse.json({ error: "TTS request failed" }, { status: 502 })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Split text into chunks ≤ maxChars, preferring sentence boundaries.
 */
function splitIntoChunks(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]

  const chunks: string[] = []
  // Split at sentence ends: period/exclamation/question followed by space or end
  const sentences = text.split(/(?<=[.!?])\s+/)

  let current = ""
  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence
    if (candidate.length <= maxChars) {
      current = candidate
    } else {
      if (current) chunks.push(current.trim())
      // If single sentence is still too long, hard-cut at word boundary
      current = sentence.length > maxChars ? hardCut(sentence, maxChars) : sentence
    }
  }
  if (current) chunks.push(current.trim())

  return chunks.filter(Boolean).slice(0, 3) // Sarvam allows max 3 inputs per request
}

function hardCut(text: string, maxChars: number): string {
  // Cut at last space before maxChars
  const cut = text.slice(0, maxChars)
  const lastSpace = cut.lastIndexOf(" ")
  return lastSpace > 0 ? cut.slice(0, lastSpace) : cut
}

/**
 * Merge multiple base64-encoded WAV buffers into one.
 * Keeps the full first WAV (including header), then appends only the PCM
 * data (after the 44-byte WAV header) from subsequent buffers.
 */
function mergeWavBase64(base64Audios: string[]): ArrayBuffer {
  const buffers = base64Audios.map((b64) => {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  })

  if (buffers.length === 1) return buffers[0].buffer

  const WAV_HEADER_SIZE = 44
  const totalPcmBytes = buffers.reduce(
    (sum, buf, i) => sum + (i === 0 ? buf.length : buf.length - WAV_HEADER_SIZE),
    0,
  )

  const merged = new Uint8Array(totalPcmBytes)
  let offset = 0

  for (let i = 0; i < buffers.length; i++) {
    const start = i === 0 ? 0 : WAV_HEADER_SIZE
    merged.set(buffers[i].slice(start), offset)
    offset += buffers[i].length - (i === 0 ? 0 : WAV_HEADER_SIZE)
  }

  // Update WAV data chunk size in header (bytes 40-43)
  const pcmDataSize = totalPcmBytes - WAV_HEADER_SIZE
  const view = new DataView(merged.buffer)
  view.setUint32(4, totalPcmBytes - 8, true)   // RIFF chunk size
  view.setUint32(40, pcmDataSize, true)          // data chunk size

  return merged.buffer
}
```

---

## 6. Frontend — ClientInterviewChat.tsx Changes

The changes are **additive** — they do not touch the existing SSE streaming or report logic.
Add the highlighted blocks at the positions described.

### Step 1 — New state variables and refs

Add these directly after the existing `const [saved, setSaved] = useState(false)` line:

```typescript
// ── TTS state ─────────────────────────────────────────────────────────────────
const [voiceEnabled, setVoiceEnabled] = useState(true)
const [speaking,    setSpeaking]     = useState(false)
const audioCtxRef   = useRef<AudioContext | null>(null)
const audioQueueRef = useRef<Promise<void>>(Promise.resolve())
```

### Step 2 — TTS utility functions

Add these functions **above** `fetchReply`, after the `useEffect` block:

```typescript
// ── Text-to-speech helpers ────────────────────────────────────────────────────

/**
 * Fetch WAV audio for the given text from the TTS proxy.
 * Returns an ArrayBuffer, or null on any error.
 */
async function fetchTtsAudio(text: string, speaker: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch('/api/ai/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: accessToken ? `Bearer ${accessToken}` : '',
      },
      body: JSON.stringify({ text, speaker }),
    })
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

/**
 * Decode a WAV ArrayBuffer and play it through the Web Audio API.
 * Resolves when playback finishes.
 */
async function playAudioBuffer(buffer: ArrayBuffer): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext()
      }
      const ctx = audioCtxRef.current

      ctx.decodeAudioData(buffer, (decoded) => {
        const source = ctx.createBufferSource()
        source.buffer = decoded
        source.connect(ctx.destination)
        source.onended = () => resolve()
        source.start(0)
      }, () => resolve()) // decode error → skip silently
    } catch {
      resolve()
    }
  })
}

/**
 * Queue speech for a completed assistant reply.
 * Runs sequentially — new replies wait for previous audio to finish.
 */
function speakReply(text: string) {
  if (!voiceEnabled || !text.trim()) return

  // Choose a speaker voice based on client name (see Voice Selection section)
  const speaker = resolveVoice(clientName)

  // Chain onto the audio queue so overlapping replies play in order
  audioQueueRef.current = audioQueueRef.current.then(async () => {
    setSpeaking(true)
    const buffer = await fetchTtsAudio(text, speaker)
    if (buffer) await playAudioBuffer(buffer)
    setSpeaking(false)
  })
}
```

### Step 3 — Voice resolver function

Add this **outside** the component (at module level, near the helpers):

```typescript
// ── Voice selection ───────────────────────────────────────────────────────────

/** Infer a Sarvam speaker name from the client's display name. */
function resolveVoice(clientName: string): string {
  const name = clientName.toLowerCase()

  // Explicit feminine name patterns
  const feminineNames = [
    'priya', 'ananya', 'divya', 'pooja', 'neha', 'sunita', 'kavita',
    'rekha', 'meena', 'asha', 'sita', 'gita', 'lata', 'nandita',
    'padma', 'usha', 'radha', 'lakshmi', 'sarita', 'vandana',
    'mrs', 'ms', 'miss', 'smt',
  ]

  const isFeminine = feminineNames.some((n) => name.includes(n))

  // Rotate through voices to give different clients distinct voices
  const femaleVoices = ['meera', 'pavithra', 'maitreyi', 'aroha', 'dia'] as const
  const maleVoices   = ['arvind', 'amol', 'amartya', 'neel']             as const

  // Use a hash of the name to consistently pick the same voice per client
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)

  if (isFeminine) return femaleVoices[hash % femaleVoices.length]
  return maleVoices[hash % maleVoices.length]
}
```

### Step 4 — Call `speakReply` after fetchReply resolves

In `startInterview`, update the `fetchReply` call:

```typescript
async function startInterview() {
  setStep('CONSULTATION')
  setTyping(true)
  try {
    const reply = await fetchReply([])   // ← already returns full string
    speakReply(reply)                    // ← add this line
  } catch {
    setMessages([{ role: 'assistant', content: "Hi, I'm glad you could see me. I'm not sure where to begin…" }])
  } finally {
    setTyping(false)
  }
}
```

In `handleSend`, update the `fetchReply` call:

```typescript
async function handleSend() {
  const text = input.trim()
  if (!text || turns === 0 || typing) return

  const userMsg: Message = { role: 'user', content: text }
  const updated = [...messages, userMsg]

  setMessages(updated)
  setInput('')
  setTurns((t) => t - 1)
  setTyping(true)

  try {
    const reply = await fetchReply(updated)   // ← already returns full string
    speakReply(reply)                          // ← add this line
  } catch {
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: "Sorry, I didn't catch that. Could you say it again?" },
    ])
  } finally {
    setTyping(false)
  }
}
```

### Step 5 — Mute/unmute button in the UI

Find the consultation header area (look for the `clientName` display near the top of the
CONSULTATION step JSX) and add the mute button next to it:

```tsx
{/* Mute / unmute toggle — add inside the chat header bar */}
<button
  type="button"
  className={`btn btn-sm btn-icon ${voiceEnabled ? 'btn-primary' : 'btn-outline-secondary'}`}
  onClick={() => setVoiceEnabled((v) => !v)}
  title={voiceEnabled ? 'Mute AI voice' : 'Unmute AI voice'}
>
  <i className={`ri-${voiceEnabled ? 'volume-up' : 'volume-mute'}-line`} />
</button>
```

### Step 6 — Speaking indicator

Find the `{typing && <TypingBubble />}` line (or wherever the typing indicator renders)
and add the speaking indicator below it:

```tsx
{speaking && !typing && (
  <div className="d-flex align-items-center gap-2 text-muted small ms-2 mb-2">
    <span className="spinner-grow spinner-grow-sm text-primary" role="status" />
    <span>{clientName} is speaking…</span>
  </div>
)}
```

### Step 7 — Cleanup AudioContext on unmount

Add this `useEffect` after the existing auto-scroll `useEffect`:

```typescript
// Clean up AudioContext when the component unmounts
useEffect(() => {
  return () => {
    audioCtxRef.current?.close()
  }
}, [])
```

---

## 7. Voice Selection Strategy

The `resolveVoice` function in Step 3 covers three cases:

| Case | Logic | Example |
|------|-------|---------|
| Feminine name match | Checks a list of common Indian feminine first names / honorifics | "Mrs. Priya Sharma" → female voice |
| Male / neutral name | Falls back to male voices | "Rajesh Kumar" → male voice |
| Consistent per client | Uses a hash of the name so the same client always gets the same voice | "Suresh" always → "arvind" |

**To override voice for a specific scenario**, you can extend the `ScenarioContext`
to include a `voiceHint: "male" | "female" | "<speaker-name>"` field set by the
tutor when creating the scenario. The frontend would pass this to `resolveVoice`.

---

## 8. Testing

### 1. Test the TTS proxy endpoint directly

```bash
# From the Next.js app root, with a running dev server
curl -X POST http://localhost:3000/api/ai/tts \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{"text": "Hello, I need some legal advice about my landlord.", "speaker": "meera"}' \
  --output test.wav

# Play the file
afplay test.wav          # macOS
aplay test.wav           # Linux
start test.wav           # Windows
```

Expected: A WAV file plays the text in the chosen voice.

### 2. Test chunking with long text

```bash
curl -X POST http://localhost:3000/api/ai/tts \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{"text": "This is a very long response that exceeds five hundred characters. It should be split into multiple chunks automatically. Each chunk is sent to the Sarvam API separately and the resulting audio is merged into a single continuous WAV file. The student should hear seamless audio without any gaps between the chunks.", "speaker": "arvind"}' \
  --output long.wav
```

### 3. Test mute toggle
1. Open a CLIENT_INTERVIEW scenario
2. Start the interview — first AI reply should auto-speak
3. Click the mute button — next reply should be text-only (no audio)
4. Click unmute — next reply should speak again

### 4. Test error recovery
Temporarily set `SARVAM_API_KEY=""` in `.env.local` and restart Next.js.
The interview should still work fully — TTS calls fail silently, only text is shown.

---

## 9. Limitations & Gotchas

### Browser AudioContext autoplay policy
Modern browsers block `AudioContext` creation until a user gesture.
The student has already clicked "Start Interview" before any TTS is called,
so this is satisfied. If audio silently fails on first message, ensure
`AudioContext` is not created before the user's first interaction.

### Sarvam 3-chunk limit
The proxy caps at 3 chunks per request (`slice(0, 3)` in `splitIntoChunks`).
Client replies are typically 2–4 sentences, so this is almost never reached.
Very long replies (>1500 chars) will have audio cut off — but this rarely happens
because the interview route sets `max_tokens=300` for roleplay.

### WAV merge quality
The `mergeWavBase64` function does a simple header-strip concat. This works
correctly for same-format WAVs (same sample rate, bit depth, channels — which
Sarvam always returns). Do not mix WAVs from different sample rates.

### No streaming TTS
Audio only starts after the full text reply streams in. There will always be a
1–2 second gap between text appearing and audio starting. Mid-stream sentence
TTS (firing TTS as each sentence completes during streaming) is possible but
significantly increases complexity and API call count.

### Voice language
Sarvam `bulbul:v1` English voices (`en-IN`) handle Indian-accented English well.
If a client character is supposed to speak in Hindi or another Indian language,
set `languageCode: "hi-IN"` and choose an appropriate voice — but then the
scenario content must also be in that language.

### SARVAM_API_KEY missing
If `SARVAM_API_KEY` is not set, the route returns `503 TTS not configured`.
The frontend treats any non-200 TTS response as a silent failure — the interview
continues normally without audio. Never hard-fail the interview because TTS is unavailable.

---

## 10. Cost & Rate Limits

Sarvam AI TTS pricing (as of 2025):
- Free tier: ~500,000 characters/month
- Each average client reply ≈ 150 characters
- 18 turns per interview × 150 chars = 2,700 chars per interview
- Free tier supports ≈ **185 full interviews per month**

For a production institute with high usage, monitor usage at
**https://dashboard.sarvam.ai/usage** and upgrade to a paid plan as needed.

Rate limit: 10 requests/second on free tier.
The proxy sends 1 request per AI reply, so this is never a concern at normal usage.

---

## Summary of Files to Create / Edit

| File | Action | Purpose |
|------|--------|---------|
| `app/api/ai/tts/route.ts` | **Create** | TTS proxy — keeps API key server-side |
| `components/student/ClientInterviewChat.tsx` | **Edit** | Add TTS hooks, mute button, speaking indicator |
| `.env.local` | **Edit** | Add `SARVAM_API_KEY` |
