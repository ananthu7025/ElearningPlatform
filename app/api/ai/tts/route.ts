/**
 * TTS proxy — keeps SARVAM_API_KEY server-side, never exposed to the browser.
 * POST { text, speaker?, languageCode? } → audio/wav binary
 */
import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/auth'

const SARVAM_URL = 'https://api.sarvam.ai/text-to-speech'
const SARVAM_KEY = process.env.SARVAM_API_KEY ?? ''

const MAX_CHUNK_CHARS = 500

const ALLOWED_SPEAKERS = new Set([
  'meera', 'pavithra', 'maitreyi', 'aroha', 'dia',
  'arvind', 'amol', 'amartya', 'neel',
])

const ALLOWED_LANG_CODES = new Set([
  'en-IN', 'hi-IN', 'bn-IN', 'kn-IN', 'ml-IN',
  'mr-IN', 'ta-IN', 'te-IN', 'gu-IN', 'pa-IN', 'od-IN',
])

export async function POST(req: NextRequest) {
  const user = await getRequestUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!SARVAM_KEY) {
    return NextResponse.json({ error: 'TTS not configured' }, { status: 503 })
  }

  let text: string
  let speaker: string
  let languageCode: string

  try {
    const body = await req.json()
    text         = String(body.text ?? '').trim().slice(0, 1000)
    speaker      = ALLOWED_SPEAKERS.has(body.speaker) ? body.speaker : 'meera'
    languageCode = ALLOWED_LANG_CODES.has(body.languageCode) ? body.languageCode : 'en-IN'
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const chunks = splitIntoChunks(text, MAX_CHUNK_CHARS)

  try {
    const sarvamRes = await fetch(SARVAM_URL, {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_KEY,
        'Content-Type': 'application/json',
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
        model: 'bulbul:v1',
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!sarvamRes.ok) {
      const errText = await sarvamRes.text()
      console.error('[TTS] Sarvam error', sarvamRes.status, errText)
      return NextResponse.json({ error: 'TTS provider error' }, { status: 502 })
    }

    const data = await sarvamRes.json()
    const audios: string[] = data.audios ?? []

    if (!audios.length) {
      return NextResponse.json({ error: 'No audio returned' }, { status: 502 })
    }

    const wavBuffer = mergeWavBase64(audios)

    return new NextResponse(wavBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': wavBuffer.byteLength.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    console.error('[TTS] Fetch error:', err)
    return NextResponse.json({ error: 'TTS request failed' }, { status: 502 })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function splitIntoChunks(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]

  const chunks: string[] = []
  const sentences = text.split(/(?<=[.!?])\s+/)
  let current = ''

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence
    if (candidate.length <= maxChars) {
      current = candidate
    } else {
      if (current) chunks.push(current.trim())
      current = sentence.length > maxChars ? hardCut(sentence, maxChars) : sentence
    }
  }
  if (current) chunks.push(current.trim())

  // Sarvam allows max 3 inputs per request
  return chunks.filter(Boolean).slice(0, 3)
}

function hardCut(text: string, maxChars: number): string {
  const cut = text.slice(0, maxChars)
  const lastSpace = cut.lastIndexOf(' ')
  return lastSpace > 0 ? cut.slice(0, lastSpace) : cut
}

/**
 * Merge multiple base64-encoded WAV buffers into one continuous WAV.
 * Strips the 44-byte header from all chunks except the first, then
 * patches the RIFF and data chunk sizes in the merged header.
 */
function mergeWavBase64(base64Audios: string[]): ArrayBuffer {
  const buffers = base64Audios.map((b64) => {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  })

  if (buffers.length === 1) return buffers[0].buffer

  const WAV_HEADER = 44
  const totalBytes = buffers.reduce(
    (sum, buf, i) => sum + (i === 0 ? buf.length : buf.length - WAV_HEADER),
    0,
  )

  const merged = new Uint8Array(totalBytes)
  let offset = 0

  for (let i = 0; i < buffers.length; i++) {
    const start = i === 0 ? 0 : WAV_HEADER
    merged.set(buffers[i].slice(start), offset)
    offset += buffers[i].length - (i === 0 ? 0 : WAV_HEADER)
  }

  // Patch WAV header sizes
  const view = new DataView(merged.buffer)
  view.setUint32(4,  totalBytes - 8,             true) // RIFF chunk size
  view.setUint32(40, totalBytes - WAV_HEADER,     true) // data chunk size

  return merged.buffer
}
