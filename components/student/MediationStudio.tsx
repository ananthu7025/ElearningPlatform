'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

// ── types ──────────────────────────────────────────────────────────────────────

type Step = 'BRIEFING' | 'SESSION' | 'REVIEWING' | 'RESULTS'
type AddressedTo = 'partyA' | 'partyB' | 'both'
type Phase = 'Opening' | 'Exploration' | 'Bargaining' | 'Resolution'

interface Message {
  role: 'user' | 'assistant'
  content: string
  addressedTo?: AddressedTo
}

interface Party {
  name: string
  role: string
  position: string
  interests: string
  facts: string[]
}

interface ScenarioContent {
  mode?: 'mediation' | 'arbitration'
  disputeType?: string
  background?: string
  partyA?: Partial<Party>
  partyB?: Partial<Party>
  applicableLaw?: string[]
  instructions?: string
}

interface Scenario {
  id: string
  title: string
  description: string | null
  content: ScenarioContent | null
}

interface EvalReport {
  overallScore: number
  grade: string
  summary: string
  neutralityScore: number
  issueIdentificationScore: number
  activeListeningScore: number
  processManagementScore: number
  resolutionQualityScore: number
  strengths: string[]
  improvements: string[]
  recommendation: string
}

interface Props {
  scenario: Scenario
}

// ── constants ─────────────────────────────────────────────────────────────────

const PHASES: Phase[] = ['Opening', 'Exploration', 'Bargaining', 'Resolution']
const MAX_TURNS = 20

// ── helpers ───────────────────────────────────────────────────────────────────

