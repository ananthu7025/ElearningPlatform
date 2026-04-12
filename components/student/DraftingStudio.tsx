'use client'

/**
 * DraftingStudio — full-screen drafting workspace for CASE_DRAFTING and CONTRACT_DRAFTING.
 * Matches the ledx UI: sticky nav, paper editor, collapsible brief sidebar, AI assistant offcanvas.
 */

import { useState, useRef } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Report {
  overallScore: number
  grade: string
  summary: string
  issuesCovered?: string[]
  issuesMissed?: string[]
  clausesCovered?: string[]
  clausesMissed?: string[]
  structureScore: number
  legalAccuracyScore: number
  languageScore: number
  strengths: string[]
  improvements: string[]
  recommendation: string
}

interface Scenario {
  id: string
  title: string
  description: string
  moduleType: string
  difficulty: string
  caseType?: string | null
  caseId?: string | null
  content: Record<string, unknown> | null
}

interface Props {
  scenario: Scenario
}

// ── Grade color helper ─────────────────────────────────────────────────────────

const GRADE_COLOR: Record<string, string> = {
  Distinction: 'success',
  Merit:       'primary',
  Pass:        'warning',
  Fail:        'danger',
}

// ── Evaluation Result ─────────────────────────────────────────────────────────

function EvaluationResult({ report, moduleType }: { report: Report; moduleType: string }) {
  const isCaseDraft  = moduleType === 'CASE_DRAFTING'
  const coveredLabel = isCaseDraft ? 'Issues covered' : 'Clauses covered'
  const missedLabel  = isCaseDraft ? 'Issues missed'  : 'Clauses missed'
  const covered = report.issuesCovered ?? report.clausesCovered ?? []
  const missed  = report.issuesMissed  ?? report.clausesMissed  ?? []
  const color   = GRADE_COLOR[report.grade] ?? 'secondary'

  return (
    <div className="container-fluid px-2">
      <div className="row g-4 align-items-start">

        {/* Score */}
        <div className="col-auto d-flex align-items-center gap-3">
          <div className={`avatar bg-label-${color} rounded`} style={{ width: 64, height: 64 }}>
            <span className="avatar-initial fw-bold fs-4">{report.overallScore}</span>
          </div>
          <div>
            <p className="mb-0 fw-bold fs-6">{report.overallScore}/100</p>
            <span className={`badge bg-label-${color} mb-1`}>{report.grade}</span>
            <p className="mb-0 text-body-secondary small">AI evaluation</p>
          </div>
        </div>

        {/* Sub-scores */}
        <div className="col-auto">
          <div className="d-flex gap-4">
            {[
              { label: 'Structure',      val: report.structureScore },
              { label: 'Legal Accuracy', val: report.legalAccuracyScore },
              { label: 'Language',       val: report.languageScore },
            ].map(({ label, val }) => (
              <div key={label} className="text-center">
                <p className="mb-0 fw-bold">{val}<small className="text-body-secondary fw-normal">/100</small></p>
                <small className="text-body-secondary">{label}</small>
              </div>
            ))}
          </div>
        </div>

        {/* Covered / Missed */}
        <div className="col">
          <div className="row g-3">
            {covered.length > 0 && (
              <div className="col-md-6">
                <p className="mb-1 small fw-semibold text-success">
                  <i className="ti tabler-circle-check me-1" />{coveredLabel}
                </p>
                <ul className="mb-0 ps-3 small">
                  {covered.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            )}
            {missed.length > 0 && (
              <div className="col-md-6">
                <p className="mb-1 small fw-semibold text-danger">
                  <i className="ti tabler-circle-x me-1" />{missedLabel}
                </p>
                <ul className="mb-0 ps-3 small">
                  {missed.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {report.summary && (
          <div className="col-12">
            <div className="alert alert-primary mb-0 py-2 small">
              <i className="ti tabler-bulb me-1" />
              <strong>Recommendation: </strong>{report.recommendation ?? report.summary}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DraftingStudio({ scenario }: Props) {
  const isCaseDraft = scenario.moduleType === 'CASE_DRAFTING'
  const c = (scenario.content ?? {}) as Record<string, unknown>

  // Extract scenario fields
  const facts          = Array.isArray(c.facts)          ? (c.facts          as string[]) : []
  const issues         = Array.isArray(c.issues)         ? (c.issues         as string[]) : []
  const applicableLaw  = Array.isArray(c.applicableLaw)  ? (c.applicableLaw  as string[]) : []
  const requiredClauses= Array.isArray(c.requiredClauses)? (c.requiredClauses as string[]) : []
  const instructions   = typeof c.instructions === 'string' ? c.instructions  : ''
  const brief          = typeof c.brief        === 'string' ? c.brief          : null
  const contractType   = typeof c.contractType === 'string' ? c.contractType   : null
  const partyA         = typeof c.partyA       === 'string' ? c.partyA         : null
  const partyB         = typeof c.partyB       === 'string' ? c.partyB         : null
  const background     = typeof c.background   === 'string' ? c.background     : null

  const checklistItems = isCaseDraft ? issues : requiredClauses
  const accentColor    = isCaseDraft ? 'primary' : 'warning'

  // ── State ──
  const [briefOpen,    setBriefOpen]    = useState(true)
  const [checkedItems, setCheckedItems] = useState<boolean[]>(new Array(checklistItems.length).fill(false))
  const [draftText,    setDraftText]    = useState('')
  const [step, setStep] = useState<'drafting' | 'submitting' | 'evaluating' | 'results'>('drafting')
  const [report, setReport] = useState<Report | null>(null)

  // Chat state
  const [chatMessages,  setChatMessages]  = useState<Message[]>([])
  const [chatInput,     setChatInput]     = useState('')
  const [chatStreaming,  setChatStreaming] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  const wordCount = draftText.split(/\s+/).filter(Boolean).length

  // ── Submit / Evaluate ──────────────────────────────────────────────────────

  async function handleFinalize() {
    if (draftText.trim().length < 20) return
    setStep('submitting')

    try {
      const res = await api.post('/practice-lab/submissions', {
        scenarioId: scenario.id,
        content: draftText,
      })
      const submissionId = res.data.submission.id
      setStep('evaluating')

      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000))
        try {
          const poll = await api.get(`/practice-lab/submissions/${submissionId}`)
          const sub = poll.data.submission
          if ((sub.tutorScore ?? sub.aiScore) != null) {
            const fb = sub.aiFeedback
            if (fb && typeof fb === 'object' && !Array.isArray(fb)) {
              setReport(fb as Report)
            }
            setStep('results')
            return
          }
        } catch {}
      }
      setStep('results')
    } catch {
      setStep('drafting')
      window.alert('Submission failed. Please try again.')
    }
  }

  // ── AI Chat ────────────────────────────────────────────────────────────────

  async function sendChat() {
    const text = chatInput.trim()
    if (!text || chatStreaming) return

    const newMessages: Message[] = [...chatMessages, { role: 'user', content: text }]
    setChatMessages(newMessages)
    setChatInput('')
    setChatStreaming(true)
    setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch(
        `/api/practice-lab/scenarios/${scenario.id}/drafting?action=chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draftText, messages: newMessages }),
          credentials: 'include',
        }
      )

      if (!res.ok || !res.body) {
        setChatMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong.' }
          return next
        })
        setChatStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break
          try {
            const { content } = JSON.parse(payload)
            if (content) {
              setChatMessages((prev) => {
                const next = [...prev]
                next[next.length - 1] = {
                  role: 'assistant',
                  content: next[next.length - 1].content + content,
                }
                return next
              })
              chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
            }
          } catch {}
        }
      }
    } catch {
      setChatMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: 'Connection error. Please try again.' }
        return next
      })
    } finally {
      setChatStreaming(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: '#f1f1f2', overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .paper-studio {
          background-color: #fff;
          box-shadow: 0 10px 40px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.1);
          width: 100%; max-width: 850px; margin: 40px auto; min-height: 1056px;
          position: relative; border-radius: 4px;
          padding: 80px ${isCaseDraft ? '80px 80px 120px' : '80px'};
        }
        .legal-margin { position: absolute; left: 80px; top: 0; bottom: 0; width: 1px; border-left: 1px solid rgba(220,53,69,0.3); }
        .editor-textarea { width: 100%; border: none; outline: none; resize: none; font-family: 'Times New Roman', serif; font-size: 1.1rem; line-height: 2.2; color: #2c3e50; background: transparent; min-height: 900px; }
        .studio-glass { backdrop-filter: blur(10px); background: rgba(255,255,255,0.85); }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .brief-item { transition: all 0.2s ease; border: 1px solid transparent; cursor: pointer; }
        .brief-item:hover { background: rgba(var(--bs-primary-rgb),0.05); border-color: rgba(var(--bs-primary-rgb),0.1); }
        @keyframes pulse-ai { 0%{transform:scale(1);box-shadow:0 0 0 0 rgba(115,103,240,0.4);} 70%{transform:scale(1.05);box-shadow:0 0 0 10px rgba(115,103,240,0);} 100%{transform:scale(1);box-shadow:0 0 0 0 rgba(115,103,240,0);} }
        @keyframes pulse-ai-warn { 0%{transform:scale(1);box-shadow:0 0 0 0 rgba(255,159,67,0.4);} 70%{transform:scale(1.05);box-shadow:0 0 0 10px rgba(255,159,67,0);} 100%{transform:scale(1);box-shadow:0 0 0 0 rgba(255,159,67,0);} }
      ` }} />

      {/* ══ Top Nav ══════════════════════════════════════════════════════════ */}
      <nav
        className="sticky-top studio-glass border-bottom shadow-sm d-flex align-items-center justify-content-between px-4"
        style={{ height: 64, zIndex: 100 }}
      >
        <div className="d-flex align-items-center gap-3">
          <Link href="/student/practice-lab" className="btn btn-icon btn-text-secondary rounded-pill" title="Back to Practice Lab">
            <i className="ti tabler-chevron-left fs-4" />
          </Link>
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className={`badge bg-label-${accentColor}`} style={{ fontSize: 10 }}>
                <i className={`ti ${isCaseDraft ? 'tabler-edit' : 'tabler-clipboard-text'} me-1`} />
                {isCaseDraft ? 'Case Drafting' : 'Contract Drafting'}
              </span>
              {scenario.caseId && <span className="badge bg-label-secondary" style={{ fontSize: 10 }}>{scenario.caseId}</span>}
              <span className={`badge bg-label-${scenario.difficulty === 'HARD' ? 'danger' : scenario.difficulty === 'MEDIUM' ? 'warning' : 'success'}`} style={{ fontSize: 10 }}>
                {scenario.difficulty}
              </span>
            </div>
            <h6 className="mb-0 fw-bold text-truncate" style={{ maxWidth: 320, fontSize: 14 }}>{scenario.title}</h6>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <div className="d-none d-md-block text-end pe-3 border-end">
            <p className="mb-0 small fw-semibold">{wordCount} words</p>
            <p className="mb-0 text-body-secondary" style={{ fontSize: 11 }}>
              {step === 'drafting'   ? 'In progress'
               : step === 'submitting' ? 'Submitting…'
               : step === 'evaluating' ? 'AI evaluating…'
               : 'Evaluated'}
            </p>
          </div>

          {step === 'drafting' && (
            <button
              className={`btn btn-${accentColor} btn-sm px-4 shadow-sm`}
              onClick={handleFinalize}
              disabled={wordCount < 5}
            >
              <i className="ti tabler-check me-1" />Submit for Evaluation
            </button>
          )}
          {step === 'submitting' && (
            <button className="btn btn-secondary btn-sm px-4" disabled>
              <span className="spinner-border spinner-border-sm me-2" />Submitting…
            </button>
          )}
          {step === 'evaluating' && (
            <button className="btn btn-info btn-sm px-4" disabled>
              <span className="spinner-border spinner-border-sm me-2" />AI Evaluating…
            </button>
          )}
          {step === 'results' && (
            <span className={`badge bg-label-success px-3 py-2 fw-semibold`}>
              <i className="ti tabler-check me-1" />Evaluated
            </span>
          )}
        </div>
      </nav>

      {/* ══ Body ═════════════════════════════════════════════════════════════ */}
      <div className="d-flex flex-grow-1 overflow-hidden">

        {/* ── Left Sidebar ── */}
        <aside
          className="studio-glass border-end d-flex flex-column flex-shrink-0 custom-scrollbar overflow-auto"
          style={{
            width:    briefOpen ? 300 : 0,
            minWidth: briefOpen ? 300 : 0,
            opacity:  briefOpen ? 1 : 0,
            transition: 'width 0.25s ease, min-width 0.25s ease, opacity 0.2s ease',
            overflow: 'hidden',
          }}
        >
          <div className="p-4" style={{ minWidth: 300 }}>

            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h6 className="mb-0 fw-bold text-uppercase small" style={{ letterSpacing: 0.5 }}>
                <i className={`ti tabler-notes text-${accentColor} me-2`} />Drafting Brief
              </h6>
              <span className="badge bg-label-secondary" style={{ fontSize: 10 }}>
                {isCaseDraft ? 'Criminal / Civil' : contractType ?? 'Contract'}
              </span>
            </div>

            {/* Facts / Background card */}
            <div className="card shadow-none border-0 bg-body-tertiary mb-4">
              <div className="card-body p-3">
                <p className="fw-bold text-uppercase mb-2" style={{ fontSize: 10, letterSpacing: 0.5 }}>
                  {isCaseDraft ? 'Case Facts' : 'Scenario Background'}
                </p>
                {isCaseDraft ? (
                  <>
                    {brief && <p className="small fst-italic text-body-secondary mb-2 lh-base">{brief}</p>}
                    <ul className="small mb-0 ps-3 lh-base" style={{ lineHeight: 1.8 }}>
                      {facts.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </>
                ) : (
                  <>
                    <div className="row g-2 mb-2">
                      {partyA && (
                        <div className="col-6">
                          <span className="text-body-secondary d-block" style={{ fontSize: 10 }}>Party A</span>
                          <span className="small fw-semibold">{partyA}</span>
                        </div>
                      )}
                      {partyB && (
                        <div className="col-6">
                          <span className="text-body-secondary d-block" style={{ fontSize: 10 }}>Party B</span>
                          <span className="small fw-semibold">{partyB}</span>
                        </div>
                      )}
                    </div>
                    {background && <p className="small mb-0 lh-base">{background}</p>}
                  </>
                )}
              </div>
            </div>

            {/* Checklist */}
            {checklistItems.length > 0 && (
              <div className="mb-4">
                <p className="fw-bold text-uppercase mb-3 opacity-75" style={{ fontSize: 10, letterSpacing: 0.5 }}>
                  {isCaseDraft ? 'Legal Issues to Address' : 'Required Clauses'}
                </p>
                {checklistItems.map((item, i) => (
                  <div
                    key={i}
                    className={`brief-item rounded p-2 mb-1 d-flex gap-2 align-items-start ${checkedItems[i] ? 'opacity-50' : ''}`}
                    onClick={() => {
                      const next = [...checkedItems]
                      next[i] = !next[i]
                      setCheckedItems(next)
                    }}
                  >
                    <div
                      className={`mt-1 flex-shrink-0 d-flex align-items-center justify-content-center rounded-circle border ${checkedItems[i] ? `bg-${accentColor} border-${accentColor}` : 'border-secondary'}`}
                      style={{ width: 14, height: 14 }}
                    >
                      {checkedItems[i] && <i className="ti tabler-check text-white" style={{ fontSize: 9 }} />}
                    </div>
                    <span className={`small lh-base ${checkedItems[i] ? 'text-decoration-line-through text-body-secondary' : 'text-heading'}`}>{item}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Applicable law */}
            {applicableLaw.length > 0 && (
              <div className="p-3 bg-white rounded border shadow-sm mb-4">
                <p className="fw-bold text-uppercase mb-2 opacity-75" style={{ fontSize: 10, letterSpacing: 0.5 }}>
                  {isCaseDraft ? 'Applicable Law' : 'Legal Framework'}
                </p>
                <div className="d-flex flex-wrap gap-1">
                  {applicableLaw.map((l, i) => (
                    <span key={i} className="badge bg-label-secondary" style={{ fontSize: 10, lineHeight: 1.6, whiteSpace: 'normal', textAlign: 'left' }}>{l}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {instructions && (
              <div className={`alert alert-label-${accentColor} p-3 mb-0 border-0`}>
                <p className="fw-bold mb-1" style={{ fontSize: 10 }}>
                  <i className="ti tabler-bulb me-1" />Instructions
                </p>
                <p className="small mb-0 lh-base opacity-75">{instructions}</p>
              </div>
            )}
          </div>
        </aside>

        {/* Sidebar toggle strip */}
        <div
          className="d-flex align-items-center justify-content-center bg-white border-end shadow-sm"
          style={{ width: 20, cursor: 'pointer', zIndex: 10, flexShrink: 0 }}
          onClick={() => setBriefOpen(!briefOpen)}
          title={briefOpen ? 'Collapse brief' : 'Expand brief'}
        >
          <i className={`ti ${briefOpen ? 'tabler-chevron-left' : 'tabler-chevron-right'} text-body-secondary`} style={{ fontSize: 13 }} />
        </div>

        {/* ── Main: Paper Editor ── */}
        <main className="flex-grow-1 overflow-auto custom-scrollbar d-flex flex-column align-items-center pb-5" style={{ background: '#f1f1f2' }}>

          {/* Evaluation result banner */}
          {step === 'results' && report && (
            <div className="w-100 border-bottom bg-white">
              <div className="p-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <i className={`ti tabler-chart-bar text-${GRADE_COLOR[report.grade] ?? 'primary'} fs-5`} />
                  <h6 className="mb-0 fw-bold">AI Evaluation Result</h6>
                </div>
                <EvaluationResult report={report} moduleType={scenario.moduleType} />
              </div>
            </div>
          )}

          {/* Evaluating spinner */}
          {step === 'evaluating' && (
            <div className="w-100 py-3 px-4 border-bottom bg-white d-flex align-items-center gap-3">
              <div className="spinner-border spinner-border-sm text-info" />
              <span className="small text-body-secondary">AI is evaluating your draft — this usually takes 10–15 seconds…</span>
            </div>
          )}

          {/* Paper document */}
          <div className="paper-studio">
            {isCaseDraft && <div className="legal-margin" />}
            <textarea
              className="editor-textarea"
              placeholder={isCaseDraft
                ? "Begin drafting your case document…\n\nIN THE HON'BLE HIGH COURT OF JUDICATURE AT ___\n\n[Party Name]                   ...Petitioner / Applicant\nVERSUS\n[Party Name]                   ...Respondent"
                : 'Begin drafting your contract…\n\nTHIS AGREEMENT is entered into on [Date], by and between:\n\n[Party A Name] ("Party A")\nAND\n[Party B Name] ("Party B")'}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              disabled={step !== 'drafting'}
            />
          </div>
        </main>

        {/* ══ AI Offcanvas ═════════════════════════════════════════════════════ */}
        <div
          className="offcanvas offcanvas-end studio-glass shadow-lg"
          tabIndex={-1}
          id="offcanvasDraftingAI"
          style={{ width: 390, borderLeft: `1px solid rgba(var(--bs-${accentColor}-rgb), 0.15)` }}
        >
          <div className="offcanvas-header border-bottom py-3">
            <div className="d-flex align-items-center gap-2">
              <div className="avatar avatar-sm">
                <span className={`avatar-initial rounded-circle bg-${accentColor}`}>
                  <i className="ti tabler-robot text-white" />
                </span>
              </div>
              <div>
                <h6 className="mb-0 fw-bold">LexAI Drafting Assistant</h6>
                <small className="text-body-secondary">Ask about your draft</small>
              </div>
            </div>
            <button type="button" className="btn-close" data-bs-dismiss="offcanvas" />
          </div>

          <div className="offcanvas-body p-0 d-flex flex-column">
            {/* Messages */}
            <div className="flex-grow-1 overflow-auto p-4 custom-scrollbar">
              {chatMessages.length === 0 && (
                <div className={`bg-label-${accentColor} p-3 rounded-3 mb-3`} style={{ borderBottomLeftRadius: 0 }}>
                  <p className={`small fw-bold text-${accentColor} mb-1`}>LexAI</p>
                  <p className="small mb-0 lh-base">
                    I'm here to help with your <strong>{isCaseDraft ? 'case draft' : 'contract draft'}</strong>.
                    Ask me about legal issues, structure, specific clauses, or how to improve what you've written.
                  </p>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`d-flex mb-3 ${m.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                  <div
                    className={`px-3 py-2 rounded small ${m.role === 'user' ? 'bg-primary text-white' : 'bg-body-tertiary text-body'}`}
                    style={{ maxWidth: '85%', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}
                  >
                    {m.content || (chatStreaming && i === chatMessages.length - 1 ? (
                      <span className="d-flex gap-1 align-items-center">
                        <span className="spinner-grow spinner-grow-sm opacity-50" />
                        <span className="spinner-grow spinner-grow-sm opacity-50" style={{ animationDelay: '0.15s' }} />
                        <span className="spinner-grow spinner-grow-sm opacity-50" style={{ animationDelay: '0.3s' }} />
                      </span>
                    ) : '')}
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-top studio-glass">
              <div className="input-group shadow-sm border rounded-pill overflow-hidden bg-white">
                <span className="input-group-text border-0 ps-3 bg-transparent">
                  <i className="ti tabler-message-2 text-body-secondary" />
                </span>
                <input
                  className="form-control border-0 shadow-none small py-2"
                  placeholder="Ask about your draft… (Enter to send)"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) sendChat() }}
                  disabled={chatStreaming}
                />
                <button
                  className="btn btn-sm border-0 pe-3 bg-transparent"
                  onClick={sendChat}
                  disabled={!chatInput.trim() || chatStreaming}
                >
                  <i className={`ti ${chatStreaming ? 'tabler-loader-2' : 'tabler-send'} text-${accentColor}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Floating AI Button ════════════════════════════════════════════════ */}
      <button
        className={`btn btn-${accentColor} rounded-pill shadow-lg d-flex align-items-center gap-2 position-fixed`}
        style={{
          bottom: '2rem', right: '2rem',
          padding: '0.75rem 1.4rem',
          zIndex: 1040,
          animation: `pulse-ai${isCaseDraft ? '' : '-warn'} 2s infinite`,
        }}
        data-bs-toggle="offcanvas"
        data-bs-target="#offcanvasDraftingAI"
      >
        <i className="ti tabler-sparkles fs-5" />
        <span className="fw-bold small">Drafting Assistant</span>
      </button>
    </div>
  )
}
