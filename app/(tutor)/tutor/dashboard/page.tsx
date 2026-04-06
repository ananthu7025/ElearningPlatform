'use client'

import { useQuery } from 'react-query'
import Link from 'next/link'
import TutorLayout from '@/components/layouts/TutorLayout'
import api from '@/lib/api'

export default function TutorDashboard() {
  const { data: coursesData, isLoading: coursesLoading } = useQuery(
    'tutorCourses',
    () => api.get('/courses?limit=50').then((r) => r.data)
  )

  const { data: doubtsData } = useQuery('tutorDoubts', () =>
    api.get('/doubts?resolved=false').then((r) => r.data)
  )

  const { data: liveData } = useQuery('tutorLive', () =>
    api.get('/live-classes?upcoming=true').then((r) => r.data)
  )

  const courses    = coursesData?.courses ?? []
  const doubts     = doubtsData?.doubts ?? []
  const liveClasses = liveData?.liveClasses ?? []

  const totalStudents = courses.reduce((s: number, c: any) => s + (c._count?.enrollments ?? 0), 0)

  return (
    <TutorLayout title="Dashboard" breadcrumb="Home / Dashboard">

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="row g-6 mb-6">
        {[
          { label: 'My Courses',       value: courses.length,                               icon: 'tabler-book',        color: 'bg-label-primary' },
          { label: 'Total Students',   value: totalStudents,                                icon: 'tabler-users',       color: 'bg-label-success' },
          { label: 'Pending Doubts',   value: doubts.length,                                icon: 'tabler-help-circle', color: 'bg-label-warning' },
          { label: 'Upcoming Classes', value: liveClasses.length,                           icon: 'tabler-video',       color: 'bg-label-info'    },
        ].map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between">
                  <div>
                    <span className="text-heading">{s.label}</span>
                    <h4 className="my-1">{coursesLoading ? '—' : s.value}</h4>
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
        {/* ── Pending doubts ────────────────────────────────────────── */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Pending Doubts</h5>
              <Link href="/tutor/doubts" className="btn btn-sm btn-outline-primary">View All</Link>
            </div>
            <div className="card-body p-0">
              {doubts.length === 0 ? (
                <div className="text-center py-5 text-body-secondary">
                  <i className="ti tabler-check mb-2" style={{ fontSize: 32 }} />
                  <p className="mb-0">All doubts answered!</p>
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {doubts.slice(0, 5).map((d: any) => (
                    <li key={d.id} className="list-group-item px-4 py-3">
                      <div className="d-flex align-items-start gap-3">
                        <div className="avatar avatar-sm bg-label-warning rounded-circle flex-shrink-0">
                          <span className="avatar-initial">{d.user?.name?.[0]}</span>
                        </div>
                        <div className="flex-grow-1 min-w-0">
                          <p className="mb-1 small fw-medium text-truncate">{d.question}</p>
                          <small className="text-body-secondary">{d.user?.name} · {d.lesson?.title}</small>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ── Upcoming live classes ─────────────────────────────────── */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Upcoming Live Classes</h5>
              <Link href="/tutor/live-classes" className="btn btn-sm btn-outline-primary">Schedule</Link>
            </div>
            <div className="card-body p-0">
              {liveClasses.length === 0 ? (
                <div className="text-center py-5 text-body-secondary">
                  <i className="ti tabler-video-off mb-2" style={{ fontSize: 32 }} />
                  <p className="mb-0">No upcoming classes</p>
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {liveClasses.slice(0, 5).map((lc: any) => (
                    <li key={lc.id} className="list-group-item px-4 py-3">
                      <div className="d-flex align-items-center gap-3">
                        <div className="avatar avatar-sm bg-label-info rounded-circle flex-shrink-0">
                          <i className="ti tabler-video avatar-initial" style={{ fontSize: 14 }} />
                        </div>
                        <div className="flex-grow-1">
                          <p className="mb-0 small fw-medium">{lc.title}</p>
                          <small className="text-body-secondary">
                            {new Date(lc.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            {' · '}{lc.duration} min
                          </small>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

    </TutorLayout>
  )
}
