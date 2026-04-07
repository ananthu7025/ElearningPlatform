'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import TutorLayout from '@/components/layouts/TutorLayout'
import api from '@/lib/api'

const gradeSchema = z.object({
  grade:    z.coerce.number().nonnegative(),
  feedback: z.string().min(5, 'Provide feedback for the student'),
})
type GradeForm = z.infer<typeof gradeSchema>

const AVATAR_COLORS = ['bg-label-primary','bg-label-success','bg-label-info','bg-label-warning','bg-label-danger']

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export default function AssignmentsPage() {
  const qc = useQueryClient()
  const [courseFilter,  setCourseFilter]  = useState('All')
  const [statusFilter,  setStatusFilter]  = useState('All')
  const [expandedId,    setExpandedId]    = useState<string | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)

  const { data, isLoading } = useQuery('tutorAssignments', () =>
    api.get('/tutor/assignments').then((r) => r.data)
  )

  const { data: submissionsData, isLoading: subsLoading } = useQuery(
    ['submissions', expandedId],
    () => api.get(`/assignments/${expandedId}/submissions`).then((r) => r.data),
    { enabled: !!expandedId }
  )

  const grade = useMutation(
    ({ id, data }: { id: string; data: GradeForm }) =>
      api.put(`/submissions/${id}/grade`, data),
    {
      onSuccess: () => {
        qc.invalidateQueries(['submissions', expandedId])
        qc.invalidateQueries('tutorAssignments')
        setSelectedSubmission(null)
        reset()
      },
    }
  )

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<GradeForm>({
    resolver: zodResolver(gradeSchema),
  })

  const assignments: any[] = data?.assignments ?? []
  const kpi                = data?.kpi ?? { totalPending: 0, totalReviewedThisWeek: 0, overallAvgScore: null }

  const courses = [...new Set(assignments.map((a: any) => a.courseTitle))] as string[]

  const filtered = assignments.filter((a: any) => {
    if (courseFilter !== 'All' && a.courseTitle !== courseFilter) return false
    if (statusFilter === 'Pending'  && a.pending   === 0) return false
    if (statusFilter === 'Reviewed' && a.reviewed  === 0) return false
    return true
  })

  return (
    <TutorLayout title="Assignment Review" breadcrumb="Home / Assignments">

      {/* ── Stat Cards ── */}
      <div className="row g-6 mb-6">
        {[
          { icon: 'tabler-file-report',  label: 'Pending Review',      value: isLoading ? '—' : String(kpi.totalPending),           sub: 'Needs grading',  color: 'bg-label-warning', iconColor: '#FF9F43', pos: false },
          { icon: 'tabler-circle-check', label: 'Reviewed This Week',  value: isLoading ? '—' : String(kpi.totalReviewedThisWeek),  sub: 'Last 7 days',    color: 'bg-label-success', iconColor: '#28C76F', pos: true  },
          { icon: 'tabler-chart-bar',    label: 'Avg Score',           value: isLoading ? '—' : kpi.overallAvgScore != null ? `${kpi.overallAvgScore}%` : '—', sub: 'Overall average', color: 'bg-label-primary', iconColor: '#7367F0', pos: true },
        ].map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-4">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between">
                  <div className="content-left">
                    <span className="text-heading">{s.label}</span>
                    <div className="d-flex align-items-center my-1">
                      <h4 className="mb-0 me-2">{s.value}</h4>
                    </div>
                    <small className="mb-0 text-body-secondary">{s.sub}</small>
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

      {/* ── Filters ── */}
      <div className="row g-3 mb-4 align-items-center">
        <div className="col-md-4">
          <select className="form-select" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option value="All">All Courses</option>
            {courses.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-md-4">
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Pending">Has Pending</option>
            <option value="Reviewed">Has Reviewed</option>
          </select>
        </div>
      </div>

      {/* ── Assignment List ── */}
      {isLoading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-5 text-body-secondary">
          <i className="ti tabler-file-off mb-2" style={{ fontSize: 40 }} />
          <p className="mb-0">No assignments found</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {filtered.map((a: any) => {
            const isOpen = expandedId === a.id
            const subs: any[] = isOpen ? (submissionsData?.submissions ?? []) : []

            return (
              <div key={a.id} className={`card ${isOpen ? 'border-primary shadow-sm' : ''}`}>
                <div className="card-body cursor-pointer py-4" onClick={() => setExpandedId(isOpen ? null : a.id)}>
                  <div className="d-flex gap-3 align-items-center">
                    <div className="avatar avatar-md flex-shrink-0">
                      <span className="avatar-initial rounded bg-label-primary">
                        <i className="ti tabler-file-text" style={{ fontSize: 18 }} />
                      </span>
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <h6 className="mb-0 fw-bold">{a.title}</h6>
                        {a.pending > 0 && (
                          <span className="badge bg-label-warning small">{a.pending} Pending</span>
                        )}
                        {a.reviewed > 0 && (
                          <span className="badge bg-label-success small">{a.reviewed} Reviewed</span>
                        )}
                      </div>
                      <small className="text-body-secondary">
                        <i className="ti tabler-book me-1 small" />{a.courseTitle}
                        {' · '}<i className="ti tabler-layer-intersect me-1 small" />{a.moduleTitle}
                        {' · '}Max: {a.maxScore} marks
                        {a.dueDate && ` · Due: ${new Date(a.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                      </small>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                      <small className="text-body-secondary">{a.totalSubmissions} submissions</small>
                      <i className={`ti tabler-chevron-${isOpen ? 'up' : 'down'} text-primary`} />
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-top" style={{ borderTop: '3px solid #7367F0 !important' }}>
                    {subsLoading ? (
                      <div className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary" /></div>
                    ) : subs.length === 0 ? (
                      <div className="text-center py-4 text-body-secondary">No submissions yet</div>
                    ) : (
                      <div className="list-group list-group-flush">
                        {subs.map((s: any, idx: number) => (
                          <div key={s.id} className="list-group-item px-4 py-3">
                            <div className="d-flex gap-3 align-items-start">
                              <div className="avatar avatar-sm flex-shrink-0">
                                <span className={`avatar-initial rounded-circle ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                                  {getInitials(s.student?.name ?? '?')}
                                </span>
                              </div>
                              <div className="flex-grow-1 min-w-0">
                                <div className="d-flex align-items-center gap-2 mb-1">
                                  <span className="fw-medium">{s.student?.name}</span>
                                  {s.grade != null ? (
                                    <span className="badge bg-label-success rounded-pill">{s.grade} / {submissionsData?.assignment?.maxScore ?? a.maxScore}</span>
                                  ) : (
                                    <span className="badge bg-label-warning rounded-pill">Pending</span>
                                  )}
                                </div>
                                <small className="text-body-secondary">
                                  Submitted {new Date(s.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </small>
                                {(s.submissionText || s.content) && (
                                  <div className="mt-2 small text-body-secondary">
                                    {(s.submissionText || s.content).slice(0, 120)}{(s.submissionText || s.content).length > 120 ? '…' : ''}
                                  </div>
                                )}
                                {s.feedback && (
                                  <div className="mt-1 small text-body-secondary">
                                    <i className="ti tabler-message me-1" />{s.feedback.slice(0, 100)}{s.feedback.length > 100 ? '…' : ''}
                                  </div>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => { setSelectedSubmission(s); setSelectedAssignment(submissionsData?.assignment ?? a) }}
                                >
                                  {s.grade != null ? 'Re-grade' : 'Grade'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Grade Modal ── */}
      {selectedSubmission && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Grade — {selectedSubmission.student?.name}</h5>
                <button type="button" className="btn-close" onClick={() => { setSelectedSubmission(null); setSelectedAssignment(null); reset() }} />
              </div>
              <div className="modal-body">
                <div className="row g-4">
                  <div className="col-lg-6">
                    {/* Assignment Brief */}
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <div className="badge bg-label-primary rounded p-1_5">
                        <i className="ti tabler-list-check icon-md" />
                      </div>
                      <span className="fw-bold small text-uppercase text-body-secondary">Assignment Brief</span>
                    </div>
                    <div className="rounded p-3 mb-4 small text-body shadow-sm lh-base" style={{ background: '#fff', borderLeft: '4px solid #7367F0' }}>
                      {selectedAssignment?.description || selectedAssignment?.title}
                      <div className="mt-2 pt-2 border-top">
                        <strong>Max Marks: {selectedAssignment?.maxScore ?? '?'}</strong>
                      </div>
                    </div>

                    {/* Student Submission */}
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <div className="badge bg-label-info rounded p-1_5">
                        <i className="ti tabler-file-report icon-md" />
                      </div>
                      <span className="fw-bold small text-uppercase text-body-secondary">Student Submission</span>
                    </div>
                    {selectedSubmission.fileKey && (
                      <a href={`/api/files/${selectedSubmission.fileKey}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-info mb-3">
                        <i className="ti tabler-download me-1" />View Submission File
                      </a>
                    )}
                    {(selectedSubmission.submissionText || selectedSubmission.content) ? (
                      <div className="rounded p-3 small text-heading shadow-sm" style={{ background: '#fff', borderLeft: '4px solid #00CFE8', maxHeight: 200, overflowY: 'auto' }}>
                        <pre className="m-0 text-wrap font-monospace" style={{ fontSize: 12 }}>
                          {selectedSubmission.submissionText || selectedSubmission.content}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-body-secondary small">No text submission</div>
                    )}
                  </div>

                  <div className="col-lg-6">
                    {/* Your Review */}
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <div className="badge bg-label-success rounded p-1_5">
                        <i className="ti tabler-edit icon-md" />
                      </div>
                      <span className="fw-bold small text-uppercase text-body-secondary">Your Review</span>
                    </div>

                    <form id="gradeForm" onSubmit={handleSubmit((d) => grade.mutate({ id: selectedSubmission.id, data: d }))} noValidate>
                      <div className="mb-3 bg-white rounded p-3 shadow-sm" style={{ border: '1px solid #e0deff' }}>
                        <label className="form-label small fw-bold">Marks Awarded</label>
                        <div className="d-flex align-items-center gap-2">
                          <input className={`form-control w-px-75 ${errors.grade ? 'is-invalid' : ''}`} type="number" defaultValue={selectedSubmission.grade ?? ''} {...register('grade')} />
                          <span className="text-body-secondary fw-semibold">/ {selectedAssignment?.maxScore ?? '?'}</span>
                        </div>
                        {errors.grade && <div className="invalid-feedback d-block">{errors.grade.message}</div>}
                      </div>

                      <div className="mb-3">
                        <label className="form-label small fw-bold">Written Feedback</label>
                        <div className="rounded overflow-hidden shadow-sm" style={{ border: '1px solid #e0deff' }}>
                          <div className="d-flex gap-1 p-2 border-bottom" style={{ background: '#f8f8fb' }}>
                            {['tabler-bold', 'tabler-italic', 'tabler-underline'].map((icon) => (
                              <button key={icon} type="button" className="btn btn-sm btn-icon btn-text-secondary rounded">
                                <i className={`ti ${icon} fs-5`} />
                              </button>
                            ))}
                          </div>
                          <textarea
                            className={`form-control border-0 rounded-0 p-3 small bg-white ${errors.feedback ? 'is-invalid' : ''}`}
                            rows={5}
                            defaultValue={selectedSubmission.feedback ?? ''}
                            placeholder="Write constructive feedback…"
                            {...register('feedback')}
                          />
                          {errors.feedback && <div className="invalid-feedback">{errors.feedback.message}</div>}
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-label-secondary" onClick={() => { setSelectedSubmission(null); setSelectedAssignment(null); reset() }}>Cancel</button>
                <button type="submit" form="gradeForm" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting && <span className="spinner-border spinner-border-sm me-2" />}
                  <i className="ti tabler-send me-1" />Return to Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </TutorLayout>
  )
}
