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

export default function PracticeLabPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<any>(null)

  const { data, isLoading } = useQuery('practiceSubmissions', () =>
    api.get('/practice-lab/submissions').then((r) => r.data)
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

  const submissions = data?.submissions ?? []
  const pending = submissions.filter((s: any) => s.score == null)

  return (
    <TutorLayout title="Practice Lab" breadcrumb="Home / Practice Lab">

      <div className="d-flex justify-content-between align-items-center mb-6">
        <div>
          <h5 className="mb-1">Practice Submissions</h5>
          <p className="text-body-secondary small mb-0">
            Review AI-graded submissions and override if needed.
            <span className="badge bg-label-warning ms-2">{pending.length} pending</span>
          </p>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" role="status" /></div>
        ) : submissions.length === 0 ? (
          <div className="card-body text-center py-5 text-body-secondary">No submissions yet</div>
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
                    <small className="text-body-secondary">{s.scenario?.title}</small>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    {s.score != null ? (
                      <div className="text-end">
                        <span className="badge bg-label-success rounded-pill">{s.score}/100</span>
                        {s.gradedById && <small className="d-block text-body-secondary mt-1">Tutor reviewed</small>}
                      </div>
                    ) : (
                      <span className="badge bg-label-warning rounded-pill">Pending AI</span>
                    )}
                    <button className="btn btn-sm btn-outline-primary" onClick={() => setSelected(s)}>
                      {s.score != null ? 'Override' : 'Grade'}
                    </button>
                  </div>
                </div>
                {s.content && (
                  <div className="mt-2 ps-5">
                    <small className="text-body-secondary">{s.content.slice(0, 120)}{s.content.length > 120 ? '…' : ''}</small>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Grade modal ─────────────────────────────────────────────── */}
      {selected && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Grade — {selected.user?.name}</h5>
                <button type="button" className="btn-close" onClick={() => { setSelected(null); reset() }} />
              </div>
              <div className="modal-body">
                <div className="bg-body-tertiary rounded p-3 mb-4 small">{selected.content}</div>
                <form id="practiceGradeForm" onSubmit={handleSubmit((d) => grade.mutate({ id: selected.id, data: d }))} noValidate>
                  <div className="mb-3">
                    <label className="form-label">Score (0–100)</label>
                    <input
                      type="number"
                      className={`form-control ${errors.score ? 'is-invalid' : ''}`}
                      defaultValue={selected.score ?? ''}
                      {...register('score')}
                    />
                    {errors.score && <div className="invalid-feedback">{errors.score.message}</div>}
                  </div>
                  <div>
                    <label className="form-label">Feedback</label>
                    <textarea
                      rows={4}
                      className={`form-control ${errors.feedback ? 'is-invalid' : ''}`}
                      defaultValue={selected.feedback ?? ''}
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
