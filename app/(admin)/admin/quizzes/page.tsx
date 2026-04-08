'use client'

import { useState } from 'react'
import { useQuery } from 'react-query'
import AdminLayout from '@/components/layouts/AdminLayout'
import QuizReviewModal from '@/components/tutor/QuizReviewModal'
import { format } from 'date-fns'
import api from '@/lib/api'

export default function AdminQuizAttemptsPage() {
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading, refetch } = useQuery(['admin-quiz-attempts', statusFilter], async () => {
    const res = await api.get(`/tutor/quizzes?${statusFilter ? `status=${statusFilter}` : ''}`)
    return res.data
  })

  return (
    <AdminLayout title="Quiz Attempts" breadcrumb="Admin / Quiz Attempts">
      <div className="card shadow-sm border-0">
        <div className="card-header d-flex justify-content-between align-items-center border-bottom">
          <h5 className="mb-0 fw-bold text-heading">Student Quiz Submissions</h5>
          <div className="d-flex gap-2">
            <select 
              className="form-select w-px-200" 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Filter by Status</option>
              <option value="submitted">Needs Review</option>
              <option value="reviewed">Graded / Reviewed</option>
            </select>
          </div>
        </div>
        <div className="table-responsive text-nowrap">
          <table className="table table-hover">
            <thead className="table-light">
              <tr>
                <th className="fw-bold small text-uppercase" style={{ letterSpacing: '0.5px' }}>Student</th>
                <th className="fw-bold small text-uppercase" style={{ letterSpacing: '0.5px' }}>Quiz Info</th>
                <th className="fw-bold small text-uppercase" style={{ letterSpacing: '0.5px' }}>Score</th>
                <th className="fw-bold small text-uppercase" style={{ letterSpacing: '0.5px' }}>Status</th>
                <th className="fw-bold small text-uppercase" style={{ letterSpacing: '0.5px' }}>Submitted At</th>
                <th className="fw-bold small text-uppercase" style={{ letterSpacing: '0.5px' }}>Action</th>
              </tr>
            </thead>
            <tbody className="table-border-bottom-0">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-10"><div className="spinner-border text-primary" /></td></tr>
              ) : data?.attempts?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-body-secondary">No submissions found.</td></tr>
              ) : (
                data?.attempts?.map((attempt: any) => (
                  <tr key={attempt.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="avatar avatar-sm me-3 border shadow-sm">
                          {attempt.student.avatarUrl ? (
                            <img src={attempt.student.avatarUrl} alt="Avatar" className="rounded-circle" />
                          ) : (
                            <span className="avatar-initial rounded-circle bg-label-primary fw-bold">
                              {attempt.student.name[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="fw-bold d-block text-heading small">{attempt.student.name}</span>
                          <small className="text-muted" style={{ fontSize: 11 }}>{attempt.student.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="fw-medium text-heading small">{attempt.quiz.title}</div>
                      <small className="text-body-secondary d-block" style={{ fontSize: 10 }}>{attempt.quiz.lesson.module.course.title}</small>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress w-px-50" style={{ height: '4px' }}>
                          <div className={`progress-bar bg-${attempt.passed ? 'success' : 'danger'}`} style={{ width: `${attempt.score}%` }} />
                        </div>
                        <span className={`fw-bold text-${attempt.passed ? 'success' : 'danger'}`} style={{ fontSize: 12 }}>
                          {attempt.score}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge rounded-pill bg-label-${attempt.status === 'reviewed' ? 'info' : 'warning'} px-3`} style={{ fontSize: 10 }}>
                        {attempt.status === 'reviewed' ? 'Reviewed' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div className="small text-heading">{format(new Date(attempt.takenAt), 'MMM dd, yyyy')}</div>
                      <small className="text-muted" style={{ fontSize: 10 }}>{format(new Date(attempt.takenAt), 'p')}</small>
                    </td>
                    <td>
                      <button 
                        className="btn btn-sm btn-label-primary px-3 shadow-sm border"
                        onClick={() => setSelectedAttemptId(attempt.id)}
                      >
                        Review Work
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer border-top bg-light py-3">
          <small className="text-muted">Showing {data?.attempts?.length || 0} total submissions</small>
        </div>
      </div>

      {selectedAttemptId && (
        <QuizReviewModal 
          id={selectedAttemptId} 
          onClose={() => setSelectedAttemptId(null)}
          onSuccess={() => {
            setSelectedAttemptId(null)
            refetch()
          }}
        />
      )}
    </AdminLayout>
  )
}
