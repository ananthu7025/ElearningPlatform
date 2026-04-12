'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useQuery, useMutation } from 'react-query'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'
import ClientInterviewChat from '@/components/student/ClientInterviewChat'
import DraftingChat from '@/components/student/DraftingChat'

const DRAFTING_TYPES = ['CASE_DRAFTING', 'CONTRACT_DRAFTING']

// ── Scenario content renderers ────────────────────────────────────────────────

function CaseDraftBody({ s }: { s: any }) {
  const c = s.content ?? {}
  const facts = Array.isArray(c.facts) ? c.facts : []
  const issues = Array.isArray(c.issues) ? c.issues : []
  const law = Array.isArray(c.applicableLaw) ? c.applicableLaw : []
  const instructions = typeof c.instructions === 'string' ? c.instructions : ''
  const brief = typeof c.brief === 'string' ? c.brief : null

  return (
    <div className="small" style={{ lineHeight: 1.8 }}>
      <p className="mb-3">{s.description}</p>
      {brief && <p className="mb-3 fst-italic text-body-secondary">{brief}</p>}

      {facts.length > 0 && (
        <div className="mb-4">
          <span className="fw-semibold d-block mb-2">
            <i className="ti tabler-file-description me-1 text-primary" />Facts
          </span>
          <ul className="mb-0 ps-3">
            {facts.map((f: string, i: number) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}

      {issues.length > 0 && (
        <div className="mb-4">
          <span className="fw-semibold d-block mb-2">
            <i className="ti tabler-scale me-1 text-warning" />Legal issues to address
          </span>
          <ul className="mb-0 ps-3">
            {issues.map((issue: string, i: number) => <li key={i}>{issue}</li>)}
          </ul>
        </div>
      )}

      {law.length > 0 && (
        <div className="mb-4">
          <span className="fw-semibold d-block mb-2">
            <i className="ti tabler-book me-1 text-info" />Applicable law / provisions
          </span>
          <ul className="mb-0 ps-3">
            {law.map((l: string, i: number) => <li key={i}>{l}</li>)}
          </ul>
        </div>
      )}

      {instructions && (
        <div className="alert alert-primary mb-0 small py-2">
          <i className="ti tabler-info-circle me-1" />
          <strong>Instructions: </strong>{instructions}
        </div>
      )}
    </div>
  )
}

function ContractDraftBody({ s }: { s: any }) {
  const c = s.content ?? {}
  const clauses = Array.isArray(c.requiredClauses) ? c.requiredClauses : []
  const instructions = typeof c.instructions === 'string' ? c.instructions : ''

  return (
    <div className="small" style={{ lineHeight: 1.8 }}>
      <p className="mb-3">{s.description}</p>

      <div className="row g-3 mb-4">
        {c.contractType && (
          <div className="col-sm-6">
            <span className="text-body-secondary d-block">Contract type</span>
            <span className="fw-semibold">{c.contractType}</span>
          </div>
        )}
        {s.caseId && (
          <div className="col-sm-6">
            <span className="text-body-secondary d-block">Reference</span>
            <span className="fw-semibold">{s.caseId}</span>
          </div>
        )}
        {c.partyA && (
          <div className="col-sm-6">
            <span className="text-body-secondary d-block">Party A</span>
            <span className="fw-semibold">{c.partyA}</span>
          </div>
        )}
        {c.partyB && (
          <div className="col-sm-6">
            <span className="text-body-secondary d-block">Party B</span>
            <span className="fw-semibold">{c.partyB}</span>
          </div>
        )}
      </div>

      {c.background && (
        <div className="mb-4">
          <span className="fw-semibold d-block mb-2">
            <i className="ti tabler-file-text me-1 text-primary" />Background
          </span>
          <p className="mb-0">{c.background}</p>
        </div>
      )}

      {clauses.length > 0 && (
        <div className="mb-4">
          <span className="fw-semibold d-block mb-2">
            <i className="ti tabler-checklist me-1 text-success" />Required clauses
          </span>
          <ul className="mb-0 ps-3">
            {clauses.map((cl: string, i: number) => <li key={i}>{cl}</li>)}
          </ul>
        </div>
      )}

      {instructions && (
        <div className="alert alert-primary mb-0 small py-2">
          <i className="ti tabler-info-circle me-1" />
          <strong>Instructions: </strong>{instructions}
        </div>
      )}
    </div>
  )
}

function ClientInterviewBody({ s }: { s: any }) {
  const c = s.content ?? {}
  const facts = Array.isArray(c.facts) ? c.facts : []
  const provisions = Array.isArray(c.provisions) ? c.provisions : []
  const brief = typeof c.brief === 'string' ? c.brief : null
  return (
    <div className="small" style={{ lineHeight: 1.8 }}>
      <p className="mb-3">{s.description}</p>
      {brief && <p className="mb-3">{brief}</p>}
      {facts.length > 0 && (
        <div className="mb-3">
          <span className="fw-semibold d-block mb-2">Facts</span>
          <ul className="mb-0 ps-3">
            {facts.map((f: string, i: number) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}
      {provisions.length > 0 && (
        <div>
          <span className="fw-semibold d-block mb-2">Legal points / provisions</span>
          <ul className="mb-0 ps-3">
            {provisions.map((p: string, i: number) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

function ScenarioBody({ s }: { s: any }) {
  if (s.moduleType === 'CASE_DRAFTING') return <CaseDraftBody s={s} />
  if (s.moduleType === 'CONTRACT_DRAFTING') return <ContractDraftBody s={s} />
  if (s.moduleType === 'CLIENT_INTERVIEW') return <ClientInterviewBody s={s} />
  const c = s.content
  if (typeof c === 'string') return <p className="mb-0 small" style={{ lineHeight: 1.8 }}>{c}</p>
  return <p className="mb-0 small text-body-secondary">{s.description || 'No scenario content.'}</p>
}

// ── AI feedback renderer ──────────────────────────────────────────────────────

function DraftingFeedback({ report, moduleType }: { report: any; moduleType: string }) {
  const isCaseDraft = moduleType === 'CASE_DRAFTING'
  const coveredLabel = isCaseDraft ? 'Issues covered' : 'Clauses covered'
  const missedLabel  = isCaseDraft ? 'Issues missed'  : 'Clauses missed'
  const covered = report?.issuesCovered ?? report?.clausesCovered ?? []
  const missed  = report?.issuesMissed  ?? report?.clausesMissed  ?? []

  const gradeColor: Record<string, string> = {
    Distinction: 'success',
    Merit:       'primary',
    Pass:        'warning',
    Fail:        'danger',
  }
  const color = gradeColor[report?.grade] ?? 'secondary'

  return (
    <div>
      {/* Score header */}
      <div className="d-flex align-items-center gap-4 mb-4">
        <div className={`avatar bg-label-${color} rounded`} style={{ width: 56, height: 56 }}>
          <span className="avatar-initial fw-bold fs-5">{report?.overallScore ?? '–'}</span>
        </div>
        <div>
          <span className="fw-semibold d-block fs-6">Score: {report?.overallScore ?? '–'}/100</span>
          <span className={`badge bg-label-${color}`}>{report?.grade ?? 'Evaluated'}</span>
          <small className="text-body-secondary d-block mt-1">AI evaluation</small>
        </div>
      </div>

      {/* Summary */}
      {report?.summary && (
        <div className="bg-body-tertiary rounded p-3 mb-4 small">{report.summary}</div>
      )}

      {/* Sub-scores */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Structure',      val: report?.structureScore },
          { label: 'Legal accuracy', val: report?.legalAccuracyScore },
          { label: 'Language',       val: report?.languageScore },
        ].map(({ label, val }) => val != null && (
          <div key={label} className="col-4 text-center">
            <div className="fw-semibold">{val}<small className="text-body-secondary">/100</small></div>
            <small className="text-body-secondary">{label}</small>
          </div>
        ))}
      </div>

      {/* Covered / Missed */}
      <div className="row g-3 mb-4">
        {covered.length > 0 && (
          <div className="col-md-6">
            <p className="fw-semibold small mb-2 text-success">
              <i className="ti tabler-circle-check me-1" />{coveredLabel}
            </p>
            <ul className="small ps-3 mb-0">
              {covered.map((x: string, i: number) => <li key={i}>{x}</li>)}
            </ul>
          </div>
        )}
        {missed.length > 0 && (
          <div className="col-md-6">
            <p className="fw-semibold small mb-2 text-danger">
              <i className="ti tabler-circle-x me-1" />{missedLabel}
            </p>
            <ul className="small ps-3 mb-0">
              {missed.map((x: string, i: number) => <li key={i}>{x}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Strengths / Improvements */}
      <div className="row g-3 mb-4">
        {report?.strengths?.length > 0 && (
          <div className="col-md-6">
            <p className="fw-semibold small mb-2">Strengths</p>
            <ul className="small ps-3 mb-0">
              {report.strengths.map((x: string, i: number) => <li key={i}>{x}</li>)}
            </ul>
          </div>
        )}
        {report?.improvements?.length > 0 && (
          <div className="col-md-6">
            <p className="fw-semibold small mb-2">Areas to improve</p>
            <ul className="small ps-3 mb-0">
              {report.improvements.map((x: string, i: number) => <li key={i}>{x}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendation */}
      {report?.recommendation && (
        <div className="alert alert-primary small py-2 mb-0">
          <i className="ti tabler-bulb me-1" />
          <strong>Recommendation: </strong>{report.recommendation}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ScenarioPage() {
  const { scenarioId } = useParams<{ scenarioId: string }>()
  const [draftText, setDraftText]       = useState('')
  const [submitted, setSubmitted]       = useState<any>(null)
  const [polling, setPolling]           = useState(false)
  const [showChat, setShowChat]         = useState(false)
  const [submittedDraft, setSubmittedDraft] = useState('')

  const { data, isLoading } = useQuery(['scenario', scenarioId], () =>
    api.get(`/practice-lab/scenarios/${scenarioId}`).then((r) => r.data)
  )

  const submit = useMutation(
    () => api.post('/practice-lab/submissions', { scenarioId, content: draftText }),
    {
      onSuccess: (res) => {
        setSubmittedDraft(draftText)
        setSubmitted(res.data.submission)
        setPolling(true)
        pollResult(res.data.submission.id)
      },
    }
  )

  async function pollResult(id: string) {
    const MAX_POLLS = 20
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, 3000))
      try {
        const res = await api.get(`/practice-lab/submissions/${id}`)
        const s = res.data.submission
        if ((s.tutorScore ?? s.aiScore) != null) {
          setSubmitted(s)
          setPolling(false)
          return
        }
      } catch {}
    }
    setPolling(false)
  }

  const scenario = data?.scenario
  const isDrafting = scenario && DRAFTING_TYPES.includes(scenario.moduleType)

  const aiFeedback = submitted?.aiFeedback
  const feedbackReport = aiFeedback && typeof aiFeedback === 'object' && !Array.isArray(aiFeedback)
    ? aiFeedback
    : null

  return (
    <StudentLayout>
      {isLoading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : !scenario ? (
        <div className="alert alert-danger">Scenario not found</div>
      ) : scenario.moduleType === 'CLIENT_INTERVIEW' ? (
        <ClientInterviewChat scenario={scenario} />
      ) : (
        <div className="row g-6">
          {/* ── Scenario ──────────────────────────────────────────────── */}
          <div className={submitted && isDrafting && !polling && feedbackReport ? 'col-lg-5' : 'col-lg-7'}>
            <div className="card mb-4">
              <div className="card-header d-flex justify-content-between align-items-start">
                <div>
                  <h5 className="card-title mb-0">{scenario.title}</h5>
                  <small className="text-body-secondary">
                    {scenario.moduleType === 'CASE_DRAFTING' ? 'Case Drafting' :
                     scenario.moduleType === 'CONTRACT_DRAFTING' ? 'Contract Drafting' :
                     scenario.moduleType}
                  </small>
                </div>
                <span className={`badge bg-label-${scenario.difficulty === 'HARD' ? 'danger' : scenario.difficulty === 'MEDIUM' ? 'warning' : 'success'}`}>
                  {scenario.difficulty}
                </span>
              </div>
              <div className="card-body">
                <div className="bg-body-tertiary rounded p-4">
                  <ScenarioBody s={scenario} />
                </div>
              </div>
            </div>

            {/* ── Evaluation result ──────────────────────────────────── */}
            {submitted && (
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">Evaluation Result</h5>
                  {!polling && feedbackReport && !showChat && (
                    <button
                      className="btn btn-sm btn-label-primary"
                      onClick={() => setShowChat(true)}
                    >
                      <i className="ti tabler-message-dots me-1" />Discuss with AI
                    </button>
                  )}
                </div>
                <div className="card-body">
                  {polling ? (
                    <div className="d-flex align-items-center gap-3 text-body-secondary">
                      <div className="spinner-border spinner-border-sm text-primary" />
                      <span className="small">AI is evaluating your draft…</span>
                    </div>
                  ) : (submitted.tutorScore ?? submitted.aiScore) != null ? (
                    isDrafting && feedbackReport ? (
                      <DraftingFeedback report={feedbackReport} moduleType={scenario.moduleType} />
                    ) : (
                      <>
                        <div className="d-flex align-items-center gap-4 mb-4">
                          <div className="avatar bg-label-success rounded">
                            <span className="avatar-initial fw-bold">
                              {submitted.tutorScore ?? submitted.aiScore}
                            </span>
                          </div>
                          <div>
                            <span className="fw-semibold d-block">
                              Score: {submitted.tutorScore ?? submitted.aiScore}/100
                            </span>
                            <small className="text-body-secondary">
                              {submitted.tutorScore != null ? 'Tutor evaluation' : 'AI evaluation'}
                            </small>
                          </div>
                        </div>
                        {submitted.tutorFeedback && (
                          <div className="bg-body-tertiary rounded p-3">
                            <small className="fw-semibold d-block mb-2">Feedback:</small>
                            <small>{submitted.tutorFeedback}</small>
                          </div>
                        )}
                      </>
                    )
                  ) : (
                    <div className="alert alert-warning mb-0 small">Evaluation pending. Refresh in a moment.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Draft editor / AI chat ─────────────────────────────────── */}
          <div className={submitted && isDrafting && !polling && feedbackReport ? 'col-lg-7' : 'col-lg-5'}>
            {showChat && submittedDraft ? (
              <DraftingChat scenarioId={scenarioId} draftText={submittedDraft} />
            ) : !submitted ? (
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    {scenario.moduleType === 'CONTRACT_DRAFTING' ? 'Your Contract Draft' : 'Your Draft'}
                  </h5>
                </div>
                <div className="card-body">
                  <textarea
                    className="form-control mb-3"
                    rows={18}
                    placeholder={
                      scenario.moduleType === 'CONTRACT_DRAFTING'
                        ? 'Draft your contract here. Start with the parties, recitals, and then define each clause clearly…'
                        : 'Write your legal draft here. Use the IRAC method — Issue, Rule, Application, Conclusion — to structure your arguments…'
                    }
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    disabled={submit.isLoading}
                  />
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-body-secondary">
                      {draftText.split(/\s+/).filter(Boolean).length} words
                    </small>
                    <button
                      className="btn btn-primary"
                      onClick={() => submit.mutate()}
                      disabled={draftText.trim().length < 20 || submit.isLoading}
                    >
                      {submit.isLoading && <span className="spinner-border spinner-border-sm me-2" />}
                      <i className="ti tabler-send me-1" />Submit for AI Evaluation
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </StudentLayout>
  )
}
