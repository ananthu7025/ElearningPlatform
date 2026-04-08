'use client'

import { useState } from 'react'
import { useQuery } from 'react-query'
import TutorLayout from '@/components/layouts/TutorLayout'
import api from '@/lib/api'

const progressBands = [
  { label: '90–100%', min: 90,  color: 'bg-success'  },
  { label: '75–89%',  min: 75,  color: 'bg-primary'  },
  { label: '50–74%',  min: 50,  color: 'bg-info'     },
  { label: '25–49%',  min: 25,  color: 'bg-warning'  },
  { label: '0–24%',   min: 0,   color: 'bg-danger'   },
]

function bandCount(students: any[], min: number, max: number) {
  return students.filter((s) => s.progress >= min && s.progress < max).length
}

function getProgressColor(pct: number) {
  if (pct >= 75) return 'bg-success'
  if (pct >= 50) return 'bg-primary'
  return 'bg-warning'
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function avatarColor(name: string) {
  const colors = ['primary', 'success', 'warning', 'info', 'danger']
  let hash = 0
  for (const ch of name) hash = (hash + ch.charCodeAt(0)) % colors.length
  return colors[hash]
}

function formatLastActive(date: string | null) {
  if (!date) return 'Never'
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function TutorStudentsPage() {
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [courseId, setCourseId]   = useState('')
  const [sortBy, setSortBy]       = useState('progress')
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const limit = 10

  const params = new URLSearchParams({
    ...(courseId ? { courseId } : {}),
    ...(search   ? { search }   : {}),
    sortBy,
    page: String(page),
    limit: String(limit),
  })

  const { data, isLoading } = useQuery(
    ['tutorStudents', courseId, sortBy, search, page],
    () => api.get(`/tutor/students?${params}`).then((r) => r.data),
    { keepPreviousData: true }
  )

  const students: any[] = data?.students ?? []
  const courses:  any[] = data?.courses  ?? []
  const kpi             = data?.kpi      ?? { totalStudents: 0, avgProgress: 0, avgQuizScore: 0, atRiskCount: 0 }
  const total: number   = data?.total    ?? 0
  const totalPages      = Math.ceil(total / limit)

  const bandData = progressBands.map((b, i) => ({
    ...b,
    count: bandCount(students, b.min, progressBands[i - 1]?.min ?? 101),
  }))

  const onTrack       = students.filter((s) => s.progress >= 50 && !s.isCertified).length
  const completed     = students.filter((s) => s.isCertified).length
  const fallingBehind = students.filter((s) => s.progress >= 25 && s.progress < 50).length
  const atRisk        = students.filter((s) => s.progress < 25).length

  return (
    <TutorLayout title="Student Progress" breadcrumb="Home / Student Progress">

      {/* ── Stat Cards ── */}
      <div className="row g-6 mb-6">
        {[
          {
            icon: 'tabler-users',         label: 'Total Students', value: isLoading ? '—' : String(kpi.totalStudents),
            sub: 'Across all your courses', color: 'bg-label-primary', pos: true,
          },
          {
            icon: 'tabler-chart-bar',     label: 'Avg Progress',   value: isLoading ? '—' : `${kpi.avgProgress}%`,
            sub: 'Across all students',   color: 'bg-label-info',    pos: true,
          },
          {
            icon: 'tabler-file-analytics',label: 'Avg Quiz Score', value: isLoading ? '—' : `${kpi.avgQuizScore}%`,
            sub: 'All quiz attempts',      color: 'bg-label-success', pos: true,
          },
          {
            icon: 'tabler-alert-circle',  label: 'At Risk',        value: isLoading ? '—' : String(kpi.atRiskCount),
            sub: 'Below 25% progress',    color: 'bg-label-warning', pos: false,
          },
        ].map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between">
                  <div className="content-left">
                    <span className="text-heading">{s.label}</span>
                    <div className="d-flex align-items-center my-1">
                      <h4 className="mb-0 me-2">{s.value}</h4>
                    </div>
                    <small className="mb-0 text-body-secondary">{s.sub}</small>
                  </div>
                  <div className="avatar">
                    <span className={`avatar-initial rounded ${s.color}`}>
                      <i className={`icon-base ti ${s.icon} icon-26px`} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Widget Row ── */}
      <div className="row mb-6 g-6">

        {/* Completion Overview */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body row widget-separator g-0">
              <div className="col-sm-5 border-end pe-sm-6">
                <h3 className="text-primary d-flex align-items-center gap-2 mb-2">
                  {kpi.avgProgress}%<i className="icon-base ti tabler-chart-bar icon-32px" />
                </h3>
                <p className="h6 mb-2">Avg. Completion</p>
                <p className="pe-2 mb-2 text-body-secondary small">Across enrolled students</p>
                <span className="badge bg-label-primary mb-4 mb-sm-0">Overall</span>
                <hr className="d-sm-none" />
              </div>
              <div className="col-sm-7 gap-2 text-nowrap d-flex flex-column justify-content-between ps-sm-6 pt-2 py-sm-2">
                {bandData.map((b) => (
                  <div key={b.label} className="d-flex align-items-center gap-2">
                    <small className="w-px-50">{b.label}</small>
                    <div className="progress w-100 bg-label-primary" style={{ height: 8 }}>
                      <div
                        className={`progress-bar ${b.color}`}
                        role="progressbar"
                        style={{ width: b.count > 0 ? `${Math.max(8, b.count * 10)}%` : '4%' }}
                      />
                    </div>
                    <small className="w-px-20 text-end">{b.count}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Statistics */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body row">
              <div className="col-sm-6">
                <div className="mb-6">
                  <h5 className="mb-2 text-nowrap">Progress Statistics</h5>
                  <p className="mb-0">
                    <span className="me-2">{students.filter((s) => s.isActive).length} active recently</span>
                    <span className="badge bg-label-success">This week</span>
                  </p>
                </div>
                <div>
                  <h6 className="mb-2 fw-normal">
                    <span className="text-success me-1">{onTrack + completed}</span>On track / done
                  </h6>
                  <small className="text-body-secondary">Current cohort</small>
                </div>
              </div>
              <div className="col-sm-6 d-flex flex-column justify-content-between ps-sm-4 border-start">
                {[
                  { label: 'Completed',      count: completed,     color: 'success', icon: 'tabler-circle-check'   },
                  { label: 'On Track',       count: onTrack,       color: 'primary', icon: 'tabler-trending-up'    },
                  { label: 'Falling Behind', count: fallingBehind, color: 'warning', icon: 'tabler-clock'          },
                  { label: 'At Risk',        count: atRisk,        color: 'danger',  icon: 'tabler-alert-triangle' },
                ].map((r) => (
                  <div key={r.label} className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-2">
                      <div className={`badge bg-label-${r.color} rounded p-1`}>
                        <i className={`icon-base ti ${r.icon} icon-sm`} />
                      </div>
                      <small>{r.label}</small>
                    </div>
                    <h6 className="mb-0 fw-bold">{r.count}</h6>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Student Table ── */}
      <div className="card">

        {/* Toolbar */}
        <div className="card-body border-bottom py-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="d-flex flex-wrap gap-3">
              <select
                className="form-select w-auto"
                value={courseId}
                onChange={(e) => { setCourseId(e.target.value); setPage(1) }}
              >
                <option value="">All Courses</option>
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <select
                className="form-select w-auto"
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1) }}
              >
                <option value="progress">Sort by Progress</option>
                <option value="lastActive">Sort by Last Active</option>
                <option value="quizScore">Sort by Quiz Score</option>
              </select>
            </div>
            <div className="position-relative" style={{ minWidth: 240 }}>
              <span className="position-absolute top-50 start-0 translate-middle-y ps-3" style={{ pointerEvents: 'none' }}>
                <i className="ti tabler-search text-body-secondary" />
              </span>
              <input
                className="form-control ps-5"
                placeholder="Search students..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card-datatable table-responsive">
          {isLoading ? (
            <div className="text-center py-5 text-body-secondary">
              <div className="spinner-border spinner-border-sm me-2" />
              Loading...
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-5 text-body-secondary">
              <i className="ti tabler-users mb-2" style={{ fontSize: 40 }} />
              <p className="mb-0">No students found</p>
            </div>
          ) : (
            <table className="table border-top table-hover">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Progress</th>
                  <th>Quiz Avg</th>
                  <th>Last Active</th>
                  <th className="text-end">Details</th>
                </tr>
              </thead>
              <tbody className="table-border-bottom-0">
                {students.map((s: any) => (
                  <>
                    <tr
                      key={s.enrollmentId}
                      className="cursor-pointer"
                      onClick={() => setExpanded(expanded === s.enrollmentId ? null : s.enrollmentId)}
                    >
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div className="avatar avatar-sm">
                            <span className={`avatar-initial rounded-circle fw-bold bg-label-${avatarColor(s.name)}`}>
                              {getInitials(s.name)}
                            </span>
                          </div>
                          <div>
                            <span className="fw-semibold text-heading d-block">{s.name}</span>
                            <small className="text-body-secondary">{s.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-label-primary rounded-pill">
                          {s.courseTitle.split(' ').slice(0, 3).join(' ')}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress w-px-100" style={{ height: 6 }}>
                            <div
                              className={`progress-bar ${getProgressColor(s.progress)}`}
                              role="progressbar"
                              style={{ width: `${s.progress}%` }}
                            />
                          </div>
                          <small className="fw-bold">{s.progress}%</small>
                        </div>
                      </td>
                      <td>
                        {s.avgQuizScore !== null ? (
                          <span className={`badge rounded-pill bg-label-${s.avgQuizScore >= 75 ? 'success' : s.avgQuizScore >= 50 ? 'warning' : 'danger'}`}>
                            {s.avgQuizScore}%
                          </span>
                        ) : (
                          <span className="text-body-secondary small">—</span>
                        )}
                      </td>
                      <td>
                        <small className={s.isActive ? 'text-success' : 'text-body-secondary'}>
                          {formatLastActive(s.lastActive)}
                        </small>
                      </td>
                      <td className="text-end">
                        <i className={`ti tabler-chevron-${expanded === s.enrollmentId ? 'up' : 'down'} text-primary`} />
                      </td>
                    </tr>

                    {expanded === s.enrollmentId && (
                      <tr key={`expand-${s.enrollmentId}`}>
                        <td colSpan={6} className="p-0 border-bottom">
                          <div className="p-4" style={{ background: '#fff', borderTop: '3px solid #7367F0' }}>
                            <div className="row g-4">

                              {/* Summary stats */}
                              <div className="col-md-4">
                                <div className="d-flex align-items-center gap-2 mb-3">
                                  <div className="badge bg-label-primary rounded p-1_5">
                                    <i className="ti tabler-book icon-md" />
                                  </div>
                                  <span className="fw-bold small text-uppercase text-body-secondary">Enrollment Summary</span>
                                </div>
                                <div className="bg-white rounded p-3 shadow-sm d-flex flex-column gap-3">
                                  <div className="d-flex justify-content-between">
                                    <small className="text-body-secondary">Course</small>
                                    <small className="fw-semibold text-end" style={{ maxWidth: 140 }}>{s.courseTitle}</small>
                                  </div>
                                  <div className="d-flex justify-content-between">
                                    <small className="text-body-secondary">Lessons Completed</small>
                                    <small className="fw-semibold">{s.lessonsCompleted}</small>
                                  </div>
                                  <div className="d-flex justify-content-between">
                                    <small className="text-body-secondary">Progress</small>
                                    <small className="fw-semibold">{s.progress}%</small>
                                  </div>
                                  <div className="d-flex justify-content-between">
                                    <small className="text-body-secondary">Certificate</small>
                                    <span className={`badge bg-label-${s.isCertified ? 'success' : 'secondary'} rounded-pill`}>
                                      {s.isCertified ? 'Earned' : 'Pending'}
                                    </span>
                                  </div>
                                  <div className="d-flex justify-content-between">
                                    <small className="text-body-secondary">Last Active</small>
                                    <small className="fw-semibold">{formatLastActive(s.lastActive)}</small>
                                  </div>
                                </div>
                              </div>

                              {/* Quiz Performance */}
                              <div className="col-md-4">
                                <div className="d-flex align-items-center gap-2 mb-3">
                                  <div className="badge bg-label-info rounded p-1_5">
                                    <i className="ti tabler-file-analytics icon-md" />
                                  </div>
                                  <span className="fw-bold small text-uppercase text-body-secondary">Quiz Performance</span>
                                </div>
                                <div className="bg-white rounded p-3 shadow-sm d-flex flex-column gap-2">
                                  {s.avgQuizScore !== null ? (
                                    <>
                                      <div className="d-flex justify-content-between align-items-center mb-2">
                                        <small className="fw-semibold">Average Score</small>
                                        <span className={`badge bg-label-${s.avgQuizScore >= 75 ? 'success' : s.avgQuizScore >= 50 ? 'warning' : 'danger'} rounded-pill`}>
                                          {s.avgQuizScore}%
                                        </span>
                                      </div>
                                      <div className="progress" style={{ height: 8 }}>
                                        <div
                                          className={`progress-bar ${s.avgQuizScore >= 75 ? 'bg-success' : s.avgQuizScore >= 50 ? 'bg-warning' : 'bg-danger'}`}
                                          style={{ width: `${s.avgQuizScore}%` }}
                                        />
                                      </div>
                                      <small className="text-body-secondary mt-1">Based on all quiz attempts</small>
                                    </>
                                  ) : (
                                    <div className="text-center text-body-secondary py-3">
                                      <i className="ti tabler-file-off mb-1" style={{ fontSize: 24 }} />
                                      <p className="small mb-0">No quizzes attempted yet</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Tutor Notes */}
                              <div className="col-md-4">
                                <div className="d-flex align-items-center gap-2 mb-3">
                                  <div className="badge bg-label-success rounded p-1_5">
                                    <i className="ti tabler-notes icon-md" />
                                  </div>
                                  <span className="fw-bold small text-uppercase text-body-secondary">Tutor Notes</span>
                                </div>
                                <div className="rounded overflow-hidden shadow-sm" style={{ border: '1px solid #e0deff' }}>
                                  <div className="p-2 border-bottom" style={{ background: '#f5f3ff' }}>
                                    <small className="text-body-secondary">Private — only visible to you</small>
                                  </div>
                                  <textarea
                                    className="form-control border-0 rounded-0 p-3 small bg-white"
                                    rows={4}
                                    placeholder="Add a private note about this student..."
                                  />
                                </div>
                                <button className="btn btn-primary btn-sm w-100 mt-2">
                                  <i className="ti tabler-device-floppy me-1" />Save Note
                                </button>
                              </div>

                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && total > 0 && (
          <div className="card-footer">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <span className="text-body-secondary small">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} students
              </span>
              <nav>
                <ul className="pagination pagination-sm mb-0 gap-1">
                  <li className={`page-item${page === 1 ? ' disabled' : ''}`}>
                    <button className="page-link rounded" onClick={() => setPage(page - 1)}>‹</button>
                  </li>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                    return (
                      <li key={p} className={`page-item${p === page ? ' active' : ''}`}>
                        <button className="page-link rounded" onClick={() => setPage(p)}>{p}</button>
                      </li>
                    )
                  })}
                  <li className={`page-item${page === totalPages ? ' disabled' : ''}`}>
                    <button className="page-link rounded" onClick={() => setPage(page + 1)}>›</button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        )}

      </div>

    </TutorLayout>
  )
}
