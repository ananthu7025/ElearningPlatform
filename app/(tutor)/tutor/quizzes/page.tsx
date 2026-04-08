'use client'

import { useState } from 'react'
import { useQuery } from 'react-query'
import Image from 'next/image'
import Link from 'next/link'
import TutorLayout from '@/components/layouts/TutorLayout'
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
    <TutorLayout title="Quiz Submissions" breadcrumb="Tutor / Quiz Submissions">
      
      {/* ── Hero Banner ── */}
      <div className="card shadow-none border p-0 mb-6 overflow-hidden">
        <div className="card-body d-flex flex-column flex-md-row justify-content-between p-0">
          <div className="d-none d-md-flex align-items-end ps-6 pb-0" style={{ minWidth: 90 }}>
            <Image src="/img/illustrations/bulb-light.png" alt="" width={90} height={90} style={{ objectFit: 'contain' }} />
          </div>
          <div className="flex-grow-1 d-flex align-items-center flex-column text-md-center px-6 py-8">
            <h4 className="mb-2 text-heading fw-bold">
              Grade Your Student Assessments<br />
              <span className="text-primary text-nowrap">Review and finalize manual scores.</span>
            </h4>
            <p className="mb-0 text-body">You have {data?.attempts?.filter((a: any) => a.status === 'submitted').length || 0} pending submissions waiting for review.</p>
          </div>
          <div className="d-none d-md-flex align-items-end justify-content-end pe-0" style={{ minWidth: 120 }}>
            <Image src="/img/illustrations/pencil-rocket.png" alt="" width={120} height={180} style={{ objectFit: 'contain' }} />
          </div>
        </div>
      </div>

      <div className="card shadow-none border">
        <div className="card-header border-bottom d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="card-title mb-0">
            <h5 className="mb-0">Quiz Attempts</h5>
            <small className="text-body-secondary mt-1">Review student answers and provide feedback.</small>
          </div>
          <div className="d-flex gap-3">
            <select 
              className="form-select w-px-200" 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Attempts</option>
              <option value="submitted">Needs Review</option>
              <option value="reviewed">Graded / Published</option>
            </select>
          </div>
        </div>

        <div className="table-responsive text-nowrap">
          <table className="table table-hover align-middle">
            <thead className="table-light border-top">
              <tr>
                <th className="fw-bold small text-uppercase">Student</th>
                <th className="fw-bold small text-uppercase">Quiz / Course</th>
                <th className="fw-bold small text-uppercase">Current Score</th>
                <th className="fw-bold small text-uppercase">Review Status</th>
                <th className="fw-bold small text-uppercase">Submitted</th>
                <th className="fw-bold small text-uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="table-border-bottom-0">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-10"><div className="spinner-border spinner-border-sm text-primary" /></td></tr>
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
                            <span className="avatar-initial rounded-circle bg-label-primary fw-bold small">
                              {attempt.student.name[0]}
                            </span>
                          )}
                        </div>
                        <div className="d-flex flex-column">
                          <span className="fw-bold text-heading mb-0 small">{attempt.student.name}</span>
                          <small className="text-muted" style={{ fontSize: 10 }}>{attempt.student.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="fw-semibold text-heading small">{attempt.quiz.title}</div>
                      <small className="text-body-secondary text-truncate d-block" style={{ maxWidth: 200, fontSize: 10 }}>{attempt.quiz.lesson.module.course.title}</small>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress w-px-50" style={{ height: '4px' }}>
                          <div className={`progress-bar bg-${attempt.passed ? 'success' : 'danger'}`} style={{ width: `${attempt.score}%` }} />
                        </div>
                        <span className={`fw-bold text-${attempt.passed ? 'success' : 'danger'}`} style={{ fontSize: 11 }}>
                          {attempt.score}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge rounded-pill bg-label-${attempt.status === 'reviewed' ? 'success' : 'warning'} px-3`} style={{ fontSize: 10 }}>
                        {attempt.status === 'reviewed' ? 'Graded' : 'Pending Review'}
                      </span>
                    </td>
                    <td>
                      <div className="text-heading small">{format(new Date(attempt.takenAt), 'MMM dd, yyyy')}</div>
                      <small className="text-muted" style={{ fontSize: 10 }}>at {format(new Date(attempt.takenAt), 'p')}</small>
                    </td>
                    <td className="text-center">
                      <Link 
                        href={`/tutor/quizzes/${attempt.id}`}
                        className={`btn btn-sm btn-label-${attempt.status === 'reviewed' ? 'secondary' : 'primary'} px-4`}
                      >
                        {attempt.status === 'reviewed' ? 'Re-grade' : 'Grade / Review'}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer border-top bg-light py-3">
          <small className="text-muted">Total {data?.attempts?.length || 0} student attempts found.</small>
        </div>
      </div>
    </TutorLayout>
  )
}
