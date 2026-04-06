'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useQuery } from 'react-query'
import SuperAdminLayout from '@/components/layouts/SuperAdminLayout'
import PlatformOverviewCard from '@/components/superadmin/PlatformOverviewCard'
import InstituteTrackerCard from '@/components/superadmin/InstituteTrackerCard'
import RecentActivityTable from '@/components/superadmin/RecentActivityTable'
import EmptyState from '@/components/superadmin/EmptyState'
import api from '@/lib/api'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlanDist     { planName: string; count: number }
interface TopInstitute { name: string; revenue: number }
interface RecentInstitute { id: string; name: string; planName: string; status: string; createdAt: string }

interface Analytics {
  totalInstitutes:     number
  activeInstitutes:    number
  suspendedInstitutes: number
  totalStudents:       number
  totalRevenue:        number
  netRevenue:          number
  refundsTotal:        number
  revenueThisMonth:    number
  revenueLastMonth:    number
  momChange:           number | null
  newThisMonth:        number
  pendingApproval:     number
  planDistribution:    PlanDist[]
  topInstitutes:       TopInstitute[]
  recentInstitutes:    RecentInstitute[]
  monthlyRevenue:      number[]
  weeklyRevenue:       number[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRevenue(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000)   return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount}`
}

function momBadge(pct: number | null) {
  if (pct === null) return <span className="badge rounded bg-label-secondary">No prior data</span>
  const pos = pct >= 0
  return (
    <span className={`badge rounded ${pos ? 'bg-label-success' : 'bg-label-danger'}`}>
      {pos ? '+' : ''}{pct}%
    </span>
  )
}

const PLAN_UI: Record<string, { icon: string; color: string }> = {
  Starter: { icon: 'tabler-diamond', color: 'primary' },
  Growth:  { icon: 'tabler-rocket',  color: 'info'    },
  Pro:     { icon: 'tabler-star',    color: 'success'  },
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CardSkeleton({ height = 'auto' }: { height?: number | 'auto' }) {
  return (
    <div className="card h-100" style={height !== 'auto' ? { minHeight: height } : {}}>
      <div className="card-body placeholder-glow">
        <span className="placeholder col-7 mb-3 d-block" />
        <span className="placeholder col-4 mb-2 d-block" />
        <span className="placeholder col-5 d-block" />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const { data, isLoading } = useQuery<Analytics>('superAnalytics', () =>
    api.get('/super/analytics').then((r) => r.data)
  )

  const hasRevenue    = (data?.totalRevenue     ?? 0) > 0
  const hasInstitutes = (data?.totalInstitutes  ?? 0) > 0
  const hasMonthly    = data?.monthlyRevenue.some((v) => v > 0) ?? false
  const hasTopInst    = (data?.topInstitutes.length ?? 0) > 0
  const hasPlans      = (data?.planDistribution.length ?? 0) > 0

  // ── Chart configs (built from real data) ─────────────────────────────────

  const monthlyBarOptions = {
    series:  [{ name: 'Revenue (₹)', data: data?.monthlyRevenue ?? Array(12).fill(0) }],
    options: {
      chart: { type: 'bar' as const, toolbar: { show: false } },
      plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
      colors: ['#7367F0'],
      dataLabels: { enabled: false },
      xaxis: {
        categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        labels: { style: { fontSize: '10px' } },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: { show: false },
      grid: { show: false },
      tooltip: { y: { formatter: (v: number) => formatRevenue(v) } },
    },
  }

  const weeklyBarOptions = {
    series:  [{ name: 'Revenue (₹)', data: data?.weeklyRevenue ?? Array(7).fill(0) }],
    options: {
      chart: { type: 'bar' as const, toolbar: { show: false } },
      plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
      colors: ['#7367F0'],
      dataLabels: { enabled: false },
      xaxis: {
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        labels: { style: { fontSize: '10px' } },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: { show: false },
      grid: { show: false },
      tooltip: { y: { formatter: (v: number) => formatRevenue(v) } },
    },
  }

  // Platform health sparkline — monthly revenue trend
  const healthSparkline = {
    series:  [{ data: data?.monthlyRevenue ?? Array(12).fill(0) }],
    options: {
      chart: { type: 'line' as const, sparkline: { enabled: true }, toolbar: { show: false } },
      stroke: { width: 2.5, curve: 'smooth' as const },
      colors: ['#7367F0'],
      tooltip: { x: { show: false } },
    },
  }

  return (
    <SuperAdminLayout title="Dashboard" breadcrumb="Home / Dashboard">
      <div className="row g-6">

        {/* ── Row 1: Platform Overview | Monthly Revenue | Institute Status ── */}

        <div className="col-xl-6 col-12">
          {isLoading ? <CardSkeleton height={280} /> : (
            <PlatformOverviewCard
              totalInstitutes={data!.totalInstitutes}
              totalStudents={data!.totalStudents}
              totalRevenue={data!.totalRevenue}
              pendingApproval={data!.pendingApproval}
            />
          )}
        </div>

        {/* Monthly Revenue */}
        <div className="col-xl-3 col-sm-6 col-12">
          {isLoading ? <CardSkeleton /> : (
            <div className="card h-100">
              <div className="card-header pb-0">
                <h5 className="mb-1 card-title">Monthly Revenue</h5>
                <p className="mb-0 text-body">
                  {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                </p>
                <h4 className="mb-0">{formatRevenue(data!.revenueThisMonth)}</h4>
              </div>
              <div className="card-body px-0 pb-0">
                {hasMonthly
                  ? <Chart type="bar" height={130} series={monthlyBarOptions.series} options={monthlyBarOptions.options} />
                  : <EmptyState
                      variant="revenue"
                      title="No Revenue Yet"
                      description="Monthly totals will appear once subscription payments are captured."
                    />
                }
              </div>
            </div>
          )}
        </div>

        {/* Institute Status */}
        <div className="col-xl-3 col-sm-6 col-12">
          {isLoading ? <CardSkeleton /> : (
            <div className="card h-100">
              <div className="card-header">
                <div className="d-flex justify-content-between">
                  <p className="mb-0 text-body">Institute Status</p>
                  <p className="card-text fw-medium text-info small">
                    +{data!.newThisMonth} this month
                  </p>
                </div>
                <h4 className="card-title mb-1">{data!.totalInstitutes} Total</h4>
              </div>
              <div className="card-body">
                {!hasInstitutes ? (
                  <EmptyState
                    variant="institutes"
                    title="No Institutes Yet"
                    description="Status breakdown will show here once institutes are onboarded."
                    cta={{ label: 'Add Institute', href: '/super-admin/institutes' }}
                  />
                ) : (() => {
                  const total     = data!.totalInstitutes
                  const activeW   = Math.round(data!.activeInstitutes     / total * 100)
                  const pendingW  = Math.round(data!.pendingApproval      / total * 100)
                  const inactiveW = Math.round(data!.suspendedInstitutes  / total * 100)
                  return (
                    <>
                      <div className="row">
                        <div className="col-4">
                          <div className="d-flex gap-2 align-items-center mb-2">
                            <span className="badge bg-label-success p-1 rounded">
                              <i className="icon-base ti tabler-building icon-sm" />
                            </span>
                            <p className="mb-0">Active</p>
                          </div>
                          <h5 className="mb-0 pt-1">{(data!.activeInstitutes / total * 100).toFixed(1)}%</h5>
                          <small className="text-body-secondary">{data!.activeInstitutes}</small>
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
                            <p className="mb-0">Pending</p>
                            <span className="badge bg-label-warning p-1 rounded">
                              <i className="icon-base ti tabler-clock icon-sm" />
                            </span>
                          </div>
                          <h5 className="mb-0 pt-1">{(data!.pendingApproval / total * 100).toFixed(1)}%</h5>
                          <small className="text-body-secondary">{data!.pendingApproval}</small>
                        </div>
                      </div>
                      <div className="d-flex align-items-center mt-4">
                        <div className="progress w-100" style={{ height: 10 }}>
                          <div className="progress-bar bg-success" style={{ width: `${activeW}%` }}   role="progressbar" />
                          <div className="progress-bar bg-warning" style={{ width: `${pendingW}%` }}  role="progressbar" />
                          <div className="progress-bar bg-danger"  style={{ width: `${inactiveW}%` }} role="progressbar" />
                        </div>
                      </div>
                      <div className="d-flex justify-content-between mt-2">
                        <small className="text-success">{data!.activeInstitutes} Active</small>
                        <small className="text-danger">{data!.suspendedInstitutes} Suspended</small>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          )}
        </div>

        {/* ── Row 2: Revenue Reports | Institute Tracker ── */}

        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header pb-0 d-flex justify-content-between">
              <div className="card-title mb-0">
                <h5 className="mb-1">Revenue Reports</h5>
                <p className="card-subtitle">Weekly Revenue Overview</p>
              </div>
              <div className="dropdown">
                <button className="btn btn-text-secondary rounded-pill text-body-secondary border-0 p-2 me-n1" type="button" data-bs-toggle="dropdown">
                  <i className="icon-base ti tabler-dots-vertical icon-md text-body-secondary" />
                </button>
                <div className="dropdown-menu dropdown-menu-end">
                  <Link className="dropdown-item" href="/super-admin/billing">View Billing</Link>
                </div>
              </div>
            </div>
            <div className="card-body">
              {!isLoading && !hasRevenue ? (
                <EmptyState
                  variant="reports"
                  title="No Reports Yet"
                  description="Revenue breakdown will appear once subscription payments are recorded."
                  cta={{ label: 'View Billing', href: '/super-admin/billing' }}
                />
              ) : (
                <>
                  <div className="row align-items-center g-md-8">
                    <div className="col-12 col-md-5 d-flex flex-column">
                      <div className="d-flex gap-2 align-items-center mb-3 flex-wrap">
                        <h2 className="mb-0">{isLoading ? '—' : formatRevenue(data!.revenueThisMonth)}</h2>
                        {!isLoading && momBadge(data!.momChange)}
                      </div>
                      <small className="text-body">vs last month · {isLoading ? '—' : formatRevenue(data!.revenueLastMonth)}</small>
                    </div>
                    <div className="col-12 col-md-7 ps-xl-8">
                      <Chart type="bar" height={120} series={weeklyBarOptions.series} options={weeklyBarOptions.options} />
                    </div>
                  </div>
                  <div className="border rounded p-4 mt-4">
                    <div className="row gap-4 gap-sm-0">
                      {!isLoading && (() => {
                        const gross   = data!.totalRevenue
                        const refunds = data!.refundsTotal
                        const net     = data!.netRevenue
                        const maxVal  = Math.max(gross, net, refunds, 1)
                        return [
                          { color: 'primary', icon: 'tabler-currency-rupee', label: 'Gross Revenue', value: formatRevenue(gross),   pct: Math.round(gross   / maxVal * 100) },
                          { color: 'info',    icon: 'tabler-chart-pie-2',    label: 'Net Revenue',   value: formatRevenue(net),     pct: Math.round(net     / maxVal * 100) },
                          { color: 'danger',  icon: 'tabler-receipt-refund', label: 'Refunds',       value: refunds > 0 ? formatRevenue(refunds) : '₹0', pct: Math.round(refunds / maxVal * 100) },
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
                        ))
                      })()}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          {isLoading ? <CardSkeleton /> : (
            <InstituteTrackerCard
              totalInstitutes={data!.totalInstitutes}
              activeInstitutes={data!.activeInstitutes}
              pendingApproval={data!.pendingApproval}
              suspendedInstitutes={data!.suspendedInstitutes}
            />
          )}
        </div>

        {/* ── Row 3: Top Institutes | Platform Health | Plan Distribution ── */}

        <div className="col-xxl-4 col-md-6 order-1 order-xl-0">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between">
              <div className="card-title mb-0">
                <h5 className="mb-1">Top Institutes</h5>
                <p className="card-subtitle">By Subscription Revenue</p>
              </div>
              <div className="dropdown">
                <button className="btn btn-text-secondary btn-icon rounded-pill text-body-secondary border-0 me-n1" type="button" data-bs-toggle="dropdown">
                  <i className="icon-base ti tabler-dots-vertical icon-22px text-body-secondary" />
                </button>
                <div className="dropdown-menu dropdown-menu-end">
                  <Link className="dropdown-item" href="/super-admin/institutes">View All</Link>
                </div>
              </div>
            </div>
            <div className="card-body">
              {isLoading ? (
                <div className="placeholder-glow">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="placeholder col-12 mb-3 d-block" style={{ height: 32 }} />
                  ))}
                </div>
              ) : !hasTopInst ? (
                <EmptyState
                  variant="revenue"
                  title="No Revenue Data Yet"
                  description="Top institutes will appear here once subscription payments are captured."
                  cta={{ label: 'View Institutes', href: '/super-admin/institutes' }}
                />
              ) : (
                <ul className="p-0 m-0 list-unstyled">
                  {data!.topInstitutes.map((inst, i) => (
                    <li key={inst.name} className={`d-flex align-items-center ${i < data!.topInstitutes.length - 1 ? 'mb-4' : ''}`}>
                      <div className="avatar flex-shrink-0 me-4">
                        <span className="avatar-initial rounded-circle bg-label-primary">{inst.name[0]}</span>
                      </div>
                      <div className="d-flex w-100 flex-wrap align-items-center justify-content-between gap-2">
                        <div className="me-2">
                          <h6 className="mb-0 me-1">{formatRevenue(inst.revenue)}</h6>
                          <small className="text-body">{inst.name}</small>
                        </div>
                        <p className="text-success fw-medium mb-0 d-flex align-items-center gap-1">
                          <i className="icon-base ti tabler-chevron-up" />Active
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Platform Health */}
        <div className="col-xxl-4 col-md-6 col-12 order-2 order-xl-0">
          <div className="card h-100">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 card-title">Platform Health</h5>
                <div className="dropdown">
                  <button className="btn btn-text-secondary rounded-pill text-body-secondary border-0 p-2 me-n1" type="button" data-bs-toggle="dropdown">
                    <i className="icon-base ti tabler-dots-vertical icon-md text-body-secondary" />
                  </button>
                  <div className="dropdown-menu dropdown-menu-end">
                    <Link className="dropdown-item" href="/super-admin/institutes">View Institutes</Link>
                  </div>
                </div>
              </div>
              <div className="d-flex align-items-center">
                <h2 className="mb-0 me-2">
                  {isLoading ? '—' : `${Math.round((data!.activeInstitutes / (data!.totalInstitutes || 1)) * 100)}%`}
                </h2>
                <i className="icon-base ti tabler-chevron-up text-success me-1" />
                <h6 className="text-success mb-0">Active rate</h6>
              </div>
            </div>
            <div className="card-body">
              {!isLoading && !hasInstitutes ? (
                <EmptyState
                  variant="health"
                  title="No Activity Yet"
                  description="Platform health metrics will appear once institutes are active."
                  cta={{ label: 'Add Institute', href: '/super-admin/institutes' }}
                />
              ) : (
                <>
                  <Chart type="line" height={120} series={healthSparkline.series} options={healthSparkline.options} />
                  <div className="d-flex align-items-start my-4">
                    <div className="badge rounded bg-label-primary p-2 me-4">
                      <i className="icon-base ti tabler-currency-rupee icon-md" />
                    </div>
                    <div className="d-flex justify-content-between w-100 gap-2 align-items-center">
                      <div className="me-2">
                        <h6 className="mb-0">Total Revenue</h6>
                        <small className="text-body">All captured payments</small>
                      </div>
                      <h6 className="mb-0 text-success">
                        {isLoading ? '—' : formatRevenue(data!.totalRevenue)}
                      </h6>
                    </div>
                  </div>
                  <div className="d-flex align-items-start">
                    <div className="badge rounded bg-label-secondary p-2 me-4">
                      <i className="icon-base ti tabler-building icon-md" />
                    </div>
                    <div className="d-flex justify-content-between w-100 gap-2 align-items-center">
                      <div className="me-2">
                        <h6 className="mb-0">New Institutes</h6>
                        <small className="text-body">Onboarded this month</small>
                      </div>
                      <h6 className="mb-0 text-success">
                        +{isLoading ? '—' : data!.newThisMonth}
                      </h6>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="col-xxl-4 col-md-6">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between">
              <div className="card-title mb-0">
                <h5 className="mb-1">Plan Distribution</h5>
                <p className="card-subtitle">{isLoading ? '…' : `${data!.totalInstitutes} Total Institutes`}</p>
              </div>
              <div className="dropdown">
                <button className="btn btn-text-secondary rounded-pill text-body-secondary border-0 p-2 me-n1" type="button" data-bs-toggle="dropdown">
                  <i className="icon-base ti tabler-dots-vertical icon-md text-body-secondary" />
                </button>
                <div className="dropdown-menu dropdown-menu-end">
                  <Link className="dropdown-item" href="/super-admin/plans">Manage Plans</Link>
                </div>
              </div>
            </div>
            <div className="card-body">
              {isLoading ? (
                <div className="placeholder-glow">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span key={i} className="placeholder col-12 mb-4 d-block" style={{ height: 28 }} />
                  ))}
                </div>
              ) : !hasPlans ? (
                <EmptyState
                  variant="plans"
                  title="No Plans Assigned"
                  description="Plan distribution will show once institutes are subscribed to a plan."
                  cta={{ label: 'Manage Plans', href: '/super-admin/plans' }}
                />
              ) : (
                <ul className="p-0 m-0 list-unstyled">
                  {data!.planDistribution.map((p, i) => {
                    const ui  = PLAN_UI[p.planName] ?? { icon: 'tabler-diamond', color: 'secondary' }
                    const pct = `${((p.count / (data!.totalInstitutes || 1)) * 100).toFixed(1)}%`
                    return (
                      <li key={p.planName} className={`d-flex justify-content-between align-items-center ${i < data!.planDistribution.length - 1 ? 'mb-6' : 'mb-3'}`}>
                        <div className={`badge bg-label-${ui.color} rounded p-1_5`}>
                          <i className={`icon-base ti ${ui.icon} icon-md`} />
                        </div>
                        <div className="d-flex justify-content-between w-100 flex-wrap ms-4">
                          <h6 className="mb-0">{p.planName} Plan</h6>
                          <div className="d-flex gap-3">
                            <p className="mb-0">{p.count} institutes</p>
                            <p className="ms-2 text-success mb-0">{pct}</p>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 4: Quick Actions | Recent Activity ── */}

        <div className="col-xxl-4 col-md-6 col-12">
          <div className="card h-100">
            <div className="card-header">
              <div className="card-title mb-0">
                <h5 className="mb-1">Quick Actions</h5>
                <p className="card-subtitle">Platform Management</p>
              </div>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {[
                  { icon: 'tabler-building-plus',   label: 'Approve Pending',   sub: isLoading ? '…' : `${data?.pendingApproval ?? 0} awaiting`,   href: '/super-admin/institutes', variant: 'btn-primary'           },
                  { icon: 'tabler-credit-card-off',  label: 'Failed Payments',   sub: 'Check billing',                                              href: '/super-admin/billing',    variant: 'btn-outline-danger'    },
                  { icon: 'tabler-building',         label: 'All Institutes',    sub: isLoading ? '…' : `${data?.totalInstitutes ?? 0} total`,      href: '/super-admin/institutes', variant: 'btn-outline-info'      },
                  { icon: 'tabler-diamond',          label: 'Manage Plans',      sub: 'Active plans',                                               href: '/super-admin/plans',      variant: 'btn-outline-success'   },
                  { icon: 'tabler-settings',         label: 'Platform Settings', sub: 'Config & branding',                                          href: '/super-admin/settings',   variant: 'btn-outline-secondary' },
                  { icon: 'tabler-file-analytics',   label: 'Billing & Reports', sub: isLoading ? '…' : formatRevenue(data?.totalRevenue ?? 0),    href: '/super-admin/billing',    variant: 'btn-outline-warning'   },
                ].map((a) => (
                  <div key={a.label} className="col-6">
                    <Link href={a.href} className={`btn ${a.variant} d-flex flex-column align-items-center justify-content-center gap-2 w-100 py-3`} style={{ minHeight: 90, borderRadius: 10 }}>
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

        <div className="col-xxl-8">
          {isLoading ? <CardSkeleton height={300} /> : (
            <RecentActivityTable items={data!.recentInstitutes} />
          )}
        </div>

      </div>
    </SuperAdminLayout>
  )
}
