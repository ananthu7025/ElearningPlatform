'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AdminLayout from '@/components/layouts/AdminLayout'
import api from '@/lib/api'

const gradeSchema = z.object({
  grade:    z.coerce.number().nonnegative(),
  feedback: z.string().min(5, 'Provide feedback for the student'),
})
type GradeForm = z.infer<typeof gradeSchema>

export default function AdminAssignmentsPage() {
  const qc = useQueryClient()
  const [courseFilter,  setCourseFilter]  = useState('All')
  const [statusFilter,  setStatusFilter]  = useState('All')
  const [expandedId,    setExpandedId]    = useState<string | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)

  const { data, isLoading } = useQuery('adminAssignments', () =>
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
        qc.invalidateQueries('adminAssignments')
        setSelectedSubmission(null)
        reset()
      },
    }
  )

  const { register, handleSubmit, reset, formState: { errors } } = useForm<GradeForm>({
    resolver: zodResolver(gradeSchema),
  })

  const assignments = data?.assignments ?? []
  const courses = Array.from(new Set(assignments.map((a: any) => a.courseTitle)))

  const filtered = assignments.filter((a: any) => {
    if (courseFilter !== 'All' && a.courseTitle !== courseFilter) return false
    if (statusFilter === 'Pending' && a.pending === 0) return false
    return true
  })

  const isSubmitting = grade.isLoading

  return (
    <AdminLayout title="Assignments" breadcrumb="Admin / Assignments">
      <div className="row g-6 mb-6">
        {[
          { label: 'Pending Reviews', val: data?.kpi?.totalPending ?? 0, icon: 'tabler-clock-pause', color: 'warning' },
          { label: 'Reviewed This Week', val: data?.kpi?.totalReviewedThisWeek ?? 0, icon: 'tabler-calendar-check', color: 'success' },
          { label: 'Avg. Class Score', val: data?.kpi?.overallAvgScore ? `${data.kpi.overallAvgScore}%` : 'N/A', icon: 'tabler-chart-bar', color: 'primary' },
        ].map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-4">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between">
                  <div className="content-left">
                    <span className="text-heading d-block small mb-1">{s.label}</span>
                    <h4 className="mb-0 fw-bold">{s.val}</h4>
                  </div>
                  <div className={`avatar avatar-md bg-label-${s.color} rounded p-1`}>
                    <i className={`ti ${s.icon} icon-26px`}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header border-bottom d-flex flex-wrap justify-content-between align-items-center gap-3">
          <h5 className="mb-0 fw-bold">Active Assignments</h5>
          <div className="d-flex gap-3">
            <select className="form-select w-px-200" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
              <option value="All">All Courses</option>
              {courses.map((c: any) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="form-select w-px-150" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Pending">Needs Review</option>
            </select>
          </div>
        </div>

        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-10 text-center"><div className="spinner-border text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-body-secondary">No assignments found matching criteria.</div>
          ) : (
            <div className="accordion accordion-flush" id="assignmentList">
              {filtered.map((a: any) => (
                <div key={a.id} className="accordion-item border-bottom">
                  <div className="accordion-header d-flex align-items-center p-4">
                    <div className="flex-grow-1 d-flex align-items-center gap-4">
                      <div className="avatar avatar-md">
                        <span className="avatar-initial rounded bg-label-secondary">
                          <i className="ti tabler-file-analytics fs-4" />
                        </span>
                      </div>
                      <div>
                        <h6 className="mb-0 fw-bold">{a.title}</h6>
                        <small className="text-body-secondary text-uppercase" style={{ fontSize: 10 }}>{a.courseTitle} • {a.moduleTitle}</small>
                      </div>
                      <div className="d-none d-lg-flex gap-4 ms-auto me-6">
                        <div className="text-center">
                          <div className="fw-bold h6 mb-0">{a.totalSubmissions}</div>
                          <small className="text-body-secondary text-uppercase" style={{ fontSize: 9 }}>Submissions</small>
                        </div>
                        <div className="text-center">
                          <div className="fw-bold h6 mb-0 text-warning">{a.pending}</div>
                          <small className="text-body-secondary text-uppercase" style={{ fontSize: 9 }}>Pending</small>
                        </div>
                      </div>
                    </div>
                    <button 
                      className={`btn btn-sm btn-label-${expandedId === a.id ? 'primary' : 'secondary'} rounded-pill`}
                      onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                    >
                      {expandedId === a.id ? 'Close' : 'Review Work'}
                    </button>
                  </div>

                  {expandedId === a.id && (
                    <div className="accordion-body bg-light border-top p-0">
                      {subsLoading ? (
                        <div className="p-4 text-center text-body-secondary small">Loading submissions…</div>
                      ) : (submissionsData?.submissions || []).length === 0 ? (
                        <div className="p-4 text-center text-body-secondary small">No student has submitted this yet.</div>
                      ) : (
                        <div className="list-group list-group-flush">
                          {submissionsData.submissions.map((s: any) => (
                            <div key={s.id} className="list-group-item bg-transparent d-flex align-items-center gap-3 py-3 px-6 hover-bg-light">
                              <div className="avatar avatar-sm">
                                <span className={`avatar-initial rounded-circle bg-label-primary`}>
                                  {s.student?.name[0]}
                                </span>
                              </div>
                              <div className="flex-grow-1 min-w-0">
                                <div className="d-flex align-items-center justify-content-between mb-1">
                                  <span className="fw-bold small">{s.student?.name}</span>
                                  {s.grade != null ? (
                                    <span className="badge bg-label-success" style={{ fontSize: 10 }}>{s.grade} / {a.maxScore}</span>
                                  ) : (
                                    <span className="badge bg-label-warning" style={{ fontSize: 10 }}>Pending</span>
                                  )}
                                </div>
                                <small className="text-body-secondary d-block text-truncate">Submitted {new Date(s.submittedAt).toLocaleDateString()}</small>
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
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Grade Modal ── */}
      {selectedSubmission && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">Grade Submission — {selectedSubmission.student?.name}</h5>
                <button type="button" className="btn-close" onClick={() => { setSelectedSubmission(null); setSelectedAssignment(null); reset() }} />
              </div>
              <div className="modal-body p-6">
                <div className="row g-6">
                  <div className="col-lg-6">
                    <div className="small fw-bold text-uppercase text-body-secondary mb-3">Student Submission</div>
                    
                    {selectedSubmission.fileKey && (
                      <a href={`/api/files/${selectedSubmission.fileKey}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-info mb-4 w-100">
                        <i className="ti tabler-download me-1" />Download/View file
                      </a>
                    )}
                    
                    {(selectedSubmission.submissionText || selectedSubmission.content) ? (
                      <div className="rounded p-4 small shadow-sm bg-light" style={{ maxHeight: 300, overflowY: 'auto', borderLeft: '4px solid #00CFE8' }}>
                        <pre className="m-0 text-wrap font-monospace" style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
                          {selectedSubmission.submissionText || selectedSubmission.content}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-body-secondary small italic">No text submission provided.</div>
                    )}
                  </div>

                  <div className="col-lg-6">
                    <div className="small fw-bold text-uppercase text-body-secondary mb-3">Assessment & Feedback</div>
                    
                    <form id="gradeForm" onSubmit={handleSubmit((d) => grade.mutate({ id: selectedSubmission.id, data: d }))} noValidate>
                      <div className="mb-4">
                        <label className="form-label small fw-bold">Marks Awarded</label>
                        <div className="d-flex align-items-center gap-2">
                          <input 
                            className={`form-control w-px-100 fs-5 fw-bold ${errors.grade ? 'is-invalid' : ''}`} 
                            type="number" 
                            defaultValue={selectedSubmission.grade ?? ''} 
                            {...register('grade')} 
                          />
                          <span className="text-body-secondary fw-bold fs-5">/ {selectedAssignment?.maxScore ?? '?'}</span>
                        </div>
                        {errors.grade && <div className="invalid-feedback d-block">{errors.grade.message}</div>}
                      </div>

                      <div className="mb-0">
                        <label className="form-label small fw-bold">Feedback to Student</label>
                        <textarea
                          className={`form-control p-3 small ${errors.feedback ? 'is-invalid' : ''}`}
                          rows={10}
                          defaultValue={selectedSubmission.feedback ?? ''}
                          placeholder="Provide constructive criticism..."
                          {...register('feedback')}
                        />
                        {errors.feedback && <div className="invalid-feedback d-block">{errors.feedback.message}</div>}
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top bg-light">
                <button type="button" className="btn btn-label-secondary" onClick={() => { setSelectedSubmission(null); setSelectedAssignment(null); reset() }}>Cancel</button>
                <button type="submit" form="gradeForm" className="btn btn-primary px-5 shadow-sm" disabled={isSubmitting}>
                  {isSubmitting ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="ti tabler-send me-1" />}
                  Submit Grade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
