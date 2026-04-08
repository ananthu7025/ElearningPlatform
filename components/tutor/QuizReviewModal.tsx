'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'react-query'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import api from '@/lib/api'

const schema = z.object({
  score: z.coerce.number().min(0).max(100),
  feedback: z.string().optional(),
})

interface Props {
  id: string
  onClose: () => void
  onSuccess: () => void
}

export default function QuizReviewModal({ id, onClose, onSuccess }: Props) {
  const [toast, setToast] = useState('')

  const { data, isLoading } = useQuery(['tutor-quiz-attempt', id], async () => {
    const res = await api.get(`/tutor/quizzes/${id}`)
    return res.data
  })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    values: {
      score: data?.attempt?.score ?? 0,
      feedback: data?.attempt?.tutorFeedback ?? '',
    }
  })

  const mutation = useMutation(async (payload: any) => {
    await api.put(`/tutor/quizzes/${id}`, { ...payload, status: 'reviewed' })
  }, {
    onSuccess: () => {
      setToast('Successfully reviewed')
      setTimeout(() => {
        setToast('')
        onSuccess()
      }, 1500)
    },
    onError: () => setToast('Something went wrong'),
  })

  if (isLoading) return null

  const attempt = data?.attempt
  const questions = attempt?.quiz?.questions || []
  const studentAnswers = attempt?.answers || {}

  return (
    <div className="modal fade show d-block" style={{ background: 'rgba(15, 20, 34, 0.55)', zIndex: 1060 }}>
      <div className="modal-dialog modal-xl modal-dialog-centered modal-simple modal-add-new-address">
        <div className="modal-content shadow-lg border-0 p-3 p-md-5">
          <div className="modal-body">
            <button type="button" className="btn-close" onClick={onClose} />
            
            <div className="text-center mb-4">
              <h3 className="mb-2">Review Quiz Attempt</h3>
              <p className="text-body">Review student performance and provide manual grading for "{attempt?.quiz?.title}"</p>
            </div>

            {toast && (
              <div className="alert alert-success d-flex align-items-center mb-6">
                <i className="ti tabler-circle-check me-2"></i>
                <div>{toast}</div>
              </div>
            )}

            <div className="row g-6 mt-2">
              {/* Question List */}
              <div className="col-lg-8 border-end">
                <div className="d-flex align-items-center gap-2 mb-4">
                  <div className="avatar avatar-sm bg-label-primary rounded p-1">
                    <i className="ti tabler-list-check" />
                  </div>
                  <h5 className="mb-0 fw-bold">Answer Breakdown</h5>
                </div>

                <div className="v-list" style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '10px' }}>
                  {questions.map((q: any, idx: number) => {
                    const studentAnswer = studentAnswers[q.id]
                    const normalizedStudent = (studentAnswer || '').toString().trim().toLowerCase()
                    const normalizedCorrect = (q.correctAnswer || '').toString().trim().toLowerCase()
                    const isCorrect = normalizedStudent === normalizedCorrect

                    return (
                      <div key={q.id} className="card shadow-none border mb-4">
                        <div className="card-body p-4">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-muted small fw-medium">Question {idx + 1}</span>
                            <div className="d-flex gap-2">
                              <span className={`badge bg-label-${q.questionType === 'mcq' ? 'info' : 'secondary'} text-uppercase`} style={{ fontSize: '10px' }}>
                                {q.questionType}
                              </span>
                              <span className={`badge bg-label-${isCorrect ? 'success' : 'danger'}`}>
                                {isCorrect ? 'Correct' : 'Incorrect'}
                              </span>
                            </div>
                          </div>
                          <p className="mb-4 text-heading fw-medium">{q.questionText}</p>
                          
                          <div className="row g-3">
                            <div className="col-md-6">
                              <div className="small fw-bold mb-1 text-uppercase text-muted" style={{ fontSize: '10px' }}>Student</div>
                              <div className={`p-3 rounded border ${isCorrect ? 'bg-label-success border-success' : 'bg-label-danger border-danger'}`}>
                                {studentAnswer || <em className="text-muted">No response</em>}
                              </div>
                            </div>

                            <div className="col-md-6">
                              <div className="small fw-bold mb-1 text-uppercase text-muted" style={{ fontSize: '10px' }}>Standard Key</div>
                              <div className="p-3 rounded bg-label-info border border-info">
                                {q.correctAnswer}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Sidebar: Stats & Grading */}
              <div className="col-lg-4">
                <div className="card shadow-none border h-100">
                  <div className="card-body">
                    <form id="quizReviewForm" onSubmit={handleSubmit((d) => mutation.mutate(d))}>
                      <div className="text-center mb-6">
                        <div className="avatar avatar-xl bg-label-primary rounded mb-3 mx-auto">
                          <span className="fs-3 fw-bold">{attempt?.student?.name[0]}</span>
                        </div>
                        <h5 className="mb-1">{attempt?.student?.name}</h5>
                        <p className="text-body small mb-0">{attempt?.student?.email}</p>
                      </div>

                      <div className="mb-4">
                        <label className="form-label small fw-bold text-uppercase">Manual Override Score (%)</label>
                        <div className="d-flex align-items-center gap-2">
                          <input 
                            className={`form-control form-control-lg text-center fw-bold ${errors.score ? 'is-invalid' : ''}`} 
                            style={{ width: '100px' }}
                            type="number" 
                            {...register('score')} 
                          />
                          <div className="flex-grow-1">
                            <div className="small text-muted mb-1">Pass Mark: {attempt?.quiz?.passingScore}%</div>
                            <div className="progress" style={{ height: '6px' }}>
                              <div className="progress-bar bg-primary" style={{ width: `${Math.min(100, Math.max(0, data?.attempt?.score || 0))}%` }} />
                            </div>
                          </div>
                        </div>
                        {errors.score && <div className="invalid-feedback d-block mt-2">{errors.score.message}</div>}
                      </div>

                      <div className="mb-6">
                        <label className="form-label small fw-bold text-uppercase">Private Feedback</label>
                        <textarea
                          className={`form-control ${errors.feedback ? 'is-invalid' : ''}`}
                          rows={6}
                          placeholder="Constructive criticism..."
                          {...register('feedback')}
                        />
                      </div>

                      <div className="bg-label-secondary p-4 rounded mb-6">
                        <h6 className="mb-3 text-uppercase fw-bold" style={{ fontSize: 10 }}>Session Summary</h6>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted small text-nowrap">Time spent:</span>
                          <span className="fw-medium text-heading small text-nowrap">
                            {attempt?.timeTakenSeconds ? `${Math.floor(attempt.timeTakenSeconds / 60)}m ${attempt.timeTakenSeconds % 60}s` : 'N/A'}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between mb-0">
                          <span className="text-muted small text-nowrap">Date:</span>
                          <span className="fw-medium text-heading small text-nowrap">{format(new Date(attempt?.takenAt), 'MMM dd, HH:mm')}</span>
                        </div>
                      </div>

                      <div className="col-12 text-center">
                        <button type="submit" className="btn btn-primary btn-lg w-100 mb-3" disabled={isSubmitting || mutation.isLoading}>
                           {(isSubmitting || mutation.isLoading) ? (
                            <span className="spinner-border spinner-border-sm me-2" />
                          ) : (
                            <i className="ti tabler-check me-2" />
                          )}
                          Approve Review
                        </button>
                        <button type="button" className="btn btn-label-secondary w-100" onClick={onClose}>Discard Change</button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
