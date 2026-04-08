'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import TutorLayout from '@/components/layouts/TutorLayout'
import api from '@/lib/api'

const gradeSchema = z.object({
  score:    z.coerce.number().min(0).max(100),
  feedback: z.string().min(5, 'Provide feedback'),
})
type GradeForm = z.infer<typeof gradeSchema>

const AVATAR_COLORS = ['bg-label-primary','bg-label-success','bg-label-info','bg-label-warning','bg-label-danger']
const MODULES_AVAILABLE = [
  { id: 'client-interview',  title: 'Client Interview Room',  color: 'success', icon: 'tabler-briefcase'      },
  { id: 'case-drafting',     title: 'Case Drafting Studio',   color: 'primary', icon: 'tabler-edit'           },
  { id: 'contract-drafting', title: 'Contract Drafting Desk', color: 'warning', icon: 'tabler-clipboard-text' },
]

function scoreColor(score: number) {
  if (score >= 75) return 'text-success'
  if (score >= 65) return 'text-warning'
  return 'text-danger'
}

export default function PracticeLabPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'scenarios' | 'activity'>('scenarios')
  const [selected,  setSelected]  = useState<any>(null)

  const { data: scenariosData, isLoading: scenariosLoading } = useQuery(
    'practiceScenarios',
    () => api.get('/practice-lab/scenarios').then((r) => r.data),
    { retry: false }
  )

  const { data: subsData, isLoading: subsLoading } = useQuery(
    'practiceSubmissions',
    () => api.get('/practice-lab/submissions').then((r) => r.data)
  )

  const grade = useMutation(
    ({ id, data }: { id: string; data: GradeForm }) =>
      api.put(`/practice-lab/submissions/${id}/grade`, data),
    {
      onSuccess: () => {
        qc.invalidateQueries('practiceSubmissions')
        setSelected(null)
        reset()
      },
    }
  )

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<GradeForm>({
    resolver: zodResolver(gradeSchema),
  })

  const scenarios:   any[] = scenariosData?.scenarios  ?? []
  const submissions: any[] = subsData?.submissions      ?? []

  const published     = scenarios.filter((s) => s.isActive).length
  const totalAttempts = submissions.length
  const scoredSubs    = submissions.filter((s: any) => (s.tutorScore ?? s.aiScore) != null)
  const avgScore      = scoredSubs.length
    ? Math.round(scoredSubs.reduce((a: number, s: any) => a + (s.tutorScore ?? s.aiScore ?? 0), 0) / scoredSubs.length)
    : 0

  return (
    <TutorLayout title="Practice Lab" breadcrumb="Home / Practice Lab">

      {/* ── Hero Banner ── */}
      <div className="card p-0 mb-6">
        <div className="card-body d-flex flex-column flex-md-row justify-content-between align-items-center p-0 pt-6">
          <div className="flex-grow-1 d-flex align-items-center flex-column text-md-center px-6 py-6">
            <h4 className="mb-2 text-heading lh-lg">
              Practice Lab — Author &amp; Manage<br />
              <span className="text-primary text-nowrap">Your Scenarios.</span>
            </h4>
            <p className="mb-4 text-body">
              Create new client interview or case drafting scenarios, track student attempt scores and XP earned.
            </p>
            <div className="d-flex gap-3">
              <div className="dropdown">
                <button className="btn btn-primary dropdown-toggle" data-bs-toggle="dropdown">
                  <i className="ti tabler-plus me-1" />Author New Scenario
                </button>
                <ul className="dropdown-menu">
                  {MODULES_AVAILABLE.map((m) => (
                    <li key={m.id}>
                      <a className="dropdown-item d-flex align-items-center gap-2" href={`/tutor/practice-lab/${m.id}/scenarios/new`}>
                        <i className={`ti ${m.icon} text-${m.color}`} />{m.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="row g-6 mb-6">
        {[
          { icon: 'tabler-file-text', label: 'My Scenarios',   value: scenariosLoading ? '—' : String(scenarios.length), sub: `${published} active`,    color: 'bg-label-primary', iconColor: '#7367F0' },
          { icon: 'tabler-check',     label: 'Published',      value: scenariosLoading ? '—' : String(published),         sub: `${scenarios.length - published} inactive`, color: 'bg-label-success', iconColor: '#28C76F' },
          { icon: 'tabler-users',     label: 'Total Attempts', value: subsLoading ? '—' : String(totalAttempts),          sub: 'By students',            color: 'bg-label-warning', iconColor: '#FF9F43' },
          { icon: 'tabler-chart-bar', label: 'Avg Score',      value: subsLoading ? '—' : avgScore > 0 ? `${avgScore}%` : '—', sub: 'Across all submissions', color: 'bg-label-info', iconColor: '#00CFE8' },
        ].map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between">
                  <div>
                    <span className="text-heading">{s.label}</span>
                    <div className="d-flex align-items-center my-1">
                      <h4 className="mb-0 me-2">{s.value}</h4>
                    </div>
                    <small className="text-body-secondary">{s.sub}</small>
                  </div>
                  <div className="avatar">
                    <span className={`avatar-initial rounded ${s.color}`}>
                      <i className={`icon-base ti ${s.icon} icon-26px`} style={{ color: s.iconColor }} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="card">
        <div className="card-header">
          <ul className="nav nav-pills gap-1">
            {(['scenarios', 'activity'] as const).map((tab) => (
              <li key={tab} className="nav-item">
                <button
                  className={`nav-link${activeTab === tab ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  <i className={`ti ${tab === 'scenarios' ? 'tabler-file-text' : 'tabler-activity'} me-2`} />
                  {tab === 'scenarios' ? 'My Scenarios' : 'Student Activity'}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* My Scenarios Tab */}
        {activeTab === 'scenarios' && (
          scenariosLoading ? (
            <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" /></div>
          ) : scenarios.length === 0 ? (
            <div className="card-body text-center py-5 text-body-secondary">
              <i className="ti tabler-flask mb-2" style={{ fontSize: 40 }} />
              <p className="mb-1">No scenarios yet</p>
              <p className="small">Use the &quot;Author New Scenario&quot; button to create your first one.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="border-top">
                  <tr>
                    <th>Scenario</th>
                    <th>Module Type</th>
                    <th>Difficulty</th>
                    <th>Attempts</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s: any) => {
                    const attemptsForScenario = submissions.filter((sub: any) => sub.scenarioId === s.id).length
                    return (
                      <tr key={s.id}>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <div className="avatar">
                              <span className="avatar-initial rounded-circle bg-label-primary">
                                {s.title?.[0] ?? 'S'}
                              </span>
                            </div>
                            <div>
                              <span className="fw-semibold text-heading d-block">{s.title}</span>
                              <small className="text-body-secondary">{s.description?.slice(0, 50)}{s.description?.length > 50 ? '…' : ''}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-label-success">{s.moduleType ?? '—'}</span>
                        </td>
                        <td>
                          <span className={`badge bg-label-${s.difficulty === 'HARD' ? 'danger' : s.difficulty === 'MEDIUM' ? 'warning' : 'success'}`}>
                            {s.difficulty ?? '—'}
                          </span>
                        </td>
                        <td>
                          {attemptsForScenario > 0
                            ? <><span className="fw-semibold">{attemptsForScenario}</span><small className="text-body-secondary ms-1">attempts</small></>
                            : <span className="text-body-secondary small">—</span>
                          }
                        </td>
                        <td>
                          <span className={`badge bg-label-${s.isActive ? 'success' : 'secondary'}`}>
                            {s.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <small className="text-body-secondary">
                            {new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </small>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <a href={`/tutor/practice-lab/scenarios/${s.id}`} className="btn btn-sm btn-icon btn-label-primary rounded-pill" title="Edit">
                              <i className="ti tabler-edit" />
                            </a>
                            <button className="btn btn-sm btn-icon btn-label-secondary rounded-pill" title="View results">
                              <i className="ti tabler-chart-bar" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Student Activity Tab */}
        {activeTab === 'activity' && (
          subsLoading ? (
            <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" /></div>
          ) : submissions.length === 0 ? (
            <div className="card-body text-center py-5 text-body-secondary">
              <i className="ti tabler-activity mb-2" style={{ fontSize: 40 }} />
              <p className="mb-0">No submissions yet</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="border-top">
                  <tr>
                    <th>Student</th>
                    <th>Scenario</th>
                    <th>AI Score</th>
                    <th>Tutor Score</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s: any, idx: number) => {
                    const displayScore = s.tutorScore ?? s.aiScore
                    return (
                      <tr key={s.id}>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <div className="avatar">
                              <span className={`avatar-initial rounded-circle ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                                {s.student?.name?.[0]}
                              </span>
                            </div>
                            <span className="fw-semibold text-heading">{s.student?.name}</span>
                          </div>
                        </td>
                        <td><small className="text-body-secondary">{s.scenario?.title}</small></td>
                        <td>
                          {s.aiScore != null
                            ? <span className={`fw-semibold ${scoreColor(s.aiScore)}`}>{s.aiScore}%</span>
                            : <span className="badge bg-label-warning">Pending</span>
                          }
                        </td>
                        <td>
                          {s.tutorScore != null
                            ? <span className={`fw-semibold ${scoreColor(s.tutorScore)}`}>{s.tutorScore}%</span>
                            : <span className="text-body-secondary small">—</span>
                          }
                        </td>
                        <td>
                          <span className={`badge bg-label-${s.status === 'graded' ? 'success' : s.status === 'evaluated' ? 'info' : 'warning'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td>
                          <small className="text-body-secondary">
                            {new Date(s.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </small>
                        </td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary" onClick={() => setSelected(s)}>
                            {s.tutorScore != null ? 'Override' : 'Grade'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ── Grade Modal ── */}
      {selected && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Grade — {selected.student?.name}</h5>
                <button type="button" className="btn-close" onClick={() => { setSelected(null); reset() }} />
              </div>
              <div className="modal-body">
                {(selected.submissionText || selected.content) && (
                  <div className="bg-body-tertiary rounded p-3 mb-4 small" style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {selected.submissionText || selected.content}
                  </div>
                )}
                {selected.aiScore != null && (
                  <div className="alert alert-info py-2 small mb-3">
                    AI Score: <strong>{selected.aiScore}%</strong>
                    {selected.aiFeedback && <div className="mt-1 text-body-secondary">{typeof selected.aiFeedback === 'string' ? selected.aiFeedback : JSON.stringify(selected.aiFeedback)}</div>}
                  </div>
                )}
                <form id="practiceGradeForm" onSubmit={handleSubmit((d) => grade.mutate({ id: selected.id, data: d }))} noValidate>
                  <div className="mb-3">
                    <label className="form-label">Score (0–100)</label>
                    <input
                      type="number"
                      className={`form-control ${errors.score ? 'is-invalid' : ''}`}
                      defaultValue={selected.tutorScore ?? selected.aiScore ?? ''}
                      {...register('score')}
                    />
                    {errors.score && <div className="invalid-feedback">{errors.score.message}</div>}
                  </div>
                  <div>
                    <label className="form-label">Feedback</label>
                    <textarea
                      rows={4}
                      className={`form-control ${errors.feedback ? 'is-invalid' : ''}`}
                      defaultValue={selected.tutorFeedback ?? ''}
                      placeholder="Constructive feedback for the student…"
                      {...register('feedback')}
                    />
                    {errors.feedback && <div className="invalid-feedback">{errors.feedback.message}</div>}
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-label-secondary" onClick={() => { setSelected(null); reset() }}>Cancel</button>
                <button type="submit" form="practiceGradeForm" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting && <span className="spinner-border spinner-border-sm me-2" />}
                  Save Grade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </TutorLayout>
  )
}
