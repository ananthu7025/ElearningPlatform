'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useQuery } from 'react-query'
import TutorLayout from '@/components/layouts/TutorLayout'
import api from '@/lib/api'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

// ── Static chart configs ──────────────────────────────────────────────────────

const monthlyEarnings = {
  series: [{ name: 'Earnings (₹K)', data: [8, 12, 10, 15, 18, 14, 20, 17, 22, 19, 25, 28] }],
  options: {
    chart: { type: 'bar' as const, toolbar: { show: false } },
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
    colors: ['#7367F0'],
    dataLabels: { enabled: false },
    xaxis: {
      categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      labels: { style: { fontSize: '10px' } },
      axisBorder: { show: false },
      axisTicks:  { show: false },
    },
    yaxis: { show: false },
    grid: { show: false },
    tooltip: { y: { formatter: (v: number) => `₹${v}K` } },
  },
}

const weeklyEngagement = {
  series: [{ name: 'Lessons Watched', data: [42, 68, 55, 80, 74, 91, 85] }],
  options: {
    chart: { type: 'bar' as const, toolbar: { show: false } },
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
    colors: ['#7367F0'],
    dataLabels: { enabled: false },
    xaxis: {
      categories: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
      labels: { style: { fontSize: '10px' } },
      axisBorder: { show: false },
      axisTicks:  { show: false },
    },
    yaxis: { show: false },
    grid: { show: false },
    tooltip: { y: { formatter: (v: number) => `${v} views` } },
  },
}

const completionLine = {
  series: [{ data: [38, 52, 44, 63, 58, 72, 66, 79, 71, 85, 78, 91] }],
  options: {
    chart: { type: 'line' as const, sparkline: { enabled: true }, toolbar: { show: false } },
    stroke: { width: 2.5, curve: 'smooth' as const },
    colors: ['#7367F0'],
    tooltip: { x: { show: false } },
  },
}

const recentActivity = [
  { student: 'Arjun Mehta',   action: 'Lesson completed',     course: 'Criminal Law',      status: 'Active',  color: 'success', time: '8 min ago'  },
  { student: 'Sunita Kapoor', action: 'Assignment submitted', course: 'Constitutional Law', status: 'Pending', color: 'warning', time: '42 min ago' },
  { student: 'Vikram Joshi',  action: 'Doubt raised',         course: 'Evidence Act',       status: 'Active',  color: 'success', time: '1 hr ago'   },
  { student: 'Deepa Nair',    action: 'Quiz attempted',       course: 'CLAT Prep',          status: 'Active',  color: 'success', time: '2 hrs ago'  },
  { student: 'Rahul Sharma',  action: 'Course completed',     course: 'Criminal Law',       status: 'Active',  color: 'success', time: '3 hrs ago'  },
  { student: 'Priya Singh',   action: 'Enrolled',             course: 'Legal Aptitude',     status: 'New',     color: 'info',    time: '5 hrs ago'  },
]

