'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'react-query'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import AdminLayout from '@/components/layouts/AdminLayout'
import api from '@/lib/api'

const schema = z.object({
  score: z.coerce.number().min(0).max(100),
  feedback: z.string().optional(),
})

export default function AdminQuizReviewPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [toast, setToast] = useState('')

  const { data, isLoading } = useQuery(['admin-quiz-attempt', params.id], async () => {
    const res = await api.get(`/tutor/quizzes/${params.id}`)
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
    await api.put(`/tutor/quizzes/${params.id}`, { ...payload, status: 'reviewed' })
  }, {
    onSuccess: () => {
      setToast('Attempt successfully reviewed by Admin')
      setTimeout(() => {
        setToast('')
        router.push('/admin/quizzes')
      }, 1500)
    },
    onError: () => setToast('Something went wrong'),
  })

  if (isLoading) return (
    <AdminLayout title="Reviewing Attempt" breadcrumb="Admin / Quiz / Review">
      <div className="d-flex justify-content-center py-20"><div className="spinner-border text-primary" /></div>
    </AdminLayout>
  )

  const attempt = data?.attempt
  const questions = attempt?.quiz?.questions || []
  const studentAnswers = attempt?.answers || {}

  return (
    <AdminLayout title={`Review Quiz — ${attempt?.student?.name}`} breadcrumb={`Admin / Quiz / ${attempt?.quiz?.title}`}>
      <div className="row g-6">
        {/* Main Content: Answers */}
        <div className="col-lg-8">
          {toast && (
            <div className="alert alert-success d-flex align-items-center mb-6">
              <i className="ti tabler-circle-check me-2"></i>
              <div>{toast}</div>
            </div>
          )}

          <div className="card shadow-none border mb-6">
            <div className="card-header border-bottom d-flex align-items-center gap-2">
              <div className="avatar avatar-sm bg-label-primary rounded p-1">
                <i className="ti tabler-list-check" />
              </div>
              <h5 className="mb-0 fw-bold">Institutional Answer Review</h5>
            </div>
            <div className="card-body p-6">
              <div className="v-list">
                {questions.map((q: any, idx: number) => {
                  const studentAnswer = studentAnswers[q.id]
                  const normalizedStudent = (studentAnswer || '').toString().trim().toLowerCase()
                  const normalizedCorrect = (q.correctAnswer || '').toString().trim().toLowerCase()
                  const isCorrect = normalizedStudent === normalizedCorrect

                  return (
                    <div key={q.id} className={`p-6 rounded border mb-6 ${isCorrect ? 'border-label-success' : 'border-label-danger'}`}>
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <span className="text-muted small fw-bold text-uppercase" style={{ fontSize: 10 }}>Question {idx + 1}</span>
                        <div className="d-flex gap-2">
                          <span className={`badge bg-label-${q.questionType === 'mcq' ? 'info' : 'secondary'} text-uppercase`} style={{ fontSize: 10 }}>
                            {q.questionType}
                          </span>
                          <span className={`badge bg-label-${isCorrect ? 'success' : 'danger'}`}>
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>
                      </div>
                      <p className="mb-6 h6 text-heading font-medium">{q.questionText}</p>
                      
                      <div className="row g-4">
                        <div className="col-md-6">
                          <div className="small fw-bold mb-2 text-uppercase text-muted" style={{ fontSize: 10 }}>Student Performance</div>
                          <div className="p-4 rounded bg-white border font-bold shadow-xs">
                            {studentAnswer || <em className="text-muted">No response provided</em>}
                          </div>
                        </div>

                        <div className="col-md-6">
                          <div className="small fw-bold mb-2 text-uppercase text-muted" style={{ fontSize: 10 }}>Standard Reference</div>
                          <div className="p-4 rounded bg-white border border-dashed text-primary font-bold shadow-xs">
                            {q.correctAnswer}
                          </div>
                        </div>
                      </div>
                      
                      {q.explanation && (
                        <div className="mt-4 p-4 rounded bg-label-light border-start border-4 border-info small text-body">
                          <i className="ti tabler-info-circle me-1 text-info" />
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Grading & Summary */}
        <div className="col-lg-4">
          <div className="card shadow-none border sticky-top" style={{ top: '100px' }}>
            <div className="card-header border-bottom">
              <h5 className="mb-0 fw-bold text-heading">Evaluation Panel (Admin)</h5>
            </div>
            <div className="card-body p-6">
              <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
                <div className="text-center mb-8">
                  <div className="avatar avatar-xl bg-label-primary rounded mb-3 mx-auto shadow-sm">
                    <span className="fs-2 fw-extrabold">{attempt?.student?.name[0]}</span>
                  </div>
                  <h5 className="mb-1 fw-bold text-heading">{attempt?.student?.name}</h5>
                  <p className="text-body small mb-0">{attempt?.student?.email}</p>
                </div>

                <div className="mb-6 p-4 bg-label-secondary rounded border-0">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted small">Time Taken:</span>
                    <span className="fw-bold small text-heading">{attempt?.timeTakenSeconds ? `${Math.floor(attempt.timeTakenSeconds / 60)}m ${attempt.timeTakenSeconds % 60}s` : 'N/A'}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-0">
                    <span className="text-muted small">Submitted Date:</span>
                    <span className="fw-bold small text-heading">{format(new Date(attempt?.takenAt), 'MMM dd, p')}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="form-label small fw-bold text-uppercase">Manual Override Score (%)</label>
                  <div className="d-flex align-items-center gap-3">
                    <input 
                      className={`form-control form-control-lg text-center fs-4 fw-bold p-3 ${errors.score ? 'is-invalid' : ''}`} 
                      style={{ width: '120px' }}
                      type="number" 
                      {...register('score')} 
                    />
                    <div className="flex-grow-1">
                      <div className="small text-muted mb-1 text-nowrap">Pass Threshold: {attempt?.quiz?.passingScore}%</div>
                      <div className="progress" style={{ height: '8px', backgroundColor: '#eef0f2' }}>
                        <div className="progress-bar bg-primary" style={{ width: `${Math.min(100, Math.max(0, data?.attempt?.score || 0))}%` }} />
                      </div>
                    </div>
                  </div>
                  {errors.score && <div className="invalid-feedback d-block mt-2">{errors.score.message}</div>}
                </div>

                <div className="mb-8">
                  <label className="form-label small fw-bold text-uppercase text-muted">Administrative Feedback</label>
                  <textarea
                    className={`form-control p-4 fs-6 bg-light shadow-none ${errors.feedback ? 'is-invalid' : ''}`}
                    rows={8}
                    placeholder="Provide constructive feedback for the student..."
                    {...register('feedback')}
                  />
                </div>

                <div className="col-12">
                  <button type="submit" className="btn btn-primary btn-lg w-100 mb-4 shadow-sm" disabled={isSubmitting || mutation.isLoading}>
                     {(isSubmitting || mutation.isLoading) ? (
                      <span className="spinner-border spinner-border-sm me-2" />
                    ) : (
                      <i className="ti tabler-cloud-upload me-2" />
                    )}
                    Confirm & Publish Result
                  </button>
                  <button type="button" className="btn btn-label-secondary w-100" onClick={() => router.back()}>Exit Review</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
