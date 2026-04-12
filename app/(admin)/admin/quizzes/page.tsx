'use client'

import { useState } from 'react'
import { useQuery } from 'react-query'
import Image from 'next/image'
import Link from 'next/link'
import AdminLayout from '@/components/layouts/AdminLayout'
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
    <AdminLayout title="Quiz Submissions" breadcrumb="Admin / Quiz Submissions">
      
      {/* ── Hero Banner ── */}
      <div className="card shadow-none border p-0 mb-6 overflow-hidden bg-primary-subtle">
        <div className="card-body d-flex flex-column flex-md-row justify-content-between p-0">
          <div className="d-none d-md-flex align-items-end ps-6 pb-0" style={{ minWidth: 90 }}>
            <Image src="/img/illustrations/bulb-light.png" alt="" width={90} height={90} style={{ objectFit: 'contain' }} />
          </div>
          <div className="flex-grow-1 d-flex align-items-center flex-column text-md-center px-6 py-8">
            <h4 className="mb-2 text-heading fw-bold">
              Institute-Wide Assessments<br />
              <span className="text-primary text-nowrap">Review submissions across all courses.</span>
            </h4>
            <p className="mb-0 text-body">You have access to all {data?.attempts?.length || 0} student attempts for centralized quality control.</p>
          </div>
          <div className="d-none d-md-flex align-items-end justify-content-end pe-0" style={{ minWidth: 120 }}>
            <Image src="/img/illustrations/pencil-rocket.png" alt="" width={120} height={180} style={{ objectFit: 'contain' }} />
          </div>
        </div>
      </div>

      <div className="card shadow-none border">
        <div className="card-header border-bottom d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="card-title mb-0">
            <h5 className="mb-0">Global Quiz Attempts</h5>
            <small className="text-body-secondary mt-1">Review student answers and provide specialized institutional feedback.</small>
          </div>
          <div className="d-flex gap-3">
            <select 
              className="form-select w-px-200 shadow-sm border-primary-subtle" 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="submitted">Needs Review</option>
              <option value="reviewed">Reviewed / Published</option>
            </select>
          </div>
        </div>

        <div className="table-responsive text-nowrap">
          <table className="table table-hover align-middle">
            <thead className="table-light border-top">
              <tr>
                <th className="fw-bold small text-uppercase py-5">Student</th>
                <th className="fw-bold small text-uppercase py-5">Quiz / Course</th>
                <th className="fw-bold small text-uppercase py-5">Score</th>
                <th className="fw-bold small text-uppercase py-5 text-center">Status</th>
                <th className="fw-bold small text-uppercase py-5">Submitted At</th>
                <th className="fw-bold small text-uppercase py-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="table-border-bottom-0">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-10"><div className="spinner-border spinner-border-sm text-primary" /></td></tr>
              ) : data?.attempts?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <img src="/img/illustrations/girl-with-laptop-light.png" alt="No submissions" height={120} className="img-fluid mb-3" />
                    <p className="fw-semibold text-heading mb-1">No Submissions Yet</p>
                    <p className="text-body-secondary small mb-0">Student quiz submissions will appear here.</p>
                  </td>
                </tr>
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
                              {attempt.student.name?.[0] || 'S'}
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
                        <div className="progress w-px-50 shadow-none border-0" style={{ height: '4px', backgroundColor: '#eef0f2' }}>
                          <div className={`progress-bar bg-${attempt.passed ? 'success' : 'danger'}`} style={{ width: `${attempt.score}%` }} />
                        </div>
                        <span className={`fw-bold text-${attempt.passed ? 'success' : 'danger'}`} style={{ fontSize: 11 }}>
                          {attempt.score}%
                        </span>
                      </div>
                    </td>
                    <td className="text-center">
                      <span className={`badge rounded-pill bg-label-${attempt.status === 'reviewed' ? 'info' : 'warning'} px-3`} style={{ fontSize: 10 }}>
                        {attempt.status === 'reviewed' ? 'Reviewed' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div className="text-heading small">{format(new Date(attempt.takenAt), 'MMM dd, yyyy')}</div>
                      <small className="text-muted" style={{ fontSize: 10 }}>at {format(new Date(attempt.takenAt), 'p')}</small>
                    </td>
                    <td className="text-center">
                      <Link 
                        href={`/admin/quizzes/${attempt.id}`}
                        className={`btn btn-sm btn-label-${attempt.status === 'reviewed' ? 'secondary' : 'primary'} px-4 border shadow-sm`}
                      >
                        {attempt.status === 'reviewed' ? 'Re-review' : 'Grade / Review'}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}