function gradeColor(grade: string) {
  if (grade === 'Distinction') return 'success'
  if (grade === 'Merit')       return 'info'
  if (grade === 'Pass')        return 'warning'
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

function toParty(raw: Partial<Party> | undefined): Party {
  return {
    name:      raw?.name      ?? 'Party',
    role:      raw?.role      ?? '',
    position:  raw?.position  ?? '',
    interests: raw?.interests ?? '',
    facts:     Array.isArray(raw?.facts) ? raw!.facts! : [],
  }
}

function addressLabel(to: AddressedTo, partyA: Party, partyB: Party) {
  if (to === 'partyA') return partyA.name
  if (to === 'partyB') return partyB.name
  return 'Both parties'
}

// ── component ─────────────────────────────────────────────────────────────────

export default function MediationStudio({ scenario }: Props) {
  const c       = scenario.content ?? {}
  const mode    = c.mode === 'arbitration' ? 'arbitration' : 'mediation'
  const partyA  = toParty(c.partyA)
  const partyB  = toParty(c.partyB)
  const laws    = Array.isArray(c.applicableLaw) ? c.applicableLaw : []
  const instruc = c.instructions ?? null

  const modeLabel = mode === 'arbitration' ? 'Arbitration' : 'Mediation'
  const modeIcon  = mode === 'arbitration' ? 'tabler-gavel' : 'tabler-handshake'
  const endLabel  = mode === 'arbitration' ? 'Issue Award' : 'Reach Settlement'

  const [step,        setStep]        = useState<Step>('BRIEFING')
  const [phase,       setPhase]       = useState<Phase>('Opening')
  const [messages,    setMessages]    = useState<Message[]>([])
  const [input,       setInput]       = useState('')
  const [addressedTo, setAddressedTo] = useState<AddressedTo>('both')
  const [turns,       setTurns]       = useState(MAX_TURNS)
  const [streaming,   setStreaming]   = useState(false)
  const [report,      setReport]      = useState<EvalReport | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  // ── SSE chat ───────────────────────────────────────────────────────────────

  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming) return

    const newMsg: Message = { role: 'user', content: text, addressedTo }
    const nextMessages = [...messages, newMsg]
    setMessages(nextMessages)
    setInput('')
    setTurns((t) => t - 1)
    setStreaming(true)

    // Placeholder for the streaming reply
    const replyIndex = nextMessages.length
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    // Strip empty-content or error placeholder messages before sending — they
    // break the Zod min(1) validation and add noise to the AI context.
    const apiMessages = nextMessages.filter(
      (m) => m.content.trim().length > 0 && m.content !== 'An error occurred. Please try again.'
    )

    let reply = ''

    try {
      const res = await fetch(`/api/practice-lab/scenarios/${scenario.id}/mediation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: apiMessages, addressedTo, generateReport: false }),
      })

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`)
        console.error('[MediationStudio] chat API error', res.status, errText)
        throw new Error(`HTTP ${res.status}: ${errText}`)
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') break
          try {
            const parsed = JSON.parse(payload)
            const delta  = parsed?.content ?? parsed?.choices?.[0]?.delta?.content ?? parsed?.text ?? ''
            if (delta) {
              reply += delta
              setMessages((prev) => {
                const updated = [...prev]
                updated[replyIndex] = { role: 'assistant', content: reply }
                return updated
              })
            }
          } catch (parseErr) {
            console.warn('[MediationStudio] malformed SSE chunk:', parseErr)
          }
        }
      }
    } catch (err) {
      console.error('[MediationStudio] sendMessage failed:', err)
      setMessages((prev) => {
        const updated = [...prev]
        updated[replyIndex] = {
          role:    'assistant',
          content: 'An error occurred. Please try again.',
        }
        return updated
      })
    } finally {
      // If stream finished with no content, replace the empty placeholder so it
      // doesn't corrupt the Zod min(1) validation on the next request.
      setMessages((prev) => {
        const updated = [...prev]
        if (updated[replyIndex]?.content === '') {
          console.warn('[MediationStudio] stream produced no content — showing error placeholder')
          updated[replyIndex] = {
            role:    'assistant',
            content: 'An error occurred. Please try again.',
          }
        }
        return updated
      })
      setStreaming(false)
    }
  }

  // ── end session & generate report ─────────────────────────────────────────

  async function endSession() {
    setStep('REVIEWING')
    setReportError(null)
    try {
      const validMessages = messages.filter(
        (m) => m.content.trim().length > 0 && m.content !== 'An error occurred. Please try again.'
      )
      const res = await fetch(`/api/practice-lab/scenarios/${scenario.id}/mediation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: validMessages, addressedTo: 'both', generateReport: true }),
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`)
        console.error('[MediationStudio] report API error', res.status, errText)
        throw new Error(`HTTP ${res.status}: ${errText}`)
      }
      const data = await res.json()
      console.log('[MediationStudio] report received:', data)
      setReport(data.report ?? data)
      setStep('RESULTS')
    } catch (err) {
      console.error('[MediationStudio] endSession failed:', err)
      setReportError('Could not generate your evaluation. Please try again.')
      setStep('SESSION')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── phase advancement ──────────────────────────────────────────────────────

  function advancePhase() {
    const idx = PHASES.indexOf(phase)
    if (idx < PHASES.length - 1) setPhase(PHASES[idx + 1])
  }

  // ── BRIEFING step ──────────────────────────────────────────────────────────

  if (step === 'BRIEFING') {
    return (
      <div className="container-fluid py-4" style={{ maxWidth: 880 }}>
        {/* header */}
        <div className="d-flex align-items-center gap-3 mb-4">
          <div className="avatar">
            <span className="avatar-initial rounded bg-label-primary">
              <i className={`ti ${modeIcon}`} style={{ fontSize: 20 }} />
            </span>
          </div>
          <div>
            <h5 className="mb-0">{scenario.title}</h5>
            <small className="text-body-secondary">{modeLabel} Simulation</small>
          </div>
          <Link href="/practice-lab" className="btn btn-outline-secondary btn-sm ms-auto">
            <i className="ti tabler-arrow-left me-1" />Back
          </Link>
        </div>

        {/* case overview */}
        <div className="card mb-4">
          <div className="card-header">
            <h6 className="mb-0">
              <i className="ti tabler-file-description me-2 text-primary" />Case Overview
            </h6>
          </div>
          <div className="card-body">
            {c.disputeType && (
              <div className="mb-2">
                <span className="badge bg-label-warning me-2">{c.disputeType}</span>
                <span className="badge bg-label-info">{modeLabel}</span>
              </div>
            )}
            {c.background && <p className="mb-0 text-body-secondary">{c.background}</p>}
          </div>
        </div>

        {/* parties */}
        <div className="row g-4 mb-4">
          {([['partyA', partyA, 'primary'], ['partyB', partyB, 'danger']] as const).map(
            ([key, party, color]) => (
              <div key={key} className="col-md-6">
                <div className={`card border-${color} h-100`}>
                  <div className={`card-header bg-label-${color} d-flex align-items-center gap-2`}>
                    <div className="avatar avatar-sm">
                      <span className={`avatar-initial rounded-circle bg-${color} text-white fw-bold`} style={{ fontSize: 12 }}>
                        {party.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="fw-semibold text-heading">{party.name}</div>
                      {party.role && <small className="text-body-secondary">{party.role}</small>}
                    </div>
                  </div>
                  <div className="card-body">
                    {party.position && (
                      <div className="mb-3">
                        <small className="fw-semibold text-uppercase text-body-secondary d-block mb-1">Position</small>
                        <p className="mb-0 small">{party.position}</p>
                      </div>
                    )}
                    {party.interests && (
                      <div className="mb-3">
                        <small className="fw-semibold text-uppercase text-body-secondary d-block mb-1">Underlying Interests</small>
                        <p className="mb-0 small text-body-secondary">{party.interests}</p>
                      </div>
                    )}
                    {party.facts.length > 0 && (
                      <div>
                        <small className="fw-semibold text-uppercase text-body-secondary d-block mb-1">Known Facts</small>
                        <ul className="mb-0 ps-3 small">
                          {party.facts.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* applicable law & instructions */}
        {(laws.length > 0 || instruc) && (
          <div className="card mb-4">
            <div className="card-body">
              {laws.length > 0 && (
                <div className="mb-3">
                  <small className="fw-semibold text-uppercase text-body-secondary d-block mb-2">Applicable Law</small>
                  <div className="d-flex flex-wrap gap-2">
                    {laws.map((l, i) => <span key={i} className="badge bg-label-secondary">{l}</span>)}
                  </div>
                </div>
              )}
              {instruc && (
                <div>
                  <small className="fw-semibold text-uppercase text-body-secondary d-block mb-1">Your Instructions</small>
                  <p className="mb-0 small">{instruc}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* role reminder */}
        <div className="alert alert-primary d-flex gap-3 align-items-start mb-4">
          <i className="ti tabler-info-circle mt-1 flex-shrink-0" style={{ fontSize: 20 }} />
          <div>
            <div className="fw-semibold mb-1">Your role: Neutral {modeLabel === 'Arbitration' ? 'Arbitrator' : 'Mediator'}</div>
            <small>
              {mode === 'mediation'
                ? 'Facilitate dialogue between the parties. Help them identify common ground and guide them toward a mutually acceptable settlement. Do not take sides.'
                : 'Hear each party\'s submissions, probe the merits, and issue a reasoned award at the end of the session. Remain impartial throughout.'}
            </small>
          </div>
        </div>

        <button className="btn btn-primary" onClick={() => setStep('SESSION')}>
          <i className="ti tabler-player-play me-2" />Begin {modeLabel} Session
        </button>
      </div>
    )
  }

  // ── REVIEWING step ─────────────────────────────────────────────────────────

  if (step === 'REVIEWING') {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary mb-3" style={{ width: 48, height: 48 }} />
        <h6 className="text-heading">Evaluating your session…</h6>
        <small className="text-body-secondary">Our AI is reviewing your {modeLabel.toLowerCase()} approach</small>
      </div>
    )
  }

  // ── RESULTS step ───────────────────────────────────────────────────────────

  if (step === 'RESULTS' && report) {
    const scoreColor = report.overallScore >= 75 ? 'success' : report.overallScore >= 55 ? 'warning' : 'danger'
    const gc = gradeColor(report.grade)

    return (
      <div className="container-fluid py-4" style={{ maxWidth: 820 }}>
        {/* grade banner */}
        <div className={`card border-${gc} mb-4`}>
          <div className={`card-body bg-label-${gc} text-center py-4`}>
            <div className={`display-4 fw-bold text-${gc}`}>{report.overallScore}%</div>
            <span className={`badge bg-${gc} fs-6 mt-2`}>{report.grade}</span>
            <p className="mt-3 mb-0 text-heading">{report.summary}</p>
          </div>
        </div>

        {/* score breakdown */}
        <div className="card mb-4">
          <div className="card-header"><h6 className="mb-0">Evaluation Breakdown</h6></div>
          <div className="card-body">
            <ScoreBar label="Neutrality"           value={report.neutralityScore}           color={report.neutralityScore >= 70 ? 'success' : 'warning'} />
            <ScoreBar label="Issue Identification" value={report.issueIdentificationScore}  color={report.issueIdentificationScore >= 70 ? 'success' : 'warning'} />
            <ScoreBar label="Active Listening"     value={report.activeListeningScore}       color={report.activeListeningScore >= 70 ? 'success' : 'warning'} />
            <ScoreBar label="Process Management"   value={report.processManagementScore}     color={report.processManagementScore >= 70 ? 'success' : 'warning'} />
            <ScoreBar label={mode === 'arbitration' ? 'Award Quality' : 'Settlement Quality'} value={report.resolutionQualityScore} color={report.resolutionQualityScore >= 70 ? 'success' : 'warning'} />
          </div>
        </div>

        {/* strengths / improvements */}
        <div className="row g-4 mb-4">
          <div className="col-md-6">
            <div className="card h-100 border-success">
              <div className="card-header bg-label-success">
                <h6 className="mb-0 text-success"><i className="ti tabler-circle-check me-2" />Strengths</h6>
              </div>
              <ul className="list-group list-group-flush">
                {report.strengths.map((s, i) => (
                  <li key={i} className="list-group-item small">{s}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100 border-warning">
              <div className="card-header bg-label-warning">
                <h6 className="mb-0 text-warning"><i className="ti tabler-bulb me-2" />Areas to Improve</h6>
              </div>
              <ul className="list-group list-group-flush">
                {report.improvements.map((s, i) => (
                  <li key={i} className="list-group-item small">{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* recommendation */}
        {report.recommendation && (
          <div className="alert alert-info d-flex gap-3 align-items-start mb-4">
            <i className="ti tabler-bulb mt-1 flex-shrink-0" style={{ fontSize: 20 }} />
            <div>
              <div className="fw-semibold mb-1">Recommendation</div>
              <small>{report.recommendation}</small>
            </div>
          </div>
        )}

        <div className="d-flex gap-3">
          <Link href="/practice-lab" className="btn btn-outline-secondary">
            <i className="ti tabler-arrow-left me-2" />All Scenarios
          </Link>
          <button className="btn btn-primary" onClick={() => {
            setStep('BRIEFING')
            setMessages([])
            setTurns(MAX_TURNS)
            setReport(null)
            setPhase('Opening')
          }}>
            <i className="ti tabler-refresh me-2" />Try Again
          </button>
        </div>
      </div>
    )
  }

  // ── SESSION step ───────────────────────────────────────────────────────────

  const phaseIdx = PHASES.indexOf(phase)

  return (
    <div className="d-flex flex-column" style={{ height: '100dvh', overflow: 'hidden' }}>

      {/* top bar */}
      <div className="d-flex align-items-center gap-3 px-4 py-2 border-bottom bg-paper flex-shrink-0">
        <div className="avatar avatar-sm">
          <span className="avatar-initial rounded bg-label-primary">
            <i className={`ti ${modeIcon}`} style={{ fontSize: 16 }} />
          </span>
        </div>
        <div className="me-auto">
          <div className="fw-semibold text-heading" style={{ fontSize: 14 }}>{scenario.title}</div>
          <small className="text-body-secondary">{modeLabel} · {c.disputeType ?? 'Dispute'}</small>
        </div>

        {/* phase stepper */}
        <div className="d-none d-md-flex align-items-center gap-1">
          {PHASES.map((p, i) => (
            <span
              key={p}
              className={`badge ${i < phaseIdx ? 'bg-success' : i === phaseIdx ? 'bg-primary' : 'bg-label-secondary'}`}
              style={{ fontSize: 11 }}
            >
              {p}
            </span>
          ))}
        </div>

        <button
          className="btn btn-outline-secondary btn-sm"
          title="Advance to next phase"
          onClick={advancePhase}
          disabled={phaseIdx === PHASES.length - 1}
        >
          <i className="ti tabler-chevrons-right" />
        </button>

        <span className="badge bg-label-warning" style={{ fontSize: 11 }}>
          {turns} turns left
        </span>

        <button
          className="btn btn-danger btn-sm"
          onClick={endSession}
          disabled={messages.length < 2}
          title={endLabel}
        >
          <i className="ti tabler-flag-3 me-1" />{endLabel}
        </button>
      </div>

      {/* main area: party sidebar + chat */}
      <div className="d-flex flex-grow-1 overflow-hidden">

        {/* party sidebar */}
        <div className="border-end p-3 d-none d-lg-flex flex-column gap-3" style={{ width: 220, overflowY: 'auto' }}>
          {([['partyA', partyA, 'primary'], ['partyB', partyB, 'danger']] as const).map(
            ([key, party, color]) => (
              <div
                key={key}
                className={`card border-${color} cursor-pointer mb-0`}
                style={{ cursor: 'pointer' }}
                onClick={() => setAddressedTo(key as AddressedTo)}
              >
                <div className={`card-body p-3 ${addressedTo === key ? `bg-label-${color}` : ''}`}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="avatar avatar-xs">
                      <span className={`avatar-initial rounded-circle bg-${color} text-white`} style={{ fontSize: 10, fontWeight: 700 }}>
                        {party.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="fw-semibold text-heading" style={{ fontSize: 12 }}>{party.name}</div>
                      {party.role && <div className="text-body-secondary" style={{ fontSize: 11 }}>{party.role}</div>}
                    </div>
                  </div>
                  <p className="mb-0 text-body-secondary" style={{ fontSize: 11 }}>{party.position}</p>
                </div>
              </div>
            )
          )}

          {/* session info */}
          <div className="mt-auto">
            {laws.length > 0 && (
              <div>
                <small className="text-body-secondary fw-semibold d-block mb-1">Applicable Law</small>
                {laws.map((l, i) => (
                  <div key={i} className="badge bg-label-secondary w-100 text-start mb-1" style={{ fontSize: 10, whiteSpace: 'normal' }}>{l}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* chat transcript */}
        <div className="flex-grow-1 d-flex flex-column overflow-hidden">
          <div className="flex-grow-1 overflow-auto px-4 py-3">

            {messages.length === 0 && (
              <div className="text-center text-body-secondary py-5">
                <i className="ti tabler-message-circle" style={{ fontSize: 40 }} />
                <p className="mt-2 mb-0">Open the session — address a party or both to begin.</p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`d-flex mb-3 ${m.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                {m.role === 'assistant' && (
                  <div className="avatar avatar-sm me-2 flex-shrink-0 align-self-end">
                    <span className="avatar-initial rounded-circle bg-label-secondary">
                      <i className="ti tabler-robot" style={{ fontSize: 14 }} />
                    </span>
                  </div>
                )}
                <div
                  className={`rounded-3 px-3 py-2 ${m.role === 'user' ? 'bg-primary text-white' : 'bg-paper border'}`}
                  style={{ maxWidth: '70%', whiteSpace: 'pre-wrap', fontSize: 14 }}
                >
                  {m.role === 'user' && m.addressedTo && m.addressedTo !== 'both' && (
                    <div className={`mb-1 opacity-75`} style={{ fontSize: 11 }}>
                      → {m.addressedTo === 'partyA' ? partyA.name : partyB.name}
                    </div>
                  )}
                  {m.content || (streaming && i === messages.length - 1 ? (
                    <span className="placeholder-glow"><span className="placeholder col-8" /></span>
                  ) : '')}
                </div>
                {m.role === 'user' && (
                  <div className="avatar avatar-sm ms-2 flex-shrink-0 align-self-end">
                    <span className="avatar-initial rounded-circle bg-primary">
                      <i className="ti tabler-gavel" style={{ fontSize: 14 }} />
                    </span>
                  </div>
                )}
              </div>
            ))}

            <div ref={bottomRef} />
          </div>

          {/* error banner */}
          {reportError && (
            <div className="alert alert-danger mx-4 mb-2 py-2">
              <small>{reportError}</small>
            </div>
          )}

          {/* input bar */}
          <div className="border-top px-4 py-3 flex-shrink-0 bg-paper">
            {/* address-to selector */}
            <div className="d-flex gap-2 mb-2 flex-wrap">
              <small className="text-body-secondary align-self-center me-1">Address to:</small>
              {(['partyA', 'partyB', 'both'] as AddressedTo[]).map((opt) => (
                <button
                  key={opt}
                  className={`btn btn-sm ${addressedTo === opt ? 'btn-primary' : 'btn-outline-secondary'}`}
                  style={{ fontSize: 12, padding: '2px 10px' }}
                  onClick={() => setAddressedTo(opt)}
                >
                  {opt === 'partyA' ? partyA.name : opt === 'partyB' ? partyB.name : 'Both Parties'}
                </button>
              ))}
              <small className="text-body-secondary align-self-center ms-auto d-none d-md-block">
                Phase: <span className="fw-semibold text-primary">{phase}</span>
              </small>
            </div>

            {turns === 0 ? (
              <div className="alert alert-warning py-2 mb-0 d-flex align-items-center justify-content-between">
                <small>You have used all your turns.</small>
                <button className="btn btn-warning btn-sm" onClick={endSession}>
                  <i className="ti tabler-flag-3 me-1" />{endLabel}
                </button>
              </div>
            ) : (
              <div className="d-flex gap-2">
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder={`Speak to ${addressLabel(addressedTo, partyA, partyB)}…`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={streaming}
                  style={{ resize: 'none', fontSize: 14 }}
                />
                <button
                  className="btn btn-primary align-self-end"
                  onClick={sendMessage}
                  disabled={!input.trim() || streaming}
                >
                  {streaming
                    ? <span className="spinner-border spinner-border-sm" />
                    : <i className="ti tabler-send" />
                  }
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
