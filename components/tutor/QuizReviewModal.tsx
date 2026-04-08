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
    <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header border-bottom">
            <h5 className="modal-title fw-bold">Review Attempt — {attempt?.student?.name}</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body p-4">
            {toast && (
              <div className="alert alert-success d-flex align-items-center mb-4 fadeIn">
                <i className="ti tabler-circle-check me-2"></i>
                <div>{toast}</div>
              </div>
            )}

            <div className="row g-4">
              {/* Detailed Answers Section */}
              <div className="col-lg-8 border-end">
                <div className="d-flex align-items-center gap-2 mb-4">
                  <div className="badge bg-label-primary rounded p-1_5">
                    <i className="ti tabler-list-check icon-md" />
                  </div>
                  <span className="fw-bold small text-uppercase text-body-secondary">Question Breakdown</span>
                </div>

                <div className="v-list">
                  {questions.map((q: any, idx: number) => {
                    const studentAnswer = studentAnswers[q.id]
                    const normalizedStudent = (studentAnswer || '').toString().trim().toLowerCase()
                    const normalizedCorrect = (q.correctAnswer || '').toString().trim().toLowerCase()
                    const isCorrect = normalizedStudent === normalizedCorrect

                    return (
                      <div key={q.id} className="mb-4 p-4 rounded bg-light border-start border-4 border-primary shadow-sm">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="mb-0 fw-bold text-primary">Question {idx + 1}</h6>
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
                            <div className="small fw-bold mb-1 text-uppercase text-muted" style={{ fontSize: '10px' }}>Student's Answer</div>
                            <div className={`p-3 rounded border ${isCorrect ? 'bg-label-success border-success' : 'bg-label-danger border-danger'}`}>
                              {studentAnswer || <em className="text-muted">No answer provided</em>}
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="small fw-bold mb-1 text-uppercase text-muted" style={{ fontSize: '10px' }}>Correct Answer</div>
                            <div className="p-3 rounded bg-label-info border border-info">
                              {q.correctAnswer}
                            </div>
                          </div>
                        </div>
                        
                        {q.explanation && (
                          <div className="mt-4 p-3 rounded-3 bg-white border small text-muted">
                            <i className="ti tabler-info-circle me-1 text-info" />
                            <strong>Explanation:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Grading & Feedback Section */}
              <div className="col-lg-4">
                <div className="d-flex align-items-center gap-2 mb-4">
                  <div className="badge bg-label-success rounded p-1_5">
                    <i className="ti tabler-edit icon-md" />
                  </div>
                  <span className="fw-bold small text-uppercase text-body-secondary">Review & Grading</span>
                </div>

                <div className="card shadow-none border mb-4">
                  <div className="card-body">
                    <form id="quizReviewForm" onSubmit={handleSubmit((d) => mutation.mutate(d))}>
                      <div className="mb-4">
                        <label className="form-label small fw-bold text-uppercase">Manual Score (%)</label>
                        <div className="d-flex align-items-center gap-2">
                          <input 
                            className={`form-control form-control-lg text-center ${errors.score ? 'is-invalid' : ''}`} 
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
                        {errors.score && <div className="invalid-feedback d-block">{errors.score.message}</div>}
                      </div>

                      <div className="mb-0">
                        <label className="form-label small fw-bold text-uppercase">Feedback to Student</label>
                        <textarea
                          className={`form-control p-3 small ${errors.feedback ? 'is-invalid' : ''}`}
                          rows={10}
                          style={{ minHeight: '200px', backgroundColor: '#fcfcfd' }}
                          placeholder="Provide constructive feedback..."
                          {...register('feedback')}
                        />
                        {errors.feedback && <div className="invalid-feedback d-block">{errors.feedback.message}</div>}
                      </div>
                    </form>
                  </div>
                </div>

                <div className="p-4 rounded-3 bg-label-secondary small shadow-sm">
                  <h6 className="mb-3 fw-bold text-uppercase" style={{ letterSpacing: '0.5px' }}>Attempt Stats</h6>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Time taken:</span>
                    <span className="fw-medium text-heading">
                      {attempt?.timeTakenSeconds ? `${Math.floor(attempt.timeTakenSeconds / 60)}m ${attempt.timeTakenSeconds % 60}s` : 'N/A'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between mb-0">
                    <span className="text-muted">Submitted:</span>
                    <span className="fw-medium text-heading">{format(new Date(attempt?.takenAt), 'MMM dd, p')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer border-top bg-light">
            <button type="button" className="btn btn-label-secondary" onClick={onClose}>Discard</button>
            <button type="submit" form="quizReviewForm" className="btn btn-primary btn-lg px-5 shadow-sm" disabled={isSubmitting || mutation.isLoading}>
              { (isSubmitting || mutation.isLoading) ? (
                <span className="spinner-border spinner-border-sm me-2" />
              ) : (
                <i className="ti tabler-check me-2" />
              )}
              Confirm Review
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
