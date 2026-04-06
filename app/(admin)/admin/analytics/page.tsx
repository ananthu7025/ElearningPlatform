'use client'

import dynamic from 'next/dynamic'
import { useQuery } from 'react-query'
import AdminLayout from '@/components/layouts/AdminLayout'
import api from '@/lib/api'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

interface DashboardStats {
  totalStudents:     number
  totalCourses:      number
  publishedCourses:  number
  totalTutors:       number
  totalRevenue:      number
  recentEnrollments: number
}

interface RevenueData {
  months: { label: string; amount: number }[]
}

export default function AnalyticsPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>(
    'adminStats',
    () => api.get('/analytics/dashboard').then((r) => r.data)
  )

  const { data: revenueData } = useQuery<RevenueData>(
    'adminRevenue',
    () => api.get('/analytics/revenue').then((r) => r.data)
  )

  const revenueChart = {
    series: [{ name: 'Revenue (₹)', data: revenueData?.months.map((m) => m.amount) ?? [] }],
    options: {
      chart: { type: 'area' as const, toolbar: { show: false }, sparkline: { enabled: false } },
      stroke: { curve: 'smooth' as const, width: 2 },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
      colors: ['#7367F0'],
      dataLabels: { enabled: false },
      xaxis: {
        categories: revenueData?.months.map((m) => m.label) ?? [],
        labels: { style: { fontSize: '10px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { formatter: (v: number) => `₹${(v / 1000).toFixed(0)}k` } },
      grid: { borderColor: '#f1f1f1' },
      tooltip: { y: { formatter: (v: number) => `₹${v.toLocaleString('en-IN')}` } },
    },
  }

  const SUMMARY = stats
    ? [
        { label: 'Total Students',    value: stats.totalStudents.toLocaleString('en-IN'),                               icon: 'tabler-users',          color: 'bg-label-primary' },
        { label: 'Total Revenue',     value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`,                         icon: 'tabler-currency-rupee', color: 'bg-label-success' },
        { label: 'Published Courses', value: `${stats.publishedCourses} / ${stats.totalCourses}`,                      icon: 'tabler-book',           color: 'bg-label-info'    },
        { label: 'New Enrollments',   value: `${stats.recentEnrollments} this month`,                                  icon: 'tabler-user-plus',      color: 'bg-label-warning' },
      ]
    : []

  return (
    <AdminLayout title="Analytics" breadcrumb="Home / Analytics">

      {/* ── Summary Cards ─────────────────────────────────────────── */}
      <div className="row g-6 mb-6">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="col-sm-6 col-xl-3">
                <div className="card"><div className="card-body placeholder-glow"><span className="placeholder col-8 mb-2" /><span className="placeholder col-5" /></div></div>
              </div>
            ))
          : SUMMARY.map((s) => (
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

      {/* ── Revenue trend ─────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-1">Revenue Trend</h5>
          <p className="card-subtitle">Last 12 months of course payments</p>
        </div>
        <div className="card-body">
          <Chart type="area" height={280} series={revenueChart.series} options={revenueChart.options} />
        </div>
      </div>

    </AdminLayout>
  )
}
