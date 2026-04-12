'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'

// ── types ─────────────────────────────────────────────────────────────────────

type Step = 'BRIEFING' | 'CONSULTATION' | 'REVIEWING' | 'RESULTS'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Report {
  overallScore: number
  grade: string
  summary: string
  factsDiscovered: string[]
  factsMissed: string[]
  strengths: string[]
  improvements: string[]
  communicationScore: number
  legalAwarenessScore: number
  empathyScore: number
  recommendation: string
}

interface Scenario {
  id: string
  title: string
  description: string
  clientName: string | null
  caseType: string | null
  caseId: string | null
  content: {
    facts?: string[]
    provisions?: string[]
    brief?: string
  } | null
}

interface Props {
  scenario: Scenario
}

const MAX_TURNS = 18

// ── helpers ───────────────────────────────────────────────────────────────────

/** Pick a consistent Sarvam speaker voice based on the client's name. */
function resolveVoice(name: string): string {
  const lower = name.toLowerCase()
  const femininePatterns = [
    'priya','ananya','divya','pooja','neha','sunita','kavita','rekha','meena',
    'asha','sita','gita','lata','nandita','padma','usha','radha','lakshmi',
    'sarita','vandana','mrs','ms.','miss','smt',
  ]
  const isFeminine = femininePatterns.some((p) => lower.includes(p))
  const female = ['anushka','manisha','vidya','arya','ritu'] as const
  const male   = ['abhilash','karun','hitesh','aditya']      as const
  const hash   = lower.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return isFeminine ? female[hash % female.length] : male[hash % male.length]
}