// ── Component ─────────────────────────────────────────────────────────────────

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

  const courses      = coursesData?.courses     ?? []
  const doubts       = doubtsData?.doubts       ?? []
  const liveClasses  = liveData?.liveClasses    ?? []

  const totalStudents = courses.reduce((s: number, c: any) => s + (c._count?.enrollments ?? 0), 0)
  const activeCourses = courses.filter((c: any) => c.status === 'PUBLISHED').length
  const draftCourses  = courses.filter((c: any) => c.status === 'DRAFT').length

  // Radial chart — built from real data when available
  const archivedCourses = courses.filter((c: any) => c.status === 'ARCHIVED').length
  const radialSeries = courses.length > 0
    ? [
        Math.round((activeCourses / courses.length) * 100),
        Math.round((draftCourses  / courses.length) * 100),
        Math.round((archivedCourses / courses.length) * 100),
      ]
    : [78, 14, 8]

  const radialOptions = {
    chart: { type: 'radialBar' as const },
    plotOptions: {
      radialBar: {
        hollow: { size: '48%' },
        track: { background: 'transparent', strokeWidth: '100%', margin: 5 },
        dataLabels: {
          name:  { fontSize: '11px', offsetY: -8 },
          value: { fontSize: '14px', fontWeight: '500', offsetY: 4 },
          total: {
            show: true, label: 'Courses', fontSize: '11px', color: '#8592a3',
            formatter: () => String(courses.length || 7),
          },
        },
      },
    },
    colors: ['#28C76F', '#FF9F43', '#7367F0'],
    labels: ['Active', 'Draft', 'Archived'],
    legend: { show: false },
    stroke: { lineCap: 'round' as const },
  }

  // Top courses list (use real data, up to 5)
  const topCourses = courses.slice(0, 5).map((c: any) => ({
    name:     c.title,
    enrolled: c._count?.enrollments ?? 0,
    trend:    'up',
    pct:      '—',
  }))

  return (
    <TutorLayout title="Dashboard" breadcrumb="Home / Dashboard">
      <div className="row g-6">

        {/* ── Hero gradient card ── */}
        <div className="col-xl-6 col-12">
          <div
            className="card h-100"
            style={{
              background: 'linear-gradient(135deg, #7367F0 0%, #9E95F5 100%)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div className="card-body text-white">
              <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                  <h5 className="text-white mb-0">Teaching Overview</h5>
                  <small style={{ opacity: 0.75 }}>Your Live Metrics</small>
                </div>
                <span className="badge rounded-pill px-3 py-2" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                  <i className="ti tabler-live-view me-1" />Live
                </span>
              </div>
              <div className="row g-4 mt-1">
                {[
                  { icon: 'tabler-users',          label: 'My Students',         value: coursesLoading ? '—' : String(totalStudents), badge: 'All courses',    iconBg: 'rgba(0,207,232,0.25)',  iconColor: '#00CFE8' },
                  { icon: 'tabler-book',            label: 'Active Courses',      value: coursesLoading ? '—' : String(activeCourses),  badge: `${draftCourses} in draft`,  iconBg: 'rgba(40,199,111,0.25)', iconColor: '#28C76F' },
                  { icon: 'tabler-help-circle',     label: 'Pending Doubts',      value: coursesLoading ? '—' : String(doubts.length),  badge: 'Unanswered',    iconBg: 'rgba(255,159,67,0.25)', iconColor: '#FF9F43' },
                  { icon: 'tabler-video',           label: 'Upcoming Classes',    value: coursesLoading ? '—' : String(liveClasses.length), badge: 'Scheduled', iconBg: 'rgba(234,84,85,0.25)',  iconColor: '#EA5455' },
                ].map((s) => (
                  <div key={s.label} className="col-6">
                    <div className="d-flex align-items-center gap-3">
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`ti ${s.icon}`} style={{ fontSize: 22, color: s.iconColor }} />
                      </div>
                      <div>
                        <h4 className="text-white mb-0 fw-bold">{s.value}</h4>
                        <small style={{ opacity: 0.72, color: '#fff' }}>{s.label}</small>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="badge rounded-pill small" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                        {s.badge}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Decorative circles */}
            <div style={{ position: 'absolute', bottom: -60, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'absolute', bottom: -20, right: 60,  width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.09)' }} />
          </div>
        </div>

        {/* ── Monthly Earnings (static chart) ── */}
        <div className="col-xl-3 col-sm-6 col-12">
          <div className="card h-100">
            <div className="card-header pb-0">
              <h5 className="mb-1 card-title">Monthly Earnings</h5>
              <p className="mb-0 text-body">Total Earnings This Month</p>
              <h4 className="mb-0">₹48K</h4>
            </div>
            <div className="card-body px-0 pb-0">
              <Chart type="bar" height={130} series={monthlyEarnings.series} options={monthlyEarnings.options} />
            </div>
          </div>
        </div>

        {/* ── Student Status ── */}
        <div className="col-xl-3 col-sm-6 col-12">
          <div className="card h-100">
            <div className="card-header">
              <div className="d-flex justify-content-between">
                <p className="mb-0 text-body">Student Status</p>
                <p className="card-text fw-medium text-success">+5.2%</p>
              </div>
              <h4 className="card-title mb-1">{coursesLoading ? '—' : `${totalStudents} Total`}</h4>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-4">
                  <div className="d-flex gap-2 align-items-center mb-2">
                    <span className="badge bg-label-success p-1 rounded">
                      <i className="icon-base ti tabler-user-check icon-sm" />
                    </span>
                    <p className="mb-0">Active</p>
                  </div>
                  <h5 className="mb-0 pt-1">83.9%</h5>
                  <small className="text-body-secondary">{Math.round(totalStudents * 0.84)}</small>
                </div>
                <div className="col-4">
                  <div className="divider divider-vertical">
                    <div className="divider-text">
                      <span className="badge-divider-bg bg-label-secondary">VS</span>
                    </div>
                  </div>
                </div>
                <div className="col-4 text-end">
                  <div className="d-flex gap-2 justify-content-end align-items-center mb-2">
                    <p className="mb-0">Inactive</p>
                    <span className="badge bg-label-warning p-1 rounded">
                      <i className="icon-base ti tabler-user-x icon-sm" />
                    </span>
                  </div>
                  <h5 className="mb-0 pt-1">16.1%</h5>
                  <small className="text-body-secondary">{Math.round(totalStudents * 0.16)}</small>
                </div>
              </div>
              <div className="d-flex align-items-center mt-4">
                <div className="progress w-100" style={{ height: 10 }}>
                  <div className="progress-bar bg-success" style={{ width: '84%' }} role="progressbar" />
                  <div className="progress-bar bg-warning" style={{ width: '10%' }} role="progressbar" />
                  <div className="progress-bar bg-danger"  style={{ width: '6%'  }} role="progressbar" />
                </div>
              </div>
              <div className="d-flex justify-content-between mt-2">
                <small className="text-success">{Math.round(totalStudents * 0.84)} Active</small>
                <small className="text-danger">{Math.round(totalStudents * 0.06)} At Risk</small>
              </div>
            </div>
          </div>
        </div>

        {/* ── Engagement Reports ── */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header pb-0 d-flex justify-content-between">
              <div className="card-title mb-0">
                <h5 className="mb-1">Engagement Reports</h5>
                <p className="card-subtitle">Weekly Student Activity</p>
              </div>
              <div className="dropdown">
                <button className="btn btn-text-secondary rounded-pill text-body-secondary border-0 p-2 me-n1" type="button" data-bs-toggle="dropdown">
                  <i className="icon-base ti tabler-dots-vertical icon-md text-body-secondary" />
                </button>
                <div className="dropdown-menu dropdown-menu-end">
                  <Link className="dropdown-item" href="#">Download CSV</Link>
                  <Link className="dropdown-item" href="#">Refresh</Link>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="row align-items-center g-md-8">
                <div className="col-12 col-md-5 d-flex flex-column">
                  <div className="d-flex gap-2 align-items-center mb-3 flex-wrap">
                    <h2 className="mb-0">495</h2>
                    <div className="badge rounded bg-label-success">+24.3%</div>
                  </div>
                  <small className="text-body">Lessons watched this week</small>
                </div>
                <div className="col-12 col-md-7 ps-xl-8">
                  <Chart type="bar" height={120} series={weeklyEngagement.series} options={weeklyEngagement.options} />
                </div>
              </div>
              <div className="border rounded p-4 mt-4">
                <div className="row gap-4 gap-sm-0">
                  {[
                    { color: 'primary', icon: 'tabler-movie',      label: 'Lessons Watched', value: '495', pct: 74 },
                    { color: 'info',    icon: 'tabler-edit',        label: 'Quizzes Taken',   value: '138', pct: 52 },
                    { color: 'danger',  icon: 'tabler-help-circle', label: 'Doubts Raised',   value: String(doubts.length), pct: 18 },
                  ].map((r) => (
                    <div key={r.label} className="col-12 col-sm-4">
                      <div className="d-flex gap-2 align-items-center">
                        <div className={`badge rounded bg-label-${r.color} p-1`}>
                          <i className={`icon-base ti ${r.icon} icon-18px`} />
                        </div>
                        <h6 className="mb-0 fw-normal">{r.label}</h6>
                      </div>
                      <h4 className="my-2">{r.value}</h4>
                      <div className="progress w-75" style={{ height: 4 }}>
                        <div className={`progress-bar bg-${r.color}`} style={{ width: `${r.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Course Tracker (radial chart) ── */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between">
              <div className="card-title mb-0">
                <h5 className="mb-1">Course Tracker</h5>
                <p className="card-subtitle">Last 30 Days</p>
              </div>
              <div className="dropdown">
                <button className="btn btn-text-secondary rounded-pill text-body-secondary border-0 p-2 me-n1" type="button" data-bs-toggle="dropdown">
                  <i className="icon-base ti tabler-dots-vertical icon-md text-body-secondary" />
                </button>
                <div className="dropdown-menu dropdown-menu-end">
                  <Link className="dropdown-item" href="/tutor/courses">View All</Link>
                </div>
              </div>
            </div>
            <div className="card-body row">
              <div className="col-12 col-sm-4">
                <div className="mt-lg-4 mb-lg-6 mb-2">
                  <h2 className="mb-0">{courses.length || 7}</h2>
                  <p className="mb-0">Total Courses</p>
                </div>
                <ul className="p-0 m-0 list-unstyled">
                  {[
                    { icon: 'tabler-book-2',    color: 'primary', label: 'Active',   count: activeCourses  || 5 },
                    { icon: 'tabler-pencil',    color: 'warning', label: 'Draft',    count: draftCourses   || 2 },
                    { icon: 'tabler-archive',   color: 'danger',  label: 'Archived', count: archivedCourses || 0 },
                  ].map((s) => (
                    <li key={s.label} className="d-flex gap-4 align-items-center mb-lg-3 pb-1">
                      <div className={`badge rounded bg-label-${s.color} p-1_5`}>
                        <i className={`icon-base ti ${s.icon} icon-md`} />
                      </div>
                      <div>
                        <h6 className="mb-0 text-nowrap">{s.label}</h6>
                        <small className="text-body-secondary">{s.count}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-12 col-md-8">
                <Chart type="radialBar" height={250} series={radialSeries} options={radialOptions} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Top Courses ── */}
        <div className="col-xxl-4 col-md-6 order-1 order-xl-0">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between">
              <div className="card-title mb-0">
                <h5 className="mb-1">Top Courses</h5>
                <p className="card-subtitle">By Enrollment</p>
              </div>
              <div className="dropdown">
                <button className="btn btn-text-secondary btn-icon rounded-pill text-body-secondary border-0 me-n1" type="button" data-bs-toggle="dropdown">
                  <i className="icon-base ti tabler-dots-vertical icon-22px text-body-secondary" />
                </button>
                <div className="dropdown-menu dropdown-menu-end">
                  <Link className="dropdown-item" href="/tutor/courses">View All</Link>
                </div>
              </div>
            </div>
            <div className="card-body">
              {coursesLoading ? (
                <div className="text-center py-4 text-body-secondary">
                  <div className="spinner-border spinner-border-sm" />
                </div>
              ) : topCourses.length === 0 ? (
                <div className="text-center py-4 text-body-secondary">No courses yet</div>
              ) : (
                <ul className="p-0 m-0 list-unstyled">
                  {topCourses.map((course: any, i: number) => (
                    <li key={course.name} className={`d-flex align-items-center ${i < topCourses.length - 1 ? 'mb-4' : ''}`}>
                      <div className="avatar flex-shrink-0 me-4">
                        <span className="avatar-initial rounded-circle bg-label-primary">{course.name[0]}</span>
                      </div>
                      <div className="d-flex w-100 flex-wrap align-items-center justify-content-between gap-2">
                        <div className="me-2">
                          <div className="d-flex align-items-center">
                            <h6 className="mb-0 me-1">{course.enrolled} students</h6>
                          </div>
                          <small className="text-body">{course.name}</small>
                        </div>
                        <p className="text-success fw-medium mb-0 d-flex align-items-center gap-1">
                          <i className="icon-base ti tabler-chevron-up" />
                          {course.pct}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ── Completion Health (sparkline) ── */}
        <div className="col-xxl-4 col-md-6 col-12 order-2 order-xl-0">
          <div className="card h-100">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 card-title">Completion Health</h5>
                <div className="dropdown">
                  <button className="btn btn-text-secondary rounded-pill text-body-secondary border-0 p-2 me-n1" type="button" data-bs-toggle="dropdown">
                    <i className="icon-base ti tabler-dots-vertical icon-md text-body-secondary" />
                  </button>
                  <div className="dropdown-menu dropdown-menu-end">
                    <Link className="dropdown-item" href="#">Refresh</Link>
                  </div>
                </div>
              </div>
              <div className="d-flex align-items-center">
                <h2 className="mb-0 me-2">74%</h2>
                <i className="icon-base ti tabler-chevron-up text-success me-1" />
                <h6 className="text-success mb-0">5.2%</h6>
              </div>
            </div>
            <div className="card-body">
              <Chart type="line" height={120} series={completionLine.series} options={completionLine.options} />
              <div className="d-flex align-items-start my-4">
                <div className="badge rounded bg-label-primary p-2 me-4">
                  <i className="icon-base ti tabler-users icon-md" />
                </div>
                <div className="d-flex justify-content-between w-100 gap-2 align-items-center">
                  <div className="me-2">
                    <h6 className="mb-0">New Enrollments</h6>
                    <small className="text-body">This month</small>
                  </div>
                  <h6 className="mb-0 text-success">+18</h6>
                </div>
              </div>
              <div className="d-flex align-items-start">
                <div className="badge rounded bg-label-secondary p-2 me-4">
                  <i className="icon-base ti tabler-trophy icon-md" />
                </div>
                <div className="d-flex justify-content-between w-100 gap-2 align-items-center">
                  <div className="me-2">
                    <h6 className="mb-0">Course Completions</h6>
                    <small className="text-body">This month</small>
                  </div>
                  <h6 className="mb-0 text-success">+14</h6>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="col-xxl-4 col-md-6 col-12">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div className="card-title mb-0">
                <h5 className="mb-1">Quick Actions</h5>
                <p className="card-subtitle">Teaching Tools</p>
              </div>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {[
                  { icon: 'tabler-calendar-plus',  label: 'Schedule Class',    sub: 'Live session',   href: '/tutor/live-classes', color: 'info',      variant: 'btn-outline-info'      },
                  { icon: 'tabler-messages',        label: 'Answer Doubts',     sub: `${doubts.length} pending`,  href: '/tutor/doubts',       color: 'warning',   variant: 'btn-outline-warning'   },
                  { icon: 'tabler-file-check',      label: 'Grade Assignments', sub: 'Unreviewed',     href: '/tutor/assignments',  color: 'danger',    variant: 'btn-outline-danger'    },
                  { icon: 'tabler-users',           label: 'Student Progress',  sub: 'View all',       href: '/tutor/students',     color: 'primary',   variant: 'btn-primary'           },
                  { icon: 'tabler-book',            label: 'My Courses',        sub: 'Manage',         href: '/tutor/courses',      color: 'success',   variant: 'btn-outline-success'   },
                  { icon: 'tabler-flask',           label: 'Practice Lab',      sub: 'Scenarios',      href: '/tutor/practice-lab', color: 'secondary', variant: 'btn-outline-secondary' },
                ].map((a) => (
                  <div key={a.label} className="col-6">
                    <Link
                      href={a.href}
                      className={`btn ${a.variant} d-flex flex-column align-items-center justify-content-center gap-2 w-100 py-3`}
                      style={{ minHeight: 90, borderRadius: 10 }}
                    >
                      <i className={`ti ${a.icon}`} style={{ fontSize: 24 }} />
                      <div className="text-center">
                        <div className="fw-semibold" style={{ fontSize: 12, lineHeight: 1.3 }}>{a.label}</div>
                        <div style={{ fontSize: 10, opacity: 0.75, lineHeight: 1.2 }}>{a.sub}</div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Recent Activity ── */}
        <div className="col-xxl-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between">
              <div className="card-title mb-0">
                <h5 className="mb-1">Recent Activity</h5>
                <p className="card-subtitle">Student events in your courses</p>
              </div>
              <div className="dropdown">
                <button className="btn btn-text-secondary rounded-pill text-body-secondary border-0 p-2 me-n1" type="button" data-bs-toggle="dropdown">
                  <i className="icon-base ti tabler-dots-vertical icon-md text-body-secondary" />
                </button>
                <div className="dropdown-menu dropdown-menu-end">
                  <Link className="dropdown-item" href="/tutor/students">View All Students</Link>
                  <Link className="dropdown-item" href="/tutor/courses">View Courses</Link>
                </div>
              </div>
            </div>
            <div className="table-responsive mb-4">
              <table className="table table-hover table-sm">
                <thead className="border-top">
                  <tr>
                    <th>Student</th>
                    <th>Action</th>
                    <th>Course</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((a, i) => (
                    <tr key={i}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="avatar avatar-sm">
                            <span className="avatar-initial rounded-circle bg-label-primary">{a.student[0]}</span>
                          </div>
                          <span className="fw-medium">{a.student}</span>
                        </div>
                      </td>
                      <td className="text-body">{a.action}</td>
                      <td><span className="badge bg-label-primary rounded-pill">{a.course}</span></td>
                      <td><span className={`badge bg-label-${a.color} rounded-pill`}>{a.status}</span></td>
                      <td><small className="text-body-secondary">{a.time}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Pending doubts ── */}
        <div className="col-xxl-4 col-lg-6">
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

        {/* ── Upcoming live classes ── */}
        <div className="col-xxl-4 col-lg-6">
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
