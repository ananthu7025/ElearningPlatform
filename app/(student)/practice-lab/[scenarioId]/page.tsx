'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useQuery, useMutation } from 'react-query'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'

export default function ScenarioPage() {
  const { scenarioId } = useParams<{ scenarioId: string }>()
  const [answer, setAnswer]   = useState('')
  const [submitted, setSubmitted] = useState<any>(null)
  const [polling, setPolling] = useState(false)

  const { data, isLoading } = useQuery(['scenario', scenarioId], () =>
    api.get(`/practice-lab/scenarios/${scenarioId}`).then((r) => r.data)
  )

  const submit = useMutation(
    () => api.post('/practice-lab/submissions', { scenarioId, content: answer }),
    {
      onSuccess: (res) => {
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
        if (s.score != null) {
          setSubmitted(s)
          setPolling(false)
          return
        }
      } catch {}
    }
    setPolling(false)
  }

  const scenario = data?.scenario

  return (
    <StudentLayout>
      {isLoading ? (
        <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" role="status" /></div>
      ) : !scenario ? (
        <div className="alert alert-danger">Scenario not found</div>
      ) : (
        <div className="row g-6">
          {/* ── Scenario ────────────────────────────────────────────── */}
          <div className="col-lg-7">
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0">{scenario.title}</h5>
                <small className="text-body-secondary">{scenario.course?.title}</small>
              </div>
              <div className="card-body">
                <div className="bg-body-tertiary rounded p-4">
                  <p className="mb-0 small" style={{ lineHeight: 1.8 }}>{scenario.content}</p>
                </div>
              </div>
            </div>

            {/* ── Submission result ──────────────────────────────────── */}
            {submitted && (
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">Evaluation Result</h5>
                </div>
                <div className="card-body">
                  {polling ? (
                    <div className="d-flex align-items-center gap-3 text-body-secondary">
                      <div className="spinner-border spinner-border-sm text-primary" />
                      <span className="small">AI is evaluating your response…</span>
                    </div>
                  ) : submitted.score != null ? (
                    <>
                      <div className="d-flex align-items-center gap-4 mb-4">
                        <div className="avatar bg-label-success rounded">
                          <span className="avatar-initial fw-bold">{submitted.score}</span>
                        </div>
                        <div>
                          <span className="fw-semibold d-block">Score: {submitted.score}/100</span>
                          <small className="text-body-secondary">AI Evaluation</small>
                        </div>
                      </div>
                      {submitted.feedback && (
                        <div className="bg-body-tertiary rounded p-3">
                          <small className="fw-semibold d-block mb-2">Feedback:</small>
                          <small>{submitted.feedback}</small>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="alert alert-warning mb-0 small">Evaluation pending. Refresh in a moment.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Answer ──────────────────────────────────────────────── */}
          {!submitted && (
            <div className="col-lg-5">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">Your Answer</h5>
                </div>
                <div className="card-body">
                  <textarea
                    className="form-control mb-3"
                    rows={14}
                    placeholder="Write your legal analysis here. Structure your answer with issue, rule, application, and conclusion (IRAC method)…"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={submit.isLoading}
                  />
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-body-secondary">{answer.split(/\s+/).filter(Boolean).length} words</small>
                    <button
                      className="btn btn-primary"
                      onClick={() => submit.mutate()}
                      disabled={answer.trim().length < 20 || submit.isLoading}
                    >
                      {submit.isLoading && <span className="spinner-border spinner-border-sm me-2" />}
                      <i className="ti tabler-send me-1" />Submit for Evaluation
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </StudentLayout>
  )
}
