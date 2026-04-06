'use client'

import dynamic from 'next/dynamic'
import { useQuery } from 'react-query'
import AdminLayout from '@/components/layouts/AdminLayout'
import api from '@/lib/api'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

interface DashboardStats {
  totalStudents:    number
  totalCourses:     number
  publishedCourses: number
  totalTutors:      number
  totalRevenue:     number
  recentEnrollments: number
}

interface RevenueData {
  months: { label: string; amount: number }[]
}

const STAT_CARDS = (d: DashboardStats) => [
  { label: 'Total Students',    value: d.totalStudents,                            icon: 'tabler-users',            color: 'bg-label-primary' },
  { label: 'Active Courses',    value: `${d.publishedCourses} / ${d.totalCourses}`, icon: 'tabler-book',             color: 'bg-label-success' },
  { label: 'Total Revenue',     value: `₹${d.totalRevenue.toLocaleString('en-IN')}`,icon: 'tabler-currency-rupee',   color: 'bg-label-info'    },
  { label: 'New Enrollments',   value: `${d.recentEnrollments} this month`,         icon: 'tabler-user-plus',        color: 'bg-label-warning' },
]

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>(
    'adminDashboard',
    () => api.get('/analytics/dashboard').then((r) => r.data)
  )

  const { data: revenueData } = useQuery<RevenueData>(
    'adminRevenue',
    () => api.get('/analytics/revenue').then((r) => r.data)
  )

  const revenueChart = {
    series: [{ name: 'Revenue (₹)', data: revenueData?.months.map((m) => m.amount) ?? [] }],
    options: {
      chart: { type: 'bar' as const, toolbar: { show: false } },
      plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
      colors: ['#7367F0'],
      dataLabels: { enabled: false },
      xaxis: {
        categories: revenueData?.months.map((m) => m.label) ?? [],
        labels: { style: { fontSize: '10px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { show: false },
      grid: { show: false },
      tooltip: { y: { formatter: (v: number) => `₹${v.toLocaleString('en-IN')}` } },
    },
  }

  return (
    <AdminLayout title="Dashboard" breadcrumb="Home / Dashboard">

      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      <div className="row g-6 mb-6">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="col-sm-6 col-xl-3">
                <div className="card">
                  <div className="card-body placeholder-glow">
                    <span className="placeholder col-8 mb-2" />
                    <span className="placeholder col-5" />
                  </div>
                </div>
              </div>
            ))
          : stats && STAT_CARDS(stats).map((s) => (
              <div key={s.label} className="col-sm-6 col-xl-3">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex align-items-start justify-content-between">
                      <div>
                        <span className="text-heading">{s.label}</span>
                        <h4 className="my-1">{s.value}</h4>
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
        {/* ── Revenue Chart ───────────────────────────────────────────── */}
        <div className="col-xxl-8">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-1">Monthly Revenue</h5>
              <p className="card-subtitle">Course payments — last 12 months</p>
            </div>
            <div className="card-body">
              <Chart type="bar" height={220} series={revenueChart.series} options={revenueChart.options} />
            </div>
          </div>
        </div>

        {/* ── Quick Actions ───────────────────────────────────────────── */}
        <div className="col-xxl-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-1">Quick Actions</h5>
              <p className="card-subtitle">Manage your institute</p>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {[
                  { icon: 'tabler-book-plus',       label: 'New Course',    href: '/admin/courses',   variant: 'btn-primary'         },
                  { icon: 'tabler-user-plus',        label: 'Add Student',   href: '/admin/students',  variant: 'btn-outline-success'  },
                  { icon: 'tabler-user-check',       label: 'Add Tutor',     href: '/admin/tutors',    variant: 'btn-outline-info'     },
                  { icon: 'tabler-chart-bar',        label: 'Analytics',     href: '/admin/analytics', variant: 'btn-outline-warning'  },
                ].map((a) => (
                  <div key={a.label} className="col-6">
                    <a
                      href={a.href}
                      className={`btn ${a.variant} d-flex flex-column align-items-center justify-content-center gap-2 w-100 py-3 rounded-3`}
                      style={{ minHeight: 90 }}
                    >
                      <i className={`ti ${a.icon}`} style={{ fontSize: 24 }} />
                      <span className="fw-semibold text-center" style={{ fontSize: 12, lineHeight: 1.3 }}>{a.label}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </AdminLayout>
  )
}