function gradeColor(grade: string) {
  if (grade === 'Distinction') return 'success'
  if (grade === 'Merit') return 'info'
  if (grade === 'Pass') return 'warning'
  return 'danger'
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between mb-1">
        <small className="fw-semibold text-heading">{label}</small>
        <small className={`fw-semibold text-${color}`}>{value}%</small>
      </div>
      <div className="progress" style={{ height: 6 }}>
        <div
          className={`progress-bar bg-${color}`}
          style={{ width: `${value}%`, transition: 'width 1s ease' }}
        />
      </div>
    </div>
  )
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ClientInterviewChat({ scenario }: Props) {
  const content = scenario.content ?? {}
  const facts      = Array.isArray(content.facts)      ? content.facts      : []
  const provisions = Array.isArray(content.provisions) ? content.provisions : []
  const brief      = typeof content.brief === 'string' ? content.brief      : ''
  const clientName = scenario.clientName ?? 'Client'
  const initials   = clientName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  const [step,     setStep]     = useState<Step>('BRIEFING')
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [turns,    setTurns]    = useState(MAX_TURNS)
  const [typing,   setTyping]   = useState(false)
  const [notepad,  setNotepad]  = useState('')
  const [report,   setReport]   = useState<Report | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [speaking,     setSpeaking]     = useState(false)

  const bottomRef    = useRef<HTMLDivElement>(null)
  const audioCtxRef  = useRef<AudioContext | null>(null)
  const audioQueue   = useRef<Promise<void>>(Promise.resolve())
  const accessToken  = useAuthStore((s) => s.accessToken)

  // Auto-scroll chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => { audioCtxRef.current?.close() }
  }, [])

  // ── TTS helpers ────────────────────────────────────────────────────────────

  async function fetchTtsAudio(text: string): Promise<ArrayBuffer | null> {
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: accessToken ? `Bearer ${accessToken}` : '',
        },
        body: JSON.stringify({ text, speaker: resolveVoice(clientName) }),
      })
      if (!res.ok) return null
      return await res.arrayBuffer()
    } catch {
      return null
    }
  }

  async function playAudioBuffer(buffer: ArrayBuffer): Promise<void> {
    return new Promise((resolve) => {
      try {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new AudioContext()
        }
        const ctx = audioCtxRef.current
        ctx.decodeAudioData(
          buffer,
          (decoded) => {
            const source = ctx.createBufferSource()
            source.buffer = decoded
            source.connect(ctx.destination)
            source.onended = () => resolve()
            source.start(0)
          },
          () => resolve(),
        )
      } catch {
        resolve()
      }
    })
  }

  function speakReply(text: string) {
    if (!voiceEnabled || !text.trim()) return
    audioQueue.current = audioQueue.current.then(async () => {
      setSpeaking(true)
      const buffer = await fetchTtsAudio(text)
      if (buffer) await playAudioBuffer(buffer)
      setSpeaking(false)
    })
  }

  // ── fetch SSE reply from AI service ────────────────────────────────────────

  async function fetchReply(msgs: Message[]): Promise<string> {
    const res = await fetch(`/api/practice-lab/scenarios/${scenario.id}/interview`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   accessToken ? `Bearer ${accessToken}` : '',
      },
      body: JSON.stringify({ messages: msgs, generateReport: false }),
    })

    if (!res.ok || !res.body) throw new Error('AI service error')

    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''

    // Stream tokens into the last (assistant) message as they arrive
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') break
        try {
          const { content: token } = JSON.parse(data)
          if (token) {
            full += token
            setMessages((prev) => {
              const next = [...prev]
              next[next.length - 1] = { role: 'assistant', content: full }
              return next
            })
          }
        } catch { /* ignore parse errors */ }
      }
    }

    return full
  }

  // ── start interview — get opening message ───────────────────────────────────

  async function startInterview() {
    setStep('CONSULTATION')
    setTyping(true)
    try {
      const reply = await fetchReply([])
      speakReply(reply)
    } catch {
      setMessages([{ role: 'assistant', content: "Hi, I'm glad you could see me. I'm not sure where to begin…" }])
    } finally {
      setTyping(false)
    }
  }

  // ── send student message ────────────────────────────────────────────────────

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
      const reply = await fetchReply(updated)
      speakReply(reply)
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Sorry, I didn't catch that. Could you say it again?" },
      ])
    } finally {
      setTyping(false)
    }
  }

  // ── end interview → generate report ────────────────────────────────────────

  async function handleEndInterview() {
    setStep('REVIEWING')
    try {
      const res = await fetch(`/api/practice-lab/scenarios/${scenario.id}/interview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  accessToken ? `Bearer ${accessToken}` : '',
        },
        body: JSON.stringify({ messages, generateReport: true }),
      })
      const data = await res.json()
      setReport(data.report ?? null)
    } catch {
      setReport(null)
    } finally {
      setStep('RESULTS')
    }
  }

  // ── save submission to DB ───────────────────────────────────────────────────

  async function saveSubmission() {
    setSaving(true)
    try {
      const content = JSON.stringify({
        messages,
        report,
        turnsUsed: MAX_TURNS - turns,
      })
      await api.post('/practice-lab/submissions', {
        scenarioId: scenario.id,
        content,
      })
      setSaved(true)
    } catch {
      alert('Could not save submission. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── SCREEN 1: BRIEFING ──────────────────────────────────────────────────────

  if (step === 'BRIEFING') {
    return (
      <>
        {/* hero */}
        <div className="card p-0 mb-4">
          <div className="card-body d-flex align-items-center p-0 overflow-hidden" style={{ minHeight: 84 }}>
            <div className="flex-grow-1 px-5 py-4">
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge bg-label-primary"  style={{ fontSize: 10 }}>CLIENT_INTERVIEW</span>
                <span className="badge bg-label-success"  style={{ fontSize: 10 }}>AI Powered</span>
              </div>
              <h5 className="mb-0 text-heading fw-semibold">{scenario.title}</h5>
              <p className="mb-0 text-body-secondary small mt-1">{scenario.description}</p>
            </div>
            <div className="d-none d-md-flex align-items-end flex-shrink-0 pe-4" style={{ minWidth: 90 }}>
              <img src="/img/illustrations/girl-sitting-with-laptop.png" alt="" height={90} style={{ objectFit: 'contain' }} />
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* client profile */}
          <div className="col-lg-4">
            <div className="card h-100">
              <div className="card-header border-0 pb-0">
                <h6 className="mb-0 d-flex align-items-center gap-2">
                  <i className="ti tabler-user-circle text-success fs-5" />
                  Client Profile
                </h6>
              </div>
              <div className="card-body">
                <div className="d-flex align-items-center gap-3 mb-4 p-3 rounded-2 bg-label-success">
                  <div className="avatar avatar-lg flex-shrink-0">
                    <span className="avatar-initial rounded-circle bg-success text-white fw-bold" style={{ fontSize: 18 }}>
                      {initials}
                    </span>
                  </div>
                  <div>
                    <h6 className="mb-0 fw-bold text-heading">{clientName}</h6>
                    {scenario.caseType && <small className="text-body-secondary">{scenario.caseType}</small>}
                    {scenario.caseId && (
                      <div className="mt-1">
                        <span className="badge bg-label-secondary" style={{ fontSize: 10 }}>{scenario.caseId}</span>
                      </div>
                    )}
                  </div>
                </div>

                {brief && <p className="small text-body-secondary mb-4">{brief}</p>}

                <div className="d-flex flex-column gap-2">
                  {[
                    { icon: 'tabler-message-chatbot', label: `${MAX_TURNS} Message Turns`,  sub: 'Maximise fact discovery',            color: 'primary' },
                    { icon: 'tabler-brain',            label: 'AI Client',                   sub: 'Powered by Groq LLaMA 3',            color: 'info'    },
                    { icon: 'tabler-gavel',            label: 'Statutory Mapping',           sub: 'Identify relevant legal provisions', color: 'warning' },
                  ].map((item) => (
                    <div key={item.label} className="d-flex align-items-center gap-3 p-2 rounded-2 border">
                      <div className="avatar avatar-sm flex-shrink-0">
                        <span className={`avatar-initial rounded bg-label-${item.color}`}>
                          <i className={`icon-base ti ${item.icon} icon-16px`} style={{ color: `var(--bs-${item.color})` }} />
                        </span>
                      </div>
                      <div>
                        <p className="mb-0 small fw-semibold text-heading">{item.label}</p>
                        <small className="text-body-secondary" style={{ fontSize: 10 }}>{item.sub}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* strategy + CTA */}
          <div className="col-lg-8">
            <div className="card h-100">
              <div className="card-header border-0 pb-0">
                <h6 className="mb-0 d-flex align-items-center gap-2">
                  <i className="ti tabler-clipboard-text text-primary fs-5" />
                  Pre-Interview Strategy
                </h6>
              </div>
              <div className="card-body d-flex flex-column">

                {/* key facts to discover */}
                {facts.length > 0 && (
                  <div className="mb-4">
                    <p className="text-uppercase fw-semibold text-body-secondary mb-2" style={{ fontSize: 10, letterSpacing: '.06em' }}>
                      Key Areas to Explore
                    </p>
                    <div className="d-flex flex-wrap gap-2">
                      {facts.map((f, i) => (
                        <span key={i} className="badge bg-label-secondary" style={{ fontSize: 11 }}>
                          <i className="icon-base ti tabler-search icon-10px me-1" />{f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* provisions */}
                {provisions.length > 0 && (
                  <div className="mb-4">
                    <p className="text-uppercase fw-semibold text-body-secondary mb-2" style={{ fontSize: 10, letterSpacing: '.06em' }}>
                      Relevant Legal Areas
                    </p>
                    <div className="d-flex flex-wrap gap-2">
                      {provisions.map((p, i) => (
                        <span key={i} className="badge bg-label-primary" style={{ fontSize: 11 }}>{p}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex-grow-1" />

                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <button
                    className="btn btn-success d-flex align-items-center gap-2 px-5"
                    onClick={startInterview}
                  >
                    <i className="icon-base ti tabler-player-play-filled icon-16px" />
                    Start Interview
                  </button>
                  <Link href="/practice-lab" className="btn btn-label-secondary d-flex align-items-center gap-2">
                    <i className="icon-base ti tabler-arrow-left icon-14px" />
                    Back to Lab
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── SCREEN 2: CONSULTATION ──────────────────────────────────────────────────

  // Derive turn number for each assistant message
  const assistantTurns = messages.reduce((acc, m, i) => {
    if (m.role === 'assistant') acc.push(i)
    return acc
  }, [] as number[])

  if (step === 'CONSULTATION') {
    return (
      <div className="app-chat card overflow-hidden border-0 shadow-sm">
        <div className="row g-0" style={{ minHeight: '82vh' }}>

          {/* ── LEFT: Chat panel ───────────────────────────────────────────── */}
          <div className="col-lg-7 app-chat-history d-flex flex-column border-end">
            <div className="chat-history-wrapper d-flex flex-column h-100">

              {/* ── Header ── */}
              <div className="chat-history-header px-4 py-3 border-bottom">
                <div className="d-flex align-items-center justify-content-between gap-3">

                  {/* Client identity + live status */}
                  <div className="d-flex align-items-center gap-3 flex-shrink-0">
                    {/* Avatar — pulses green when speaking */}
                    <div className="position-relative flex-shrink-0">
                      <div
                        className={`avatar avatar-md ${speaking ? 'avatar-speaking' : ''}`}
                        style={{ transition: 'box-shadow .3s' }}
                      >
                        <span
                          className="avatar-initial rounded-circle bg-success text-white fw-bold"
                          style={{ fontSize: 15 }}
                        >
                          {initials}
                        </span>
                      </div>
                      {/* Online dot */}
                      <span
                        className="position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle"
                        style={{ width: 10, height: 10 }}
                      />
                    </div>

                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <h6 className="mb-0 fw-semibold text-heading" style={{ fontSize: 14 }}>
                          {clientName}
                        </h6>
                        <span className="badge bg-label-success" style={{ fontSize: 9 }}>AI Client</span>
                      </div>

                      {/* Dynamic status line */}
                      <div className="d-flex align-items-center gap-1 mt-1" style={{ minHeight: 16 }}>
                        {speaking && !typing ? (
                          <>
                            <span className="d-flex align-items-end gap-1" style={{ height: 14 }}>
                              {[0, 150, 300].map((d) => (
                                <span key={d} className="tts-bar" style={{ animationDelay: `${d}ms` }} />
                              ))}
                            </span>
                            <small className="text-success fw-semibold" style={{ fontSize: 10 }}>
                              Speaking…
                            </small>
                          </>
                        ) : typing ? (
                          <>
                            <span className="spinner-grow spinner-grow-sm text-success" style={{ width: 8, height: 8 }} />
                            <small className="text-body-secondary" style={{ fontSize: 10 }}>Typing…</small>
                          </>
                        ) : (
                          <small className="text-body-secondary" style={{ fontSize: 10 }}>
                            {scenario.caseType ?? 'Client Interview'}
                          </small>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right controls */}
                  <div className="d-flex align-items-center gap-2 ms-auto">

                    {/* Turns badge */}
                    <div className="d-none d-md-flex flex-column align-items-end" style={{ minWidth: 130 }}>
                      <div className="d-flex align-items-center gap-1 mb-1">
                        <i className={`icon-base ti tabler-messages icon-12px ${turns <= 5 ? 'text-danger' : 'text-body-secondary'}`} />
                        <small className={`fw-semibold ${turns <= 5 ? 'text-danger' : 'text-body-secondary'}`} style={{ fontSize: 10 }}>
                          {turns} turns left
                        </small>
                      </div>
                      <div className="progress rounded-pill" style={{ height: 4, width: 130 }}>
                        <div
                          className={`progress-bar rounded-pill ${turns <= 5 ? 'bg-danger' : 'bg-success'}`}
                          style={{ width: `${(turns / MAX_TURNS) * 100}%`, transition: 'width .4s' }}
                        />
                      </div>
                    </div>

                    {/* Voice toggle */}
                    <button
                      type="button"
                      onClick={() => setVoiceEnabled((v) => !v)}
                      title={voiceEnabled ? 'Mute AI voice' : 'Unmute AI voice'}
                      className={`btn btn-sm d-flex align-items-center gap-1 px-2 ${
                        voiceEnabled ? 'btn-label-success' : 'btn-label-secondary'
                      }`}
                      style={{ fontSize: 11 }}
                    >
                      <i className={`icon-base ti ${voiceEnabled ? 'tabler-volume' : 'tabler-volume-off'} icon-14px`} />
                      <span className="d-none d-lg-inline">{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
                    </button>

                    {/* End interview */}
                    <button
                      className="btn btn-sm btn-primary d-flex align-items-center gap-1 px-3"
                      onClick={handleEndInterview}
                      disabled={typing || messages.length === 0}
                      style={{ fontSize: 11 }}
                    >
                      <i className="icon-base ti tabler-checklist icon-14px" />
                      <span className="d-none d-md-inline">End Interview</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Messages ── */}
              <div className="chat-history-body flex-grow-1 overflow-auto">
                <ul
                  className="list-unstyled chat-history mb-0"
                  style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem 1.25rem' }}
                >
                  {messages.map((m, i) => {
                    const turnNum = assistantTurns.indexOf(i) + 1

                    return m.role === 'assistant' ? (
                      <li key={i} className="chat-message mb-4">
                        <div className="d-flex align-items-start gap-3">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            <div className="avatar avatar-sm">
                              <span
                                className="avatar-initial rounded-circle bg-success text-white fw-bold"
                                style={{ fontSize: 11 }}
                              >
                                {initials}
                              </span>
                            </div>
                          </div>
                          {/* Bubble */}
                          <div className="flex-grow-1" style={{ maxWidth: '85%' }}>
                            <div
                              className="rounded-3 px-3 py-2 small text-heading"
                              style={{
                                background: 'var(--bs-body-bg)',
                                border: '1px solid var(--bs-border-color)',
                                lineHeight: 1.65,
                                display: 'inline-block',
                                maxWidth: '100%',
                              }}
                            >
                              {m.content || (
                                <span className="d-flex align-items-center gap-2 text-body-secondary">
                                  <span className="spinner-grow spinner-grow-sm" style={{ width: 8, height: 8 }} />
                                  <span style={{ fontSize: 11 }}>Thinking…</span>
                                </span>
                              )}
                            </div>
                            {m.content && turnNum > 0 && (
                              <div className="interview-turn-label">
                                Turn {turnNum} of {MAX_TURNS}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ) : (
                      <li key={i} className="chat-message chat-message-right mb-4">
                        <div className="d-flex align-items-start justify-content-end gap-3">
                          {/* Bubble */}
                          <div style={{ maxWidth: '85%' }}>
                            <div
                              className="rounded-3 px-3 py-2 small text-white"
                              style={{
                                background: 'var(--bs-primary)',
                                lineHeight: 1.65,
                                display: 'inline-block',
                                maxWidth: '100%',
                              }}
                            >
                              {m.content}
                            </div>
                          </div>
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            <div className="avatar avatar-sm">
                              <span
                                className="avatar-initial rounded-circle bg-label-primary fw-bold"
                                style={{ fontSize: 10 }}
                              >
                                You
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}

                  <div ref={bottomRef} />
                </ul>
              </div>

              {/* ── Input footer ── */}
              <div className="chat-history-footer border-top px-4 py-3">
                <form
                  className="d-flex align-items-center gap-2"
                  onSubmit={(e) => { e.preventDefault(); handleSend() }}
                >
                  <input
                    className="form-control border rounded-pill px-4"
                    style={{ fontSize: 13 }}
                    placeholder={
                      turns === 0
                        ? 'No turns remaining — click End Interview'
                        : 'Ask the client a question…'
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                    }}
                    disabled={turns === 0 || typing}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary rounded-pill d-flex align-items-center gap-2 px-4 flex-shrink-0"
                    disabled={turns === 0 || typing || !input.trim()}
                    style={{ fontSize: 13 }}
                  >
                    {typing
                      ? <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} />
                      : <i className="icon-base ti tabler-send icon-14px" />
                    }
                    <span className="d-none d-sm-inline">Send</span>
                  </button>
                </form>

                <div className="d-flex align-items-center justify-content-between mt-2 px-1">
                  <small className="text-body-secondary" style={{ fontSize: 10 }}>
                    <kbd style={{ fontSize: 9, padding: '1px 5px', border: '1px solid currentColor', borderRadius: 3, opacity: .6 }}>
                      Enter ↵
                    </kbd>
                    {' '}to send
                  </small>
                  {/* Mobile turns counter */}
                  <small className={`d-md-none fw-semibold ${turns <= 5 ? 'text-danger' : 'text-body-secondary'}`} style={{ fontSize: 10 }}>
                    {turns} / {MAX_TURNS} turns
                  </small>
                  {voiceEnabled && (
                    <small className="d-none d-md-flex align-items-center gap-1 text-success" style={{ fontSize: 10 }}>
                      <i className="icon-base ti tabler-volume icon-10px" />
                      AI voice active
                    </small>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* ── RIGHT: Legal pad ───────────────────────────────────────────── */}
          <div className="col-lg-5 d-flex flex-column overflow-hidden">

            {/* Panel header */}
            <div
              className="px-4 d-flex align-items-center justify-content-between flex-shrink-0 border-bottom"
              style={{ height: 57 }}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="icon-base ti tabler-notes icon-16px text-warning" />
                <span className="fw-semibold text-heading" style={{ fontSize: 13 }}>
                  Clinician's Legal Pad
                </span>
              </div>
              <span className="badge bg-label-warning" style={{ fontSize: 9 }}>
                <i className="icon-base ti tabler-lock icon-10px me-1" />Confidential
              </span>
            </div>

            <div className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-3">

              {/* Case notes */}
              <div className="card border-0 shadow-none rounded-3" style={{ background: 'rgba(255,193,7,.04)' }}>
                <div className="card-header border-0 pb-0 bg-transparent">
                  <h6 className="mb-0 d-flex align-items-center gap-2" style={{ fontSize: 12 }}>
                    <i className="icon-base ti tabler-pencil icon-14px text-warning" />
                    Case Notes
                  </h6>
                </div>
                <div className="card-body pt-2">
                  <textarea
                    className="form-control border-0 shadow-none p-0"
                    rows={8}
                    placeholder="Jot down discovered facts and key observations…"
                    value={notepad}
                    onChange={(e) => setNotepad(e.target.value)}
                    style={{
                      resize: 'none',
                      fontSize: 13,
                      lineHeight: 1.9,
                      background: 'transparent',
                    }}
                  />
                </div>
              </div>

              {/* Provisions */}
              {provisions.length > 0 && (
                <div className="card border shadow-none rounded-3">
                  <div className="card-header border-0 pb-0">
                    <h6 className="mb-0 d-flex align-items-center gap-2" style={{ fontSize: 12 }}>
                      <i className="icon-base ti tabler-gavel icon-14px text-primary" />
                      Relevant Provisions
                    </h6>
                  </div>
                  <div className="card-body pt-2 d-flex flex-wrap gap-1">
                    {provisions.map((p, idx) => (
                      <span key={idx} className="badge bg-label-primary" style={{ fontSize: 10 }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Turns summary card */}
              <div className="card border shadow-none rounded-3">
                <div className="card-body py-3 px-4">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <small className="fw-semibold text-heading" style={{ fontSize: 11 }}>Interview Progress</small>
                    <span
                      className={`badge ${turns <= 5 ? 'bg-label-danger' : 'bg-label-success'}`}
                      style={{ fontSize: 10 }}
                    >
                      {MAX_TURNS - turns} / {MAX_TURNS} turns used
                    </span>
                  </div>
                  <div className="progress rounded-pill" style={{ height: 6 }}>
                    <div
                      className={`progress-bar rounded-pill ${turns <= 5 ? 'bg-danger' : 'bg-primary'}`}
                      style={{ width: `${((MAX_TURNS - turns) / MAX_TURNS) * 100}%`, transition: 'width .4s' }}
                    />
                  </div>
                  <small className="text-body-secondary mt-1 d-block" style={{ fontSize: 10 }}>
                    {turns === 0
                      ? 'All turns used — end the interview to see your report.'
                      : `${turns} turn${turns !== 1 ? 's' : ''} remaining to discover key facts.`}
                  </small>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    )
  }

  // ── SCREEN 3: REVIEWING ─────────────────────────────────────────────────────

  if (step === 'REVIEWING') {
    return (
      <div className="card" style={{ minHeight: '52vh' }}>
        <div className="card-body d-flex flex-column align-items-center justify-content-center text-center" style={{ padding: '5rem 2rem' }}>
          <div className="spinner-border text-primary mb-4" style={{ width: 56, height: 56, borderWidth: 3 }} />
          <h5 className="fw-semibold mb-2">Analysing Interview Performance…</h5>
          <p className="text-body-secondary small mb-0">AI is evaluating your consultation against the scenario facts.</p>
        </div>
      </div>
    )
  }

  // ── SCREEN 4: RESULTS ───────────────────────────────────────────────────────

  const color = report ? gradeColor(report.grade) : 'secondary'

  return (
    <>
      {/* score hero */}
      <div className="card mb-4 overflow-hidden">
        <div className="card-body p-0">
          <div className="d-flex flex-column flex-md-row">
            <div
              className="d-flex flex-column align-items-center justify-content-center p-5 text-white flex-shrink-0"
              style={{ background: `linear-gradient(135deg, var(--bs-${color}), var(--bs-${color}-darken-10, var(--bs-${color})))`, minWidth: 180 }}
            >
              <h1 className="display-3 fw-bold mb-0 text-white">{report?.overallScore ?? '—'}</h1>
              <small className="opacity-75 mt-1">Overall Score</small>
              {report && (
                <span className="badge bg-white mt-2" style={{ color: `var(--bs-${color})`, fontSize: 11 }}>
                  {report.grade}
                </span>
              )}
            </div>
            <div className="flex-grow-1 p-5">
              <span className="badge bg-label-success mb-2" style={{ fontSize: 10 }}>SIMULATION COMPLETE</span>
              <h5 className="fw-semibold mb-2">{report?.summary ?? 'Interview complete.'}</h5>
              {report && (
                <div className="d-flex flex-wrap gap-2 mt-3">
                  <span className="badge bg-label-warning d-flex align-items-center gap-1" style={{ fontSize: 11 }}>
                    <i className="icon-base ti tabler-messages icon-12px" />{MAX_TURNS - turns} turns used
                  </span>
                  <span className="badge bg-label-info d-flex align-items-center gap-1" style={{ fontSize: 11 }}>
                    <i className="icon-base ti tabler-check icon-12px" />{report.factsDiscovered?.length ?? 0} facts discovered
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {report && (
        <>
          {/* score breakdown */}
          <div className="row g-4 mb-4">
            <div className="col-lg-4">
              <div className="card h-100">
                <div className="card-header">
                  <h6 className="mb-0">Score Breakdown</h6>
                </div>
                <div className="card-body">
                  <ScoreBar label="Communication"   value={report.communicationScore}   color="primary" />
                  <ScoreBar label="Legal Awareness" value={report.legalAwarenessScore}  color="info"    />
                  <ScoreBar label="Empathy"          value={report.empathyScore}         color="success" />
                </div>
              </div>
            </div>

            <div className="col-lg-8">
              <div className="row g-4 h-100">
                {/* strengths */}
                <div className="col-md-6">
                  <div className="card h-100">
                    <div className="card-header d-flex align-items-center gap-2">
                      <i className="ti tabler-circle-check text-success fs-5" />
                      <h6 className="mb-0">Strengths</h6>
                    </div>
                    <div className="card-body p-0">
                      <ul className="list-group list-group-flush">
                        {(report.strengths ?? []).map((s, i) => (
                          <li key={i} className="list-group-item small py-2 px-4">{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* improvements */}
                <div className="col-md-6">
                  <div className="card h-100">
                    <div className="card-header d-flex align-items-center gap-2">
                      <i className="ti tabler-alert-triangle text-warning fs-5" />
                      <h6 className="mb-0">Areas to Improve</h6>
                    </div>
                    <div className="card-body p-0">
                      <ul className="list-group list-group-flush">
                        {(report.improvements ?? []).map((s, i) => (
                          <li key={i} className="list-group-item small py-2 px-4">{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* facts */}
          <div className="row g-4 mb-4">
            <div className="col-lg-6">
              <div className="card h-100">
                <div className="card-header">
                  <h6 className="mb-0 d-flex align-items-center gap-2">
                    <i className="ti tabler-circle-check text-success fs-5" />Facts Discovered
                  </h6>
                </div>
                <div className="card-body p-0">
                  <ul className="list-group list-group-flush">
                    {(report.factsDiscovered ?? []).map((f, i) => (
                      <li key={i} className="list-group-item small py-2 px-4">{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="card h-100">
                <div className="card-header">
                  <h6 className="mb-0 d-flex align-items-center gap-2">
                    <i className="ti tabler-alert-triangle text-warning fs-5" />Missed Opportunities
                  </h6>
                </div>
                <div className="card-body p-0">
                  <ul className="list-group list-group-flush">
                    {(report.factsMissed ?? []).map((f, i) => (
                      <li key={i} className="list-group-item small py-2 px-4 text-body-secondary">{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* recommendation */}
          <div className="card mb-4">
            <div className="card-header">
              <h6 className="mb-0 d-flex align-items-center gap-2">
                <i className="ti tabler-bulb text-warning fs-5" />Tutor Recommendation
              </h6>
            </div>
            <div className="card-body">
              <p className="mb-0 small">{report.recommendation}</p>
            </div>
          </div>
        </>
      )}

      {/* CTA */}
      <div className="card">
        <div className="card-body d-flex flex-wrap gap-3 justify-content-center py-4">
          {!saved ? (
            <button
              className="btn btn-primary d-flex align-items-center gap-2 px-5"
              onClick={saveSubmission}
              disabled={saving}
            >
              {saving && <span className="spinner-border spinner-border-sm me-1" />}
              <i className="icon-base ti tabler-device-floppy icon-16px" />
              Save Result
            </button>
          ) : (
            <span className="badge bg-label-success fs-6 px-4 py-2">
              <i className="icon-base ti tabler-check icon-16px me-1" />Saved
            </span>
          )}
          <button
            className="btn btn-label-secondary d-flex align-items-center gap-2 px-4"
            onClick={() => { setStep('BRIEFING'); setMessages([]); setTurns(MAX_TURNS); setReport(null); setSaved(false); setNotepad('') }}
          >
            <i className="icon-base ti tabler-reload icon-16px" />
            Restart
          </button>
          <Link href="/practice-lab" className="btn btn-label-secondary d-flex align-items-center gap-2 px-4">
            <i className="icon-base ti tabler-arrow-left icon-14px" />
            Back to Lab
          </Link>
        </div>
      </div>
    </>
  )
}
