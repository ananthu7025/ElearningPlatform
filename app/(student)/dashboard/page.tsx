'use client'

import { useQuery } from 'react-query'
import Link from 'next/link'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

// Mock data for the premium components that dont have API endpoints yet
const topics = [
  { label: 'Criminal Law',       pct: 42, color: 'primary'   },
  { label: 'Constitutional Law', pct: 28, color: 'info'      },
  { label: 'CLAT / Judiciary',   pct: 18, color: 'success'   },
  { label: 'Evidence Act',       pct: 7,  color: 'warning'   },
  { label: 'Civil Law',          pct: 5,  color: 'danger'    },
];

const topCourses = [
  { icon: 'tabler-gavel',       label: 'Criminal Law Fundamentals',  views: '1.2k', color: 'primary' },
  { icon: 'tabler-book',        label: 'Constitutional Law Mastery', views: '980',  color: 'info'    },
  { icon: 'tabler-certificate', label: 'CLAT 2025 Preparation',      views: '3.7k', color: 'success' },
];

export default function StudentDashboard() {
  const { user } = useAuthStore()
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
    <StudentLayout>
      
      {/* ── Welcome banner + Stats ── */}
      <div className="card bg-transparent shadow-none mb-6 border-0">
        <div className="card-body row p-0 pb-6 g-6">
          <div className="col-12 col-lg-8 card-separator">
            <h5 className="mb-2">Welcome back, <span className="h4">{user?.name?.split(' ')[0] ?? 'Student'}</span> 👋</h5>
            <div className="col-12 col-lg-8">
              <p>Your progress this week is Awesome. Keep it up and earn more reward points!</p>
            </div>

            <div className="d-flex justify-content-between flex-wrap gap-4 me-12">
              {/* Hours Spent */}
              <div className="d-flex align-items-center gap-4">
                <div className="avatar avatar-lg">
                  <div className="avatar-initial bg-label-primary rounded">
                    <i className="ti tabler-clock icon-22px"></i>
                  </div>
                </div>
                <div>
                  <p className="mb-0 fw-medium">Time Spent</p>
                  <h4 className="text-primary mb-0">12h 30m</h4>
                </div>
              </div>

              {/* Course Enrolled */}
              <div className="d-flex align-items-center gap-4">
                <div className="avatar avatar-lg">
                  <div className="avatar-initial bg-label-info rounded">
                    <i className="ti tabler-book icon-22px"></i>
                  </div>
                </div>
                <div>
                  <p className="mb-0 fw-medium">Enrolled</p>
                  <h4 className="text-info mb-0">{isLoading ? '—' : enrollments.length}</h4>
                </div>
              </div>

              {/* Completed */}
              <div className="d-flex align-items-center gap-4">
                <div className="avatar avatar-lg">
                  <div className="avatar-initial bg-label-warning rounded">
                    <i className="ti tabler-star icon-22px"></i>
                  </div>
                </div>
                <div>
                  <p className="mb-0 fw-medium">Completed</p>
                  <h4 className="text-warning mb-0">{isLoading ? '—' : completed.length}</h4>
                </div>
              </div>
            </div>
          </div>

          {/* Right side — Time Spending simple bar visual */}
          <div className="col-12 col-lg-4 ps-md-4 ps-lg-6">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h5 className="mb-1">Time Spendings</h5>
                <p className="mb-6 text-body-secondary">Weekly report</p>
                <div>
                  <h4 className="mb-2">12<span className="text-body fw-normal">h</span> 30<span className="text-body fw-normal">m</span></h4>
                  <span className="badge bg-label-success">+18.2%</span>
                </div>
              </div>
              <div className="d-flex align-items-end gap-1" style={{ height: 80 }}>
                {[40, 65, 50, 80, 55, 90, 70].map((h, i) => (
                  <div key={i} className="rounded-top" style={{ width: 10, height: `${h}%`, background: i === 5 ? '#7367F0' : '#7367F020' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-6 mb-6">
        {/* Topic you are interested in */}
        <div className="col-12 col-xl-8">
          <div className="card h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title m-0 me-2">Topic you are interested in</h5>
            </div>
            <div className="card-body row g-3">
              <div className="col-md-8">
                {topics.map(t => (
                  <div key={t.label} className="mb-5">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small text-heading">{t.label}</span>
                      <span className="small fw-semibold">{t.pct}%</span>
                    </div>
                    <div className="progress" style={{ height: 8 }}>
                      <div className={`progress-bar bg-${t.color}`} role="progressbar" style={{ width: `${t.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="col-md-4 d-flex flex-column justify-content-center gap-4">
                {topics.slice(0, 3).map(t => (
                  <div key={t.label} className="d-flex align-items-center">
                    <span className={`text-${t.color} me-2`}><i className="ti tabler-circle-filled icon-8px"></i></span>
                    <div>
                      <p className="mb-0 small">{t.label}</p>
                      <h6 className="mb-0">{t.pct}%</h6>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top Courses */}
        <div className="col-12 col-xl-4 col-md-6">
          <div className="card h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title m-0">Top Courses</h5>
            </div>
            <div className="card-body">
              <ul className="list-unstyled mb-0">
                {topCourses.map((c, i) => (
                  <li key={c.label} className={`d-flex align-items-center ${i < topCourses.length - 1 ? 'mb-6' : ''}`}>
                    <div className="avatar flex-shrink-0 me-4">
                      <span className={`avatar-initial rounded bg-label-${c.color}`}>
                        <i className={`ti ${c.icon} icon-lg`}></i>
                      </span>
                    </div>
                    <div className="d-flex flex-column w-100">
                      <h6 className="mb-1">{c.label}</h6>
                      <small className="text-body-secondary">{c.views} Views</small>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Upcoming Live Class Promotion */}
        <div className="col-12 col-xl-4 col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="bg-label-primary rounded-3 text-center mb-4 pt-6">
                <img className="img-fluid" src="/vendor/img/illustrations/page-pricing-enterprise-light.png" alt="Upcoming" width={140} />
              </div>
              <h5 className="mb-2">Next Live Class</h5>
              {liveClasses.length > 0 ? (
                <>
                  <p className="small mb-4">{liveClasses[0].title}</p>
                  <div className="d-flex align-items-center gap-3 mb-4">
                    <div className="avatar bg-label-primary rounded"><i className="ti tabler-calendar-event"></i></div>
                    <div><h6 className="mb-0">{new Date(liveClasses[0].scheduledAt).toLocaleDateString()}</h6><small>Date</small></div>
                  </div>
                  <Link href={`/courses/${liveClasses[0].courseId}`} className="btn btn-primary w-100">Join the class</Link>
                </>
              ) : (
                <p className="text-body-secondary small">No upcoming live classes scheduled yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Continue Learning Table */}
        <div className="col-12 col-xl-8">
          <div className="card h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title m-0">Continue Learning</h5>
              <Link href="/courses" className="btn btn-sm btn-label-primary">View All</Link>
            </div>
            <div className="table-responsive">
              <table className="table table-hover border-top mb-0">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Progress</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inProgress.length > 0 ? (
                    inProgress.map((e: any) => (
                      <tr key={e.id}>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <div className="avatar rounded bg-label-primary"><i className="ti tabler-book"></i></div>
                            <span className="fw-semibold text-heading">{e.course.title}</span>
                          </div>
                        </td>
                        <td style={{ minWidth: 150 }}>
                          <div className="d-flex align-items-center gap-2">
                            <div className="progress flex-grow-1" style={{ height: 6 }}>
                              <div className="progress-bar bg-primary" style={{ width: `${e.completionPct}%` }}></div>
                            </div>
                            <small className="fw-semibold">{e.completionPct}%</small>
                          </div>
                        </td>
                        <td>
                          <Link href={`/courses/${e.courseId}`} className="btn btn-sm btn-label-primary">Resume</Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="text-center py-5 text-body-secondary">No courses in progress</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  )
}
