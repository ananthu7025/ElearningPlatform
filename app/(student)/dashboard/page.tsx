'use client'

import { useQuery } from 'react-query'
import Link from 'next/link'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'

export default function StudentDashboard() {
  const { data: enrollData, isLoading } = useQuery('myEnrollments', () =>
    api.get('/enrollments/me').then((r) => r.data)
  )

  const { data: liveData } = useQuery('upcomingLive', () =>
    api.get('/live-classes?upcoming=true').then((r) => r.data)
  )

  const enrollments = enrollData?.enrollments ?? []
  const liveClasses = liveData?.liveClasses ?? []

  const inProgress = enrollments.filter((e: any) => e.completionPct > 0 && e.completionPct < 100)
  const completed  = enrollments.filter((e: any) => e.completionPct === 100)

  return (
    <StudentLayout title="My Dashboard">

      {/* ── Quick stats ────────────────────────────────────────────── */}
      <div className="row g-6 mb-6">
        {[
          { label: 'Enrolled Courses', value: enrollments.length,  icon: 'tabler-book',        color: 'bg-label-primary' },
          { label: 'In Progress',      value: inProgress.length,   icon: 'tabler-clock',       color: 'bg-label-warning' },
          { label: 'Completed',        value: completed.length,    icon: 'tabler-check',       color: 'bg-label-success' },
          { label: 'Live Classes',     value: liveClasses.length,  icon: 'tabler-video',       color: 'bg-label-info'    },
        ].map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between">
                  <div>
                    <span className="text-heading">{s.label}</span>
                    <h4 className="my-1">{isLoading ? '—' : s.value}</h4>
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

      <div className="row g-6">
        {/* ── Continue learning ──────────────────────────────────────── */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Continue Learning</h5>
              <Link href="/courses" className="btn btn-sm btn-outline-primary">All Courses</Link>
            </div>
            {isLoading ? (
              <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" role="status" /></div>
            ) : inProgress.length === 0 ? (
              <div className="card-body text-center py-5 text-body-secondary">
                <i className="ti tabler-book mb-2" style={{ fontSize: 36 }} />
                <p className="mb-2">No courses in progress</p>
                <Link href="/courses/browse" className="btn btn-sm btn-primary">Browse Courses</Link>
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {inProgress.slice(0, 4).map((e: any) => (
                  <div key={e.id} className="list-group-item px-4 py-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="avatar bg-label-primary rounded flex-shrink-0">
                        <i className="ti tabler-book avatar-initial" style={{ fontSize: 16 }} />
                      </div>
                      <div className="flex-grow-1 min-w-0">
                        <span className="fw-medium d-block text-truncate">{e.course.title}</span>
                        <div className="d-flex align-items-center gap-2 mt-1">
                          <div className="progress flex-grow-1" style={{ height: 6 }}>
                            <div
                              className="progress-bar bg-primary"
                              style={{ width: `${e.completionPct}%` }}
                            />
                          </div>
                          <small className="text-body-secondary">{e.completionPct}%</small>
                        </div>
                      </div>
                      <Link href={`/courses/${e.courseId}`} className="btn btn-sm btn-outline-primary flex-shrink-0">
                        Continue
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Upcoming live classes ──────────────────────────────────── */}
        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">Upcoming Live Classes</h5>
            </div>
            {liveClasses.length === 0 ? (
              <div className="card-body text-center text-body-secondary py-4">
                <i className="ti tabler-video-off mb-2" style={{ fontSize: 32 }} />
                <p className="mb-0 small">No upcoming classes</p>
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {liveClasses.slice(0, 4).map((lc: any) => (
                  <div key={lc.id} className="list-group-item px-4 py-3">
                    <span className="fw-medium d-block small">{lc.title}</span>
                    <small className="text-body-secondary">
                      {new Date(lc.scheduledAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </small>
                    <small className="d-block text-body-secondary">{lc.course?.title}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </StudentLayout>
  )
}
