'use client'

import { useState } from 'react'
import { useQuery } from 'react-query'
import TutorLayout from '@/components/layouts/TutorLayout'
import QuizReviewModal from '@/components/tutor/QuizReviewModal'
import { format } from 'date-fns'
import api from '@/lib/api'

export default function QuizAttemptsPage() {
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading, refetch } = useQuery(['tutor-quiz-attempts', statusFilter], async () => {
    const res = await api.get(`/tutor/quizzes${statusFilter ? `?status=${statusFilter}` : ''}`)
    return res.data
  })

  return (
    <TutorLayout title="Quiz Attempts" breadcrumb="Tutor / Quiz Attempts">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Student Submissions</h5>
          <div className="d-flex gap-2">
            <select 
              className="form-select w-px-150" 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="submitted">Pending</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </div>
        </div>
        <div className="table-responsive text-nowrap">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Student</th>
                <th>Quiz</th>
                <th>Course</th>
                <th>Score</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="table-border-bottom-0">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center">Loading...</td></tr>
              ) : data?.attempts?.length === 0 ? (
                <tr><td colSpan={7} className="text-center">No attempts found</td></tr>
              ) : (
                data?.attempts?.map((attempt: any) => (
                  <tr key={attempt.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="avatar avatar-sm me-3">
                          {attempt.student.avatarUrl ? (
                            <img src={attempt.student.avatarUrl} alt="Avatar" className="rounded-circle" />
                          ) : (
                            <span className={`avatar-initial rounded-circle bg-label-primary`}>
                              {attempt.student.name[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="fw-medium d-block">{attempt.student.name}</span>
                          <small className="text-muted">{attempt.student.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{attempt.quiz.title}</td>
                    <td>{attempt.quiz.lesson.module.course.title}</td>
                    <td>
                      <span className={`badge bg-label-${attempt.passed ? 'success' : 'danger'}`}>
                        {attempt.score}%
                      </span>
                    </td>
                    <td>
                      <span className={`badge bg-label-${attempt.status === 'reviewed' ? 'info' : 'warning'}`}>
                        {attempt.status === 'reviewed' ? 'Reviewed' : 'Pending'}
                      </span>
                    </td>
                    <td>{format(new Date(attempt.takenAt), 'MMM dd, HH:mm')}</td>
                    <td>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => setSelectedAttemptId(attempt.id)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
    </TutorLayout>
  )
}
