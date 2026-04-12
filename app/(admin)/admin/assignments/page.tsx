'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Image from 'next/image'
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
    <AdminLayout title="Global Assignments" breadcrumb="Admin / Assignments">
      
      {/* ── Hero Banner ── */}
      <div className="card shadow-none border p-0 mb-6 overflow-hidden">
        <div className="card-body d-flex flex-column flex-md-row justify-content-between p-0">
          <div className="d-none d-md-flex align-items-end ps-6 pb-0" style={{ minWidth: 90 }}>
            <Image src="/img/illustrations/bulb-light.png" alt="" width={90} height={90} style={{ objectFit: 'contain' }} />
          </div>
          <div className="flex-grow-1 d-flex align-items-center flex-column text-md-center px-6 py-8">
            <h4 className="mb-2 text-heading fw-bold">
              Institutional Grading Dashboard<br />
              <span className="text-primary text-nowrap">Centralized control for all course assignments.</span>
            </h4>
            <p className="mb-0 text-body">Manage the grading quality across all {courses.length} active courses in your institute.</p>
          </div>
          <div className="d-none d-md-flex align-items-end justify-content-end pe-0" style={{ minWidth: 120 }}>
            <Image src="/img/illustrations/pencil-rocket.png" alt="" width={120} height={180} style={{ objectFit: 'contain' }} />
          </div>
        </div>
      </div>

      <div className="row g-6 mb-6">
        {[
          { label: 'Pending Reviews', val: data?.kpi?.totalPending ?? 0, icon: 'tabler-clock-pause', color: 'warning' },
          { label: 'Reviewed This Week', val: data?.kpi?.totalReviewedThisWeek ?? 0, icon: 'tabler-calendar-check', color: 'success' },
          { label: 'Avg. Class Score', val: data?.kpi?.overallAvgScore ? `${data.kpi.overallAvgScore}%` : 'N/A', icon: 'tabler-chart-bar', color: 'primary' },
        ].map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-4">
            <div className="card shadow-none border">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="content-left">
                    <span className="text-body-secondary d-block small text-uppercase fw-bold" style={{ fontSize: 10 }}>{s.label}</span>
                    <h4 className="mb-0 fw-extrabold mt-1">{s.val}</h4>
                  </div>
                  <div className={`avatar avatar-lg bg-label-${s.color} rounded p-1`}>
                    <i className={`ti ${s.icon} icon-28px`}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card shadow-none border">
        <div className="card-header border-bottom d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="card-title mb-0">
            <h5 className="mb-0 fw-bold">Active Submissions</h5>
            <small className="text-muted">Filter by course or status to find pending work.</small>
          </div>
          <div className="d-flex gap-3">
            <select className="form-select w-px-200 border-primary-subtle" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
              <option value="All">All Courses</option>
              {courses.map((c: any) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="form-select w-px-150 border-primary-subtle" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Pending">Needs Review</option>
            </select>
          </div>
        </div>

        <div className="card-body p-0">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="spinner-border text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <img src="/img/illustrations/girl-sitting-with-laptop.png" alt="No assignments" height={140} className="img-fluid mb-4" />
              <h6 className="mb-1">No Assignments Found</h6>
              <p className="text-body-secondary small mb-0">No assignments match your current filters.</p>
            </div>
          ) : (
            <div className="accordion accordion-flush" id="assignmentList">
              {filtered.map((a: any) => (
                <div key={a.id} className="accordion-item border-bottom">
                  <div className="accordion-header d-flex align-items-center p-4">
                    <div className="flex-grow-1 d-flex align-items-center gap-4">
                      <div className="avatar avatar-md border shadow-sm">
                        <span className="avatar-initial rounded bg-label-primary">
                          <i className="ti tabler-file-analytics fs-4" />
                        </span>
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-0 fw-bold text-heading">{a.title}</h6>
                        <small className="text-body-secondary text-uppercase" style={{ fontSize: 10 }}>{a.courseTitle} • {a.moduleTitle}</small>
                      </div>
                      <div className="d-none d-lg-flex gap-6 ms-auto me-8">
                        <div className="text-center">
                          <div className="fw-bold h6 mb-0 text-primary">{a.totalSubmissions}</div>
                          <small className="text-body-secondary text-uppercase fw-bold" style={{ fontSize: 9 }}>Submissions</small>
                        </div>
                        <div className="text-center">
                          <div className="fw-bold h6 mb-0 text-warning">{a.pending}</div>
                          <small className="text-body-secondary text-uppercase fw-bold" style={{ fontSize: 9 }}>Pending</small>
                        </div>
                        <div className="text-center">
                          <div className="fw-bold h6 mb-0 text-success">{a.avgScore ? `${a.avgScore}%` : '—'}</div>
                          <small className="text-body-secondary text-uppercase fw-bold" style={{ fontSize: 9 }}>Avg Score</small>
                        </div>
                      </div>
                    </div>
                    <button 
                      className={`btn btn-sm btn-label-${expandedId === a.id ? 'primary' : 'secondary'} rounded-pill`}
                      onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                    >
                      {expandedId === a.id ? 'Close' : 'View Submissions'}
                    </button>
                  </div>

                  {expandedId === a.id && (
                    <div className="accordion-body bg-light border-top p-0">
                      {subsLoading ? (
                        <div className="p-4 text-center text-body-secondary small">Loading submissions…</div>
                      ) : (submissionsData?.submissions || []).length === 0 ? (
                        <div className="p-4 text-center text-body-secondary small italic">No student has submitted this yet.</div>
                      ) : (
                        <div className="list-group list-group-flush border-top border-primary-subtle">
                          {submissionsData.submissions.map((s: any) => (
                            <div key={s.id} className="list-group-item bg-transparent d-flex align-items-center gap-4 py-4 px-8 hover-bg-light">
                              <div className="avatar avatar-sm shadow-sm border">
                                <span className={`avatar-initial rounded-circle bg-label-primary fw-bold small`}>
                                  {s.student?.name?.[0] || 'S'}
                                </span>
                              </div>
                              <div className="flex-grow-1 min-w-0">
                                <div className="d-flex align-items-center justify-content-between mb-1">
                                  <span className="fw-bold text-heading small">{s.student?.name}</span>
                                  {s.grade != null ? (
                                    <span className="badge rounded-pill bg-label-success px-3" style={{ fontSize: 10 }}>{s.grade} / {a.maxScore}</span>
                                  ) : (
                                    <span className="badge rounded-pill bg-label-warning px-3" style={{ fontSize: 10 }}>Needs Grade</span>
                                  )}
                                </div>
                                <small className="text-body-secondary d-block" style={{ fontSize: 10 }}>Submitted on {new Date(s.submittedAt).toLocaleDateString()} at {new Date(s.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                              </div>
                              <div className="flex-shrink-0">
                                <button
                                  className="btn btn-sm btn-outline-primary shadow-xs px-4"
                                  onClick={() => { setSelectedSubmission(s); setSelectedAssignment(submissionsData?.assignment ?? a) }}
                                >
                                  {s.grade != null ? 'Re-grade' : 'Grade / Review'}
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
        <div className="modal fade show d-block" style={{ background: 'rgba(15, 20, 34, 0.55)', zIndex: 1060 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-simple">
            <div className="modal-content shadow-lg border-0 p-3 p-md-5">
              <div className="modal-body">
                <button type="button" className="btn-close" onClick={() => { setSelectedSubmission(null); setSelectedAssignment(null); reset() }} />
                
                <div className="text-center mb-6">
                  <h3 className="mb-2">Grade Assignment</h3>
                  <p className="text-body small text-uppercase fw-bold text-primary" style={{ letterSpacing: '0.5px' }}>{selectedSubmission.student?.name}</p>
                </div>

                <div className="row g-6">
                  <div className="col-lg-12">
                    <div className="card shadow-none border h-100">
                      <div className="card-body">
                        <div className="row g-6">
                          <div className="col-md-6 border-end">
                            <h6 className="mb-3 fw-bold text-uppercase" style={{ fontSize: 10 }}>Submission Data</h6>
                            
                            {selectedSubmission.fileUrl && (
                              <a href={selectedSubmission.fileUrl} target="_blank" rel="noreferrer" className="btn btn-label-info btn-sm w-100 mb-4 d-flex align-items-center justify-content-center">
                                <i className="ti tabler-external-link me-2" />View Uploaded Content
                              </a>
                            )}
                            
                            {(selectedSubmission.content) ? (
                              <div className="rounded p-3 small bg-light border-start border-4 border-info shadow-none" style={{ maxHeight: 300, overflowY: 'auto' }}>
                                <pre className="m-0 text-wrap font-monospace" style={{ fontSize: 12, color: '#444' }}>
                                  {selectedSubmission.content}
                                </pre>
                              </div>
                            ) : (
                              <div className="text-center p-4 bg-label-secondary rounded border border-dashed text-body-secondary small italic">
                                No text commentary provided.
                              </div>
                            )}
                          </div>

                          <div className="col-md-6">
                            <h6 className="mb-3 fw-bold text-uppercase" style={{ fontSize: 10 }}>Evaluation</h6>
                            
                            <form id="gradeForm" onSubmit={handleSubmit((d) => grade.mutate({ id: selectedSubmission.id, data: d }))} noValidate>
                              <div className="mb-4">
                                <label className="form-label small fw-bold">Score Awarded</label>
                                <div className="d-flex align-items-center gap-3">
                                  <input 
                                    className={`form-control form-control-lg w-px-100 fw-extrabold text-primary text-center ${errors.grade ? 'is-invalid' : ''}`} 
                                    type="number" 
                                    defaultValue={selectedSubmission.grade ?? ''} 
                                    {...register('grade')} 
                                  />
                                  <span className="text-muted fw-bold h5 mb-0">/ {selectedAssignment?.maxScore ?? '100'}</span>
                                </div>
                                {errors.grade && <div className="invalid-feedback d-block">{errors.grade.message}</div>}
                              </div>

                              <div className="mb-0">
                                <label className="form-label small fw-bold text-muted">Tutor Feedback</label>
                                <textarea
                                  className={`form-control p-3 small shadow-none ${errors.feedback ? 'is-invalid' : ''}`}
                                  rows={8}
                                  defaultValue={selectedSubmission.feedback ?? ''}
                                  placeholder="How can the student improve?"
                                  {...register('feedback')}
                                />
                                {errors.feedback && <div className="invalid-feedback d-block mt-1">{errors.feedback.message}</div>}
                              </div>
                            </form>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-12 text-center mt-4">
                    <button type="submit" form="gradeForm" className="btn btn-primary btn-lg px-8 shadow-sm" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <span className="spinner-border spinner-border-sm me-2" />
                      ) : (
                        <i className="ti tabler-cloud-upload me-2" />
                      )}
                      Finalize Grade
                    </button>
                    <button type="button" className="btn btn-label-secondary btn-lg ms-3" onClick={() => { setSelectedSubmission(null); setSelectedAssignment(null); reset() }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
