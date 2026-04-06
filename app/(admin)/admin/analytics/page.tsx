'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useQuery } from 'react-query'
import AdminLayout from '@/components/layouts/AdminLayout'
import api from '@/lib/api'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const avatarColors = ['primary', 'success', 'info', 'warning', 'danger']
const avatarColor  = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length]
const initials     = (name: string) => name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

// ── Upgrade Wall component ────────────────────────────────────────────────────

function UpgradeWall({ feature, planNeeded }: { feature: string; planNeeded: string }) {
  return (
    <div className="card">
      <div className="card-body text-center py-6">
        <div
          className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-4"
          style={{ width: 72, height: 72, background: '#7367F015' }}
        >
          <i className="ti tabler-lock" style={{ fontSize: 32, color: '#7367F0' }}></i>
        </div>
        <h5 className="fw-bold mb-2">{feature} is locked</h5>
        <p className="text-body-secondary mb-4">
          This feature is available on the <strong>{planNeeded}</strong> plan and above.
        </p>
        <a href="/admin/settings" className="btn btn-primary">
          <i className="ti tabler-arrow-up-circle me-1"></i>Upgrade Plan
        </a>
      </div>
    </div>
  )
}

// ── Tab locked overlay ─────────────────────────────────────────────────────────

function LockedTab({ label, planNeeded }: { label: string; planNeeded: string }) {
  return (
    <div className="card">
      <div className="card-body text-center py-6">
        <div
          className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-4"
          style={{ width: 64, height: 64, background: '#7367F015' }}
        >
          <i className="ti tabler-lock" style={{ fontSize: 28, color: '#7367F0' }}></i>
        </div>
        <h5 className="fw-bold mb-2">{label} — Locked</h5>
        <p className="text-body-secondary mb-4">
          Upgrade to <strong>{planNeeded}</strong> to unlock this report.
        </p>
        <a href="/admin/settings" className="btn btn-sm btn-primary">
          <i className="ti tabler-arrow-up-circle me-1"></i>Upgrade Plan
        </a>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [tab, setTab] = useState(0)

  // ── Queries ──────────────────────────────────────────────────────────
  const { data: dash, isLoading: dashLoading } = useQuery(
    'analyticsDashboard',
    () => api.get('/analytics/dashboard').then((r) => r.data),
  )

  const hasBasic    = (dash?.plan?.features as string[] | undefined)?.includes('basic_analytics')    ?? false
  const hasAdvanced = (dash?.plan?.features as string[] | undefined)?.includes('advanced_analytics') ?? false
  const hasLive     = (dash?.plan?.features as string[] | undefined)?.includes('live_classes')       ?? false
  const hasPractice = (dash?.plan?.features as string[] | undefined)?.includes('practice_lab')       ?? false
  const planName    = dash?.plan?.name ?? ''

  const { data: revData } = useQuery(
    'analyticsRevenue',
    () => api.get('/analytics/revenue').then((r) => r.data),
    { enabled: hasBasic },
  )

  const { data: studData } = useQuery(
    'analyticsStudents',
    () => api.get('/analytics/students').then((r) => r.data),
    { enabled: hasAdvanced },
  )

  const { data: compData } = useQuery(
    'analyticsCompletion',
    () => api.get('/analytics/completion').then((r) => r.data),
    { enabled: hasAdvanced },
  )

  const { data: attData } = useQuery(
    'analyticsAttendance',
    () => api.get('/analytics/attendance').then((r) => r.data),
    { enabled: hasAdvanced && hasLive },
  )

  const { data: labData } = useQuery(
    'analyticsPracticeLab',
    () => api.get('/analytics/practice-lab').then((r) => r.data),
    { enabled: hasAdvanced && hasPractice },
  )

  // ── Build tab list ───────────────────────────────────────────────────
  const ALL_TABS = [
    { id: 0, label: 'Student Performance', icon: 'tabler-chart-bar',       locked: !hasBasic,             planNeeded: 'Basic'    },
    { id: 1, label: 'Revenue',             icon: 'tabler-currency-rupee',   locked: !hasBasic,             planNeeded: 'Basic'    },
    { id: 2, label: 'Course Completion',   icon: 'tabler-circle-check',     locked: !hasAdvanced,          planNeeded: 'Advanced' },
    { id: 3, label: 'Attendance',          icon: 'tabler-calendar-check',   locked: !hasAdvanced||!hasLive, planNeeded: 'Advanced' },
    { id: 4, label: 'Practice Lab',        icon: 'tabler-flask',            locked: !hasAdvanced||!hasPractice, planNeeded: 'Advanced' },
  ]

  // Revenue chart options
  const revenueChart = {
    series: [{ name: 'Revenue (₹)', data: revData?.months?.map((m: any) => m.amount) ?? [] }],
    options: {
      chart: { type: 'bar' as const, toolbar: { show: false } },
      plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
      colors: ['#7367F0'],
      dataLabels: { enabled: false },
      xaxis: {
        categories: revData?.months?.map((m: any) => m.label) ?? [],
        labels: { style: { fontSize: '10px' } },
        axisBorder: { show: false },
        axisTicks:  { show: false },
      },
      yaxis: { labels: { formatter: (v: number) => `₹${(v / 1000).toFixed(0)}k`, style: { fontSize: '10px' } } },
      grid: { borderColor: '#f1f1f1' },
      tooltip: { y: { formatter: (v: number) => fmtINR(v) } },
    },
  }

  // ── If no analytics at all, show full upgrade wall ──────────────────
  if (!dashLoading && !hasBasic) {
    return (
      <AdminLayout title="Analytics" breadcrumb="Home / Analytics">
        <div className="card p-0 mb-6 overflow-hidden">
          <div className="card-body text-center py-6 px-4">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-4"
              style={{ width: 80, height: 80, background: '#7367F015' }}
            >
              <i className="ti tabler-chart-bar" style={{ fontSize: 38, color: '#7367F0' }}></i>
            </div>
            <h4 className="fw-bold mb-2">Analytics not available on your plan</h4>
            <p className="text-body-secondary mb-4">
              Upgrade to the <strong>Basic</strong> plan or above to access analytics and reports for your institute.
            </p>
            <a href="/admin/settings" className="btn btn-primary px-5">
              <i className="ti tabler-arrow-up-circle me-2"></i>View Plans &amp; Upgrade
            </a>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Analytics" breadcrumb="Home / Analytics">

      {/* ── Hero Card ──────────────────────────────────────────────────── */}
      <div className="card p-0 mb-6 overflow-hidden">
        <div
          className="card-body p-5"
          style={{ background: 'linear-gradient(135deg, #7367F0 0%, #9E95F5 100%)', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: -50,  right: -50,  width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }}></div>
          <div style={{ position: 'absolute', bottom: -70, right: 120, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }}></div>

          <div className="row align-items-center g-4 position-relative">
            <div className="col-12 col-md">
              <p className="mb-1 fw-semibold" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Analytics Overview</p>
              <h2 className="fw-bold mb-1" style={{ color: '#fff', fontSize: 36, lineHeight: 1.1 }}>Institute Reports</h2>
              <p className="mb-4" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                <i className="ti tabler-crown me-1"></i>{planName} Plan
                {!hasAdvanced && (
                  <a href="/admin/settings" className="ms-2 badge bg-warning text-dark text-decoration-none" style={{ fontSize: 10 }}>
                    Upgrade for Advanced Reports
                  </a>
                )}
              </p>
              <div className="d-flex flex-wrap gap-3">
                {[
                  { label: 'Total Students',  val: dashLoading ? '—' : (dash?.totalStudents ?? 0).toLocaleString() },
                  { label: 'Revenue',         val: dashLoading ? '—' : fmtINR(dash?.totalRevenue ?? 0) },
                  { label: 'Completions',     val: dashLoading ? '—' : (dash?.totalCompletions ?? 0).toLocaleString() },
                  { label: 'Certificates',    val: dashLoading ? '—' : (dash?.totalCertificates ?? 0).toLocaleString() },
                ].map((q) => (
                  <div key={q.label} className="rounded-3 px-3 py-2" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>{q.val}</div>
                    <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>{q.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Nav ────────────────────────────────────────────────────── */}
      <div className="card mb-6">
        <div className="card-body py-0 px-5">
          <ul className="nav nav-tabs border-0 flex-wrap">
            {ALL_TABS.map((t) => (
              <li key={t.id} className="nav-item">
                <button
                  className={`nav-link d-flex align-items-center gap-2 py-4 px-3 border-0 border-bottom border-2 ${
                    tab === t.id ? 'active border-primary text-primary fw-semibold' : 'border-transparent text-body-secondary'
                  }`}
                  style={{ background: 'none', borderRadius: 0 }}
                  onClick={() => setTab(t.id)}
                >
                  <i className={`ti ${t.icon}`}></i>
                  {t.label}
                  {t.locked && <i className="ti tabler-lock ms-1" style={{ fontSize: 11, opacity: 0.6 }}></i>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Tab 0: Student Performance ─────────────────────────────────── */}
      {tab === 0 && !ALL_TABS[0].locked && (
        <div>
          {/* KPI cards — advanced only */}
          {hasAdvanced ? (
            <div className="row g-6 mb-6">
              {[
                { icon: 'tabler-chart-pie',  color: 'primary', val: `${studData?.kpi?.avgCompletion ?? '—'}%`, label: 'Avg Completion Rate' },
                { icon: 'tabler-notes',      color: 'info',    val: `${studData?.kpi?.avgQuizScore  ?? '—'}%`, label: 'Avg Quiz Score'      },
                { icon: 'tabler-zzz',        color: 'warning', val: studData?.kpi?.inactiveCount  ?? '—',       label: 'Inactive (7+ days)'  },
                { icon: 'tabler-trophy',     color: 'success', val: studData?.kpi?.completedCount ?? '—',       label: 'Completed All Courses'},
              ].map((s) => (
                <div key={s.label} className="col-sm-6 col-xl-3">
                  <div className="card">
                    <div className="card-body">
                      <div className="d-flex align-items-start justify-content-between">
                        <div>
                          <span className="text-heading">{s.label}</span>
                          <h4 className="my-1">{s.val}</h4>
                        </div>
                        <div className="avatar">
                          <span className={`avatar-initial rounded bg-label-${s.color}`}>
                            <i className={`icon-base ti ${s.icon} icon-26px`}></i>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Basic plan — summary stat cards only */
            <div className="row g-6 mb-6">
              {[
                { label: 'Total Students',    val: dash?.totalStudents ?? '—',    icon: 'tabler-users',       color: 'primary' },
                { label: 'New This Month',    val: dash?.recentEnrollments ?? '—', icon: 'tabler-user-plus',  color: 'info'    },
                { label: 'Completions',       val: dash?.totalCompletions ?? '—', icon: 'tabler-circle-check', color: 'success' },
                { label: 'Certificates',      val: dash?.totalCertificates ?? '—', icon: 'tabler-trophy',     color: 'warning' },
              ].map((s) => (
                <div key={s.label} className="col-sm-6 col-xl-3">
                  <div className="card">
                    <div className="card-body">
                      <div className="d-flex align-items-start justify-content-between">
                        <div>
                          <span className="text-heading">{s.label}</span>
                          <h4 className="my-1">{s.val}</h4>
                        </div>
                        <div className="avatar">
                          <span className={`avatar-initial rounded bg-label-${s.color}`}>
                            <i className={`icon-base ti ${s.icon} icon-26px`}></i>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Detailed student table — advanced only */}
          {hasAdvanced ? (
            <div className="card">
              <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-3 border-bottom py-4">
                <div>
                  <h5 className="card-title mb-0">Student Performance</h5>
                  <small className="text-body-secondary">{studData?.students?.length ?? 0} students</small>
                </div>
              </div>
              <div className="card-body p-0">
                {!studData ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="d-flex align-items-center gap-3 px-5 py-3 border-bottom">
                      <span className="placeholder rounded-circle" style={{ width: 38, height: 38 }}></span>
                      <span className="placeholder col-3"></span>
                      <span className="placeholder col-2 ms-auto"></span>
                    </div>
                  ))
                ) : (studData.students ?? []).map((s: any, i: number) => (
                  <div
                    key={s.id}
                    className={`d-flex align-items-center gap-3 px-5 py-3${i < studData.students.length - 1 ? ' border-bottom' : ''}`}
                  >
                    <div className="avatar flex-shrink-0">
                      {s.avatarUrl
                        ? <img src={s.avatarUrl} className="rounded-circle" alt={s.name} />
                        : <span className={`avatar-initial rounded-circle bg-label-${avatarColor(s.name)}`}>{initials(s.name)}</span>
                      }
                    </div>
                    <div style={{ minWidth: 140, flex: '0 0 140px' }}>
                      <div className="fw-semibold text-heading">{s.name}</div>
                      <small className="text-body-secondary">{s.courseCount} course{s.courseCount !== 1 ? 's' : ''}</small>
                    </div>
                    <div className="flex-grow-1 d-none d-md-block" style={{ minWidth: 0 }}>
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress flex-grow-1" style={{ height: 6 }}>
                          <div
                            className={`progress-bar bg-${s.avgProgress === 100 ? 'success' : s.avgProgress > 50 ? 'primary' : 'warning'}`}
                            style={{ width: `${s.avgProgress}%` }}
                          ></div>
                        </div>
                        <small className="fw-semibold text-nowrap" style={{ minWidth: 36 }}>{s.avgProgress}%</small>
                      </div>
                      <small className="text-body-secondary">Progress</small>
                    </div>
                    <div className="text-center d-none d-lg-block" style={{ minWidth: 70 }}>
                      <div className="fw-semibold">{s.quizCount}</div>
                      <small className="text-body-secondary">Quizzes</small>
                    </div>
                    <div className="text-center d-none d-lg-block" style={{ minWidth: 70 }}>
                      <div className="fw-semibold">{s.avgScore !== null ? `${s.avgScore}%` : '—'}</div>
                      <small className="text-body-secondary">Quiz Avg</small>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`badge ${s.status === 'Active' ? 'bg-label-success' : s.status === 'Completed' ? 'bg-label-primary' : 'bg-label-secondary'}`}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body d-flex flex-wrap align-items-center gap-3 py-4">
                <div className="badge rounded bg-label-info p-2 flex-shrink-0">
                  <i className="icon-base ti tabler-chart-bar icon-md"></i>
                </div>
                <div className="flex-grow-1">
                  <div className="fw-semibold text-heading">Detailed student performance table</div>
                  <small className="text-body-secondary">Upgrade to Advanced Analytics to see per-student progress, quiz scores, and activity.</small>
                </div>
                <a href="/admin/settings" className="btn btn-sm btn-primary flex-shrink-0">Upgrade</a>
              </div>
            </div>
          )}
        </div>
      )}
      {tab === 0 && ALL_TABS[0].locked && <LockedTab label="Student Performance" planNeeded="Basic" />}

      {/* ── Tab 1: Revenue ─────────────────────────────────────────────── */}
      {tab === 1 && !ALL_TABS[1].locked && (
        <div className="row g-6">
          <div className="col-12">
            <div className="row g-6">
              {[
                { icon: 'tabler-trending-up',      color: 'primary', val: fmtINR(dash?.totalRevenue ?? 0),     label: 'Total Revenue'  },
                { icon: 'tabler-circle-check',     color: 'success', val: (revData?.stats?.paidCount ?? '—'),   label: 'Paid Txns'      },
                { icon: 'tabler-clock',            color: 'warning', val: fmtINR(revData?.stats?.pendingAmount ?? 0), label: 'Pending'   },
                { icon: 'tabler-corner-down-left', color: 'danger',  val: fmtINR(revData?.stats?.refundedAmount ?? 0), label: 'Refunded' },
              ].map((s) => (
                <div key={s.label} className="col-sm-6 col-xl-3">
                  <div className="card">
                    <div className="card-body">
                      <div className="d-flex align-items-start justify-content-between">
                        <div>
                          <span className="text-heading">{s.label}</span>
                          <h4 className="my-1">{s.val}</h4>
                        </div>
                        <div className="avatar">
                          <span className={`avatar-initial rounded bg-label-${s.color}`}>
                            <i className={`icon-base ti ${s.icon} icon-26px`}></i>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-xl-8">
            <div className="card h-100">
              <div className="card-header border-bottom py-4">
                <h5 className="card-title mb-0">Monthly Revenue Trend</h5>
                <small className="text-body-secondary">Last 12 months</small>
              </div>
              <div className="card-body">
                <Chart type="bar" height={260} series={revenueChart.series} options={revenueChart.options} />
              </div>
            </div>
          </div>

          <div className="col-xl-4">
            <div className="card h-100">
              <div className="card-header border-bottom py-4">
                <h5 className="card-title mb-0">Revenue by Course</h5>
              </div>
              <div className="card-body py-4">
                {(revData?.courseRevenue ?? []).length === 0 ? (
                  <p className="text-body-secondary text-center py-4">No data yet</p>
                ) : (
                  (revData.courseRevenue as any[]).map((c: any, i: number) => (
                    <div key={c.title} className={i < revData.courseRevenue.length - 1 ? 'mb-5' : ''}>
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <div className="d-flex align-items-center gap-2">
                          <span className="rounded-circle flex-shrink-0" style={{ width: 8, height: 8, background: c.hex, display: 'inline-block' }}></span>
                          <small className="text-heading fw-medium text-truncate" style={{ maxWidth: 130 }}>{c.title}</small>
                        </div>
                        <small className="fw-bold text-heading flex-shrink-0">{fmtINR(c.amount)}</small>
                      </div>
                      <div className="progress" style={{ height: 6 }}>
                        <div className={`progress-bar bg-${c.color}`} style={{ width: `${c.pct}%` }}></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {tab === 1 && ALL_TABS[1].locked && <LockedTab label="Revenue" planNeeded="Basic" />}

      {/* ── Tab 2: Course Completion ────────────────────────────────────── */}
      {tab === 2 && !ALL_TABS[2].locked && (
        <div className="row g-6">
          <div className="col-xl-8">
            <div className="card">
              <div className="card-header border-bottom py-4">
                <h5 className="card-title mb-0">Course Completion Funnel</h5>
                <small className="text-body-secondary">{compData?.funnel?.[0]?.count ?? 0} total enrolled</small>
              </div>
              <div className="card-body py-5">
                {(compData?.funnel ?? []).map((s: any, i: number) => (
                  <div key={s.stage} className={`d-flex align-items-center gap-4${i < 5 ? ' mb-5' : ''}`}>
                    <div className="flex-shrink-0" style={{ width: 180 }}>
                      <div className="fw-medium text-heading">{s.stage}</div>
                      <small className="text-body-secondary">{s.count.toLocaleString()} students</small>
                    </div>
                    <div className="flex-grow-1">
                      <div className="progress" style={{ height: 10, borderRadius: 6 }}>
                        <div className={`progress-bar bg-${s.color}`} style={{ width: `${s.pct}%`, borderRadius: 6 }}></div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-end" style={{ minWidth: 44 }}>
                      <span className={`badge bg-label-${s.color}`}>{s.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-xl-4">
            <div className="card h-100">
              <div className="card-header border-bottom py-4">
                <h5 className="card-title mb-0">By Course</h5>
              </div>
              <div className="card-body py-4">
                {(compData?.courseStats ?? []).map((c: any, i: number) => (
                  <div key={c.title} className={i < (compData.courseStats.length - 1) ? 'mb-4' : ''}>
                    <div className="d-flex justify-content-between mb-1">
                      <small className="text-heading fw-medium text-truncate" style={{ maxWidth: 140 }}>{c.title}</small>
                      <small className="fw-bold text-heading">{c.completionRate}%</small>
                    </div>
                    <div className="progress" style={{ height: 6 }}>
                      <div
                        className={`progress-bar bg-${c.completionRate >= 75 ? 'success' : c.completionRate >= 40 ? 'primary' : 'warning'}`}
                        style={{ width: `${c.completionRate}%` }}
                      ></div>
                    </div>
                    <small className="text-body-secondary">{c.completed}/{c.enrolled} students</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {tab === 2 && ALL_TABS[2].locked && <LockedTab label="Course Completion" planNeeded="Advanced" />}

      {/* ── Tab 3: Attendance ──────────────────────────────────────────── */}
      {tab === 3 && !ALL_TABS[3].locked && (
        <div className="row g-6">
          <div className="col-12">
            <div className="row g-6 mb-2">
              {[
                { icon: 'tabler-video',          color: 'primary', val: attData?.stats?.totalClasses ?? '—', label: 'Total Classes'   },
                { icon: 'tabler-calendar-check', color: 'success', val: attData?.stats?.completed    ?? '—', label: 'Completed'       },
                { icon: 'tabler-clock',          color: 'info',    val: attData?.stats?.scheduled    ?? '—', label: 'Upcoming'        },
                { icon: 'tabler-x',              color: 'danger',  val: attData?.stats?.cancelled    ?? '—', label: 'Cancelled'       },
              ].map((s) => (
                <div key={s.label} className="col-sm-6 col-xl-3">
                  <div className="card">
                    <div className="card-body">
                      <div className="d-flex align-items-center gap-3">
                        <div className="avatar">
                          <span className={`avatar-initial rounded bg-label-${s.color}`}>
                            <i className={`icon-base ti ${s.icon} icon-26px`}></i>
                          </span>
                        </div>
                        <div>
                          <h4 className="mb-0 fw-bold">{s.val}</h4>
                          <small className="text-body-secondary">{s.label}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-12">
            <div className="card">
              <div className="card-header border-bottom py-4">
                <h5 className="card-title mb-0">Live Classes</h5>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="border-top">
                    <tr>
                      <th>Class</th>
                      <th>Course</th>
                      <th>Tutor</th>
                      <th>Scheduled</th>
                      <th>Duration</th>
                      <th>Enrolled</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(attData?.classes ?? []).length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-5 text-body-secondary">No live classes yet</td></tr>
                    ) : (
                      (attData.classes as any[]).map((lc: any) => (
                        <tr key={lc.id}>
                          <td className="fw-semibold">{lc.title}</td>
                          <td><small className="text-body-secondary">{lc.courseTitle}</small></td>
                          <td><small>{lc.tutorName}</small></td>
                          <td><small className="text-body-secondary">{fmtDate(lc.scheduledAt)}</small></td>
                          <td><small>{lc.durationMinutes}m</small></td>
                          <td><span className="badge bg-label-primary rounded-pill">{lc.enrolledCount}</span></td>
                          <td>
                            <span className={`badge ${lc.status === 'completed' ? 'bg-label-success' : lc.status === 'cancelled' ? 'bg-label-danger' : 'bg-label-info'}`}>
                              {lc.status.charAt(0).toUpperCase() + lc.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {tab === 3 && ALL_TABS[3].locked && <LockedTab label="Attendance" planNeeded="Advanced + Live Classes" />}

      {/* ── Tab 4: Practice Lab ────────────────────────────────────────── */}
      {tab === 4 && !ALL_TABS[4].locked && (
        <div className="row g-6">
          <div className="col-12">
            <div className="row g-6">
              {[
                { icon: 'tabler-flask',       color: 'primary', val: labData?.stats?.activeModules    ?? '—', label: 'Active Modules' },
                { icon: 'tabler-users',       color: 'info',    val: labData?.stats?.uniqueUsers       ?? '—', label: 'Unique Users'   },
                { icon: 'tabler-file-check',  color: 'success', val: labData?.stats?.totalSubmissions  ?? '—', label: 'Submissions'    },
                { icon: 'tabler-trending-up', color: 'warning', val: labData?.stats?.uniqueUsers > 0 ? `${Math.round((labData.stats.uniqueUsers / Math.max(dash?.totalStudents, 1)) * 100)}%` : '—', label: 'Engagement' },
              ].map((s) => (
                <div key={s.label} className="col-sm-6 col-xl-3">
                  <div className="card">
                    <div className="card-body">
                      <div className="d-flex align-items-center gap-3">
                        <div className="avatar">
                          <span className={`avatar-initial rounded bg-label-${s.color}`}>
                            <i className={`icon-base ti ${s.icon} icon-26px`}></i>
                          </span>
                        </div>
                        <div>
                          <h4 className="mb-0 fw-bold">{s.val}</h4>
                          <small className="text-body-secondary">{s.label}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-xl-7">
            <div className="card h-100">
              <div className="card-header border-bottom py-4">
                <h5 className="card-title mb-0">Practice Lab Activity</h5>
                <small className="text-body-secondary">Student engagement by module</small>
              </div>
              <div className="card-body py-5">
                {(labData?.moduleActivity ?? []).length === 0 ? (
                  <p className="text-body-secondary text-center">No activity yet</p>
                ) : (
                  (labData.moduleActivity as any[]).map((m: any, i: number) => (
                    <div key={m.title} className={`d-flex align-items-center gap-4${i < labData.moduleActivity.length - 1 ? ' mb-5' : ''}`}>
                      <div className={`badge rounded bg-label-${m.color} p-2 flex-shrink-0`}>
                        <i className="icon-base ti tabler-flask icon-md"></i>
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="fw-medium text-heading text-truncate" style={{ maxWidth: 200 }}>{m.title}</span>
                          <small className="text-body-secondary">{m.students} students</small>
                        </div>
                        <div className="progress" style={{ height: 6 }}>
                          <div className={`progress-bar bg-${m.color}`} style={{ width: `${m.pct}%` }}></div>
                        </div>
                      </div>
                      <span className={`badge bg-label-${m.color} flex-shrink-0`} style={{ minWidth: 44 }}>{m.pct}%</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="col-xl-5">
            <div className="card h-100">
              <div className="card-header border-bottom py-4">
                <h5 className="card-title mb-0">Top Students</h5>
                <small className="text-body-secondary">Ranked by submissions</small>
              </div>
              <div className="card-body p-0">
                {(labData?.leaderboard ?? []).length === 0 ? (
                  <p className="text-body-secondary text-center py-5">No submissions yet</p>
                ) : (
                  (labData.leaderboard as any[]).map((s: any, i: number) => (
                    <div key={s.studentId} className={`d-flex align-items-center gap-3 px-5 py-3${i < labData.leaderboard.length - 1 ? ' border-bottom' : ''}`}>
                      <div
                        className="d-flex align-items-center justify-content-center rounded-circle fw-bold flex-shrink-0"
                        style={{
                          width: 32, height: 32, fontSize: 12,
                          background: i === 0 ? '#FF9F43' : i === 1 ? '#7367F0' : i === 2 ? '#EA5455' : '#f1f1f1',
                          color: i < 3 ? '#fff' : '#555',
                        }}
                      >
                        #{i + 1}
                      </div>
                      <div className="avatar flex-shrink-0">
                        {s.avatarUrl
                          ? <img src={s.avatarUrl} className="rounded-circle" alt={s.name} />
                          : <span className={`avatar-initial rounded-circle bg-label-${avatarColor(s.name)}`}>{initials(s.name)}</span>
                        }
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-semibold text-heading">{s.name}</div>
                        <small className="text-body-secondary">{s.submissions} submissions</small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {tab === 4 && ALL_TABS[4].locked && <LockedTab label="Practice Lab" planNeeded="Advanced + Practice Lab" />}

    </AdminLayout>
  )
}
