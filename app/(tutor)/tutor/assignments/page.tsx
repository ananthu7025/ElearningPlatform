'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import TutorLayout from '@/components/layouts/TutorLayout'
import api from '@/lib/api'

const gradeSchema = z.object({
  score:    z.coerce.number().nonnegative(),
  feedback: z.string().min(5, 'Provide feedback for the student'),
})
type GradeForm = z.infer<typeof gradeSchema>

const AVATAR_COLORS = ['bg-label-primary','bg-label-success','bg-label-info','bg-label-warning','bg-label-danger']

export default function AssignmentsPage() {
  const qc = useQueryClient()
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)

  // Get all courses to list assignments
  const { data: coursesData } = useQuery('tutorCourses', () =>
    api.get('/courses?limit=50').then((r) => r.data)
  )

  // Get submissions for selected assignment
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)
  const { data: submissionsData, isLoading } = useQuery(
    ['submissions', selectedAssignmentId],
    () => api.get(`/assignments/${selectedAssignmentId}/submissions`).then((r) => r.data),
    { enabled: !!selectedAssignmentId }
  )

  const grade = useMutation(
    ({ id, data }: { id: string; data: GradeForm }) =>
      api.put(`/submissions/${id}/grade`, data),
    {
      onSuccess: () => {
        qc.invalidateQueries(['submissions', selectedAssignmentId])
        setSelectedSubmission(null)
        reset()
      },
    }
  )

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<GradeForm>({
    resolver: zodResolver(gradeSchema),
  })

  const submissions = submissionsData?.submissions ?? []
  const assignment  = submissionsData?.assignment

  return (
    <TutorLayout title="Assignments" breadcrumb="Home / Assignments">

      <div className="card mb-6">
        <div className="card-body">
          <label className="form-label fw-semibold">Select Assignment to Review</label>
          <input
            className="form-control"
            placeholder="Paste assignment ID (from course curriculum)"
            onChange={(e) => setSelectedAssignmentId(e.target.value || null)}
          />
          <small className="text-body-secondary">Go to course curriculum → click assignment → copy the ID from the URL</small>
        </div>
      </div>

      {selectedAssignmentId && (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title mb-0">
              {assignment ? assignment.title : 'Submissions'}
              {assignment && <small className="text-body-secondary ms-2 fw-normal">Max score: {assignment.maxScore}</small>}
            </h5>
          </div>

          {isLoading ? (
            <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" role="status" /></div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-5 text-body-secondary">No submissions yet</div>
          ) : (
            <div className="list-group list-group-flush">
              {submissions.map((s: any, idx: number) => (
                <div key={s.id} className="list-group-item px-4 py-3">
                  <div className="d-flex align-items-center gap-3">
                    <div className="avatar avatar-sm flex-shrink-0">
                      <span className={`avatar-initial rounded-circle ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                        {s.user?.name?.[0]}
                      </span>
                    </div>
                    <div className="flex-grow-1">
                      <span className="fw-medium d-block">{s.user?.name}</span>
                      <small className="text-body-secondary">
                        Submitted {new Date(s.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </small>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                      {s.score != null ? (
                        <span className="badge bg-label-success rounded-pill">
                          {s.score} / {assignment?.maxScore ?? '?'}
                        </span>
                      ) : (
                        <span className="badge bg-label-warning rounded-pill">Pending</span>
                      )}
                      <button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedSubmission(s)}>
                        {s.score != null ? 'Re-grade' : 'Grade'}
                      </button>
                    </div>
                  </div>
                  {s.content && (
                    <div className="mt-2 ps-5">
                      <small className="text-body-secondary">{s.content.slice(0, 150)}{s.content.length > 150 ? '…' : ''}</small>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Grade modal ────────────────────────────────────────────── */}
      {selectedSubmission && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Grade — {selectedSubmission.user?.name}</h5>
                <button type="button" className="btn-close" onClick={() => { setSelectedSubmission(null); reset() }} />
              </div>
              <div className="modal-body">
                {selectedSubmission.content && (
                  <div className="bg-body-tertiary rounded p-3 mb-4 small">{selectedSubmission.content}</div>
                )}
                {selectedSubmission.fileUrl && (
                  <a href={selectedSubmission.fileUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-info mb-4">
                    <i className="ti tabler-download me-1" />View Submission File
                  </a>
                )}
                <form id="gradeForm" onSubmit={handleSubmit((d) => grade.mutate({ id: selectedSubmission.id, data: d }))} noValidate>
                  <div className="mb-3">
                    <label className="form-label">Score (max {assignment?.maxScore ?? '?'})</label>
                    <input
                      type="number"
                      className={`form-control ${errors.score ? 'is-invalid' : ''}`}
                      defaultValue={selectedSubmission.score ?? ''}
                      {...register('score')}
                    />
                    {errors.score && <div className="invalid-feedback">{errors.score.message}</div>}
                  </div>
                  <div>
                    <label className="form-label">Feedback</label>
                    <textarea
                      rows={4}
                      className={`form-control ${errors.feedback ? 'is-invalid' : ''}`}
                      defaultValue={selectedSubmission.feedback ?? ''}
                      placeholder="Write constructive feedback…"
                      {...register('feedback')}
                    />
                    {errors.feedback && <div className="invalid-feedback">{errors.feedback.message}</div>}
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-label-secondary" onClick={() => { setSelectedSubmission(null); reset() }}>Cancel</button>
                <button type="submit" form="gradeForm" className="btn btn-primary" disabled={isSubmitting}>
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
