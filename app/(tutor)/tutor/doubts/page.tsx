'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import TutorLayout from '@/components/layouts/TutorLayout'
import api from '@/lib/api'

const answerSchema = z.object({ answer: z.string().min(5, 'Provide a meaningful answer') })
type AnswerForm = z.infer<typeof answerSchema>

const AVATAR_COLORS = ['bg-label-primary','bg-label-success','bg-label-info','bg-label-warning','bg-label-danger']

export default function DoubtsPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<any>(null)
  const [showResolved, setShowResolved] = useState(false)

  const { data, isLoading } = useQuery(
    ['doubts', showResolved],
    () => api.get(`/doubts?resolved=${showResolved}`).then((r) => r.data)
  )

  const answer = useMutation(
    ({ id, answer }: { id: string; answer: string }) =>
      api.put(`/doubts/${id}/answer`, { answer }),
    {
      onSuccess: () => {
        qc.invalidateQueries('doubts')
        setSelected(null)
        reset()
      },
    }
  )

  const resolve = useMutation(
    (id: string) => api.put(`/doubts/${id}/resolve`),
    { onSuccess: () => qc.invalidateQueries('doubts') }
  )

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AnswerForm>({
    resolver: zodResolver(answerSchema),
  })

  const doubts = data?.doubts ?? []

  return (
    <TutorLayout title="Student Doubts" breadcrumb="Home / Doubts">

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">
            {showResolved ? 'Resolved Doubts' : 'Unanswered Doubts'}
            {!isLoading && <span className="badge bg-label-warning ms-2">{doubts.length}</span>}
          </h5>
          <div className="form-check form-switch mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              id="resolvedToggle"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="resolvedToggle">Show resolved</label>
          </div>
        </div>

        {isLoading ? (
          <div className="d-flex justify-content-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : doubts.length === 0 ? (
          <div className="text-center py-5 text-body-secondary">
            <i className="ti tabler-check mb-2" style={{ fontSize: 36 }} />
            <p className="mb-0">{showResolved ? 'No resolved doubts' : 'All caught up!'}</p>
          </div>
        ) : (
          <div className="list-group list-group-flush">
            {doubts.map((d: any, idx: number) => (
              <div key={d.id} className="list-group-item px-4 py-3">
                <div className="d-flex gap-3">
                  <div className="avatar avatar-sm flex-shrink-0">
                    <span className={`avatar-initial rounded-circle ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                      {d.user?.name?.[0]}
                    </span>
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-start justify-content-between mb-1">
                      <div>
                        <span className="fw-medium small">{d.user?.name}</span>
                        <span className="text-body-secondary small ms-2">· {d.lesson?.title}</span>
                      </div>
                      <small className="text-body-secondary">
                        {new Date(d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </small>
                    </div>
                    <p className="mb-2 small">{d.question}</p>

                    {d.answer && (
                      <div className="bg-body-tertiary rounded p-3 mb-2">
                        <small className="text-body-secondary fw-semibold d-block mb-1">Your answer:</small>
                        <small>{d.answer}</small>
                      </div>
                    )}

                    <div className="d-flex gap-2">
                      {!d.isResolved && (
                        <>
                          <button className="btn btn-sm btn-outline-primary" onClick={() => setSelected(d)}>
                            {d.answer ? 'Edit Answer' : 'Answer'}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => resolve.mutate(d.id)}
                          >
                            Mark Resolved
                          </button>
                        </>
                      )}
                      {d.isResolved && <span className="badge bg-label-success rounded-pill">Resolved</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Answer modal ───────────────────────────────────────────── */}
      {selected && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Answer Doubt</h5>
                <button type="button" className="btn-close" onClick={() => { setSelected(null); reset() }} />
              </div>
              <div className="modal-body">
                <div className="bg-body-tertiary rounded p-3 mb-4">
                  <small className="text-body-secondary fw-semibold d-block mb-1">{selected.user?.name} asks:</small>
                  <p className="mb-0 small">{selected.question}</p>
                </div>
                <form id="answerForm" onSubmit={handleSubmit((d) => answer.mutate({ id: selected.id, answer: d.answer }))} noValidate>
                  <label className="form-label">Your Answer</label>
                  <textarea
                    rows={5}
                    className={`form-control ${errors.answer ? 'is-invalid' : ''}`}
                    placeholder="Type a clear, detailed answer…"
                    defaultValue={selected.answer ?? ''}
                    {...register('answer')}
                  />
                  {errors.answer && <div className="invalid-feedback">{errors.answer.message}</div>}
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-label-secondary" onClick={() => { setSelected(null); reset() }}>Cancel</button>
                <button type="submit" form="answerForm" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting && <span className="spinner-border spinner-border-sm me-2" />}
                  Submit Answer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </TutorLayout>
  )
}
