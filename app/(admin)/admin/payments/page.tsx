'use client'

import { useState } from 'react'
import { useQuery } from 'react-query'
import AdminLayout from '@/components/layouts/AdminLayout'
import api from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Payment {
  id:                string
  amount:            string | number
  status:            'CAPTURED' | 'PENDING' | 'FAILED' | 'REFUNDED'
  createdAt:         string
  capturedAt?:       string | null
  razorpayOrderId:   string
  razorpayPaymentId?: string | null
  student:           { id: string; name: string; email: string; avatarUrl?: string | null }
  course:            { id: string; title: string }
}

interface Stats {
  totalRevenue:     number
  thisMonthRevenue: number
  thisMonthCount:   number
  paidCount:        number
  pendingAmount:    number
  refundedAmount:   number
}

interface TrendItem   { month: string; amount: number; pct: number }
interface CourseItem  { courseId: string; title: string; amount: number; pct: number; color: string; hex: string }

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_META = {
  CAPTURED: { badge: 'bg-label-success',   label: 'Paid'     },
  PENDING:  { badge: 'bg-label-warning',   label: 'Pending'  },
  FAILED:   { badge: 'bg-label-danger',    label: 'Failed'   },
  REFUNDED: { badge: 'bg-label-secondary', label: 'Refunded' },
} as const

const AVATAR_COLORS = ['primary', 'success', 'info', 'warning', 'danger']

const initials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

const avatarColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

const fmtINR = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

// ── CSV export ─────────────────────────────────────────────────────────────────

function downloadCSV(payments: Payment[]) {
  const headers = ['Transaction ID', 'Student', 'Email', 'Course', 'Amount', 'Status', 'Date']
  const escape  = (v: string) => `"${String(v).replace(/"/g, '""')}"`
  const lines   = payments.map((p) => [
    escape(p.razorpayOrderId),
    escape(p.student.name),
    escape(p.student.email),
    escape(p.course.title),
    Number(p.amount).toFixed(2),
    p.status,
    escape(fmtDate(p.createdAt)),
  ].join(','))
  const csv  = [headers.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [pageSize]                      = useState(20)
  const [exporting,    setExporting]    = useState(false)

  const params = new URLSearchParams({
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(search       ? { search }               : {}),
    page:  String(page),
    limit: String(pageSize),
  })

  const { data, isLoading } = useQuery(
    ['adminPayments', statusFilter, search, page, pageSize],
    () => api.get(`/admin/payments?${params}`).then((r) => r.data),
    { keepPreviousData: true },
  )

  const payments:      Payment[]    = data?.payments      ?? []
  const stats:         Stats        = data?.stats         ?? { totalRevenue: 0, thisMonthRevenue: 0, thisMonthCount: 0, paidCount: 0, pendingAmount: 0, refundedAmount: 0 }
  const monthlyTrend:  TrendItem[]  = data?.monthlyTrend  ?? []
  const courseRevenue: CourseItem[] = data?.courseRevenue ?? []
  const total:         number       = data?.total         ?? 0
  const totalPages                  = Math.ceil(total / pageSize)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await api.get(`/admin/payments?${new URLSearchParams({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search       ? { search }               : {}),
        limit: '10000',
      })}`)
      downloadCSV(res.data?.payments ?? [])
    } finally {
      setExporting(false)
    }
  }

  return (
    <AdminLayout title="Payments" breadcrumb="Home / Payments">

      {/* ── Hero Card ──────────────────────────────────────────────────── */}
      <div className="card p-0 mb-6 overflow-hidden">
        <div
          className="card-body p-5"
          style={{ background: 'linear-gradient(135deg, #7367F0 0%, #9E95F5 100%)', position: 'relative', overflow: 'hidden' }}
        >
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -50,  right: -50,  width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }}></div>
          <div style={{ position: 'absolute', bottom: -70, right: 120, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }}></div>
          <div style={{ position: 'absolute', top: '50%', right: 340, width: 90,  height: 90,  borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none', transform: 'translateY(-50%)' }}></div>

          <div className="row align-items-center g-4 position-relative">
            {/* Left — headline */}
            <div className="col-12 col-md">
              <p className="mb-1 fw-semibold" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, letterSpacing: '0.5px', textTransform: 'uppercase' }}>All Time Revenue</p>
              <h2 className="fw-bold mb-1" style={{ color: '#fff', fontSize: 40, lineHeight: 1.1 }}>
                {isLoading ? '—' : fmtINR(stats.totalRevenue)}
              </h2>
              <p className="mb-4" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                <i className="ti tabler-trending-up" style={{ fontSize: 14 }}></i> Total captured revenue
              </p>
              <div className="d-flex flex-wrap gap-3">
                {[
                  { label: 'This Month',   val: isLoading ? '—' : fmtINR(stats.thisMonthRevenue) },
                  { label: 'Transactions', val: isLoading ? '—' : stats.paidCount.toLocaleString() },
                  { label: 'Pending',      val: isLoading ? '—' : fmtINR(stats.pendingAmount) },
                ].map((q) => (
                  <div key={q.label} className="rounded-3 px-3 py-2" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>{q.val}</div>
                    <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>{q.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — mini bar chart */}
            <div className="col-12 col-md-auto d-none d-md-block">
              <p className="mb-2" style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, textAlign: 'right' }}>Last 6 months</p>
              <div className="d-flex align-items-end gap-2" style={{ height: 80 }}>
                {monthlyTrend.map((m, i) => (
                  <div key={m.month} className="d-flex flex-column align-items-center gap-1" style={{ width: 28 }}>
                    <div
                      style={{
                        height:    `${Math.max(Math.round(m.pct * 0.72), 6)}px`,
                        width:     '100%',
                        borderRadius: '4px 4px 0 0',
                        background: i === monthlyTrend.length - 1 ? '#fff' : 'rgba(255,255,255,0.3)',
                        transition: 'height .3s',
                      }}
                    ></div>
                    <small style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9 }}>{m.month}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      <div className="row g-6 mb-6">
        {[
          { label: 'This Month',  val: isLoading ? '—' : fmtINR(stats.thisMonthRevenue), sub: `${stats.thisMonthCount} transactions`, icon: 'tabler-trending-up',      color: 'primary' },
          { label: 'Paid',        val: isLoading ? '—' : stats.paidCount.toLocaleString(), sub: 'Captured payments',               icon: 'tabler-circle-check',     color: 'success' },
          { label: 'Pending',     val: isLoading ? '—' : fmtINR(stats.pendingAmount),    sub: 'Awaiting payment',                   icon: 'tabler-clock',            color: 'warning' },
          { label: 'Refunded',    val: isLoading ? '—' : fmtINR(stats.refundedAmount),   sub: 'Total refunded',                     icon: 'tabler-corner-down-left', color: 'danger'  },
        ].map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between">
                  <div className="content-left">
                    <span className="text-heading">{s.label}</span>
                    <div className="d-flex align-items-center my-1">
                      <h4 className="mb-0 me-2">{s.val}</h4>
                    </div>
                    <small className="mb-0 text-body-secondary">{s.sub}</small>
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

      {/* ── Main 2-col Layout ─────────────────────────────────────────── */}
      <div className="row g-6">

        {/* ── Transactions ── col-xl-8 ─────────────────────────────── */}
        <div className="col-xl-8">
          <div className="card h-100">

            {/* Header */}
            <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-3 border-bottom py-4">
              <div>
                <h5 className="card-title mb-0">Transactions</h5>
                <small className="text-body-secondary">{total} records</small>
              </div>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <select
                  className="form-select form-select-sm"
                  style={{ width: 130 }}
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                >
                  <option value="">All Status</option>
                  <option value="CAPTURED">Paid</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
                <div className="input-group input-group-sm" style={{ width: 200 }}>
                  <span className="input-group-text"><i className="ti tabler-search"></i></span>
                  <input
                    type="search"
                    className="form-control"
                    placeholder="Search…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  />
                </div>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleExport}
                  disabled={exporting}
                >
                  {exporting
                    ? <span className="spinner-border spinner-border-sm me-1" />
                    : <i className="ti tabler-download me-1"></i>
                  }
                  Export
                </button>
              </div>
            </div>

            {/* Transaction list */}
            <div className="card-body p-0">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="d-flex align-items-center gap-3 px-5 py-3 border-bottom">
                    <div className="avatar flex-shrink-0"><span className="avatar-initial rounded-circle bg-label-secondary placeholder" style={{ width: 38, height: 38 }}></span></div>
                    <div className="flex-grow-1"><span className="placeholder col-6 d-block mb-1"></span><span className="placeholder col-4"></span></div>
                    <span className="placeholder col-2"></span>
                  </div>
                ))
              ) : payments.length === 0 ? (
                <div className="text-center py-8">
                  <img src="/img/illustrations/girl-doing-yoga-light.png" alt="No transactions" height={140} className="img-fluid mb-4" />
                  <h6 className="mb-1">No Transactions Found</h6>
                  <p className="text-body-secondary small mb-0">Try adjusting your filters or date range.</p>
                </div>
              ) : (
                payments.map((p, i) => {
                  const meta = STATUS_META[p.status] ?? { badge: 'bg-label-secondary', label: p.status }
                  return (
                    <div
                      key={p.id}
                      className={`d-flex align-items-center gap-3 px-5 py-3${i < payments.length - 1 ? ' border-bottom' : ''}`}
                    >
                      {/* Avatar */}
                      <div className="avatar flex-shrink-0">
                        {p.student.avatarUrl ? (
                          <img src={p.student.avatarUrl} alt={p.student.name} className="rounded-circle" />
                        ) : (
                          <span className={`avatar-initial rounded-circle bg-label-${avatarColor(p.student.name)}`}>
                            {initials(p.student.name)}
                          </span>
                        )}
                      </div>

                      {/* Name + course */}
                      <div className="flex-grow-1 min-w-0">
                        <div className="fw-semibold text-heading text-truncate">{p.student.name}</div>
                        <small className="text-body-secondary text-truncate d-block">{p.course.title}</small>
                      </div>

                      {/* Transaction ID */}
                      <small className="text-body-secondary text-nowrap d-none d-lg-block flex-shrink-0" title={p.razorpayOrderId}>
                        #{p.razorpayOrderId.slice(-8).toUpperCase()}
                      </small>

                      {/* Date */}
                      <small className="text-body-secondary text-nowrap d-none d-md-block flex-shrink-0">
                        {fmtDate(p.createdAt)}
                      </small>

                      {/* Amount + status */}
                      <div className="text-end flex-shrink-0">
                        <div className="fw-bold text-heading">{fmtINR(Number(p.amount))}</div>
                        <span className={`badge ${meta.badge}`} style={{ fontSize: 10 }}>{meta.label}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0">
                        <div className="dropdown">
                          <button
                            className="btn btn-sm btn-icon btn-text-secondary rounded-pill dropdown-toggle hide-arrow"
                            data-bs-toggle="dropdown"
                          >
                            <i className="ti tabler-dots-vertical"></i>
                          </button>
                          <div className="dropdown-menu dropdown-menu-end">
                            <button className="dropdown-item">
                              <i className="ti tabler-eye me-2"></i>View Details
                            </button>
                            <button className="dropdown-item">
                              <i className="ti tabler-download me-2"></i>Download Receipt
                            </button>
                            {p.status === 'PENDING' && (
                              <button className="dropdown-item">
                                <i className="ti tabler-send me-2"></i>Send Reminder
                              </button>
                            )}
                            {p.status === 'CAPTURED' && (
                              <>
                                <div className="dropdown-divider"></div>
                                <button className="dropdown-item text-danger">
                                  <i className="ti tabler-corner-down-left me-2"></i>Refund
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer / Pagination */}
            <div className="card-footer d-flex flex-wrap justify-content-between align-items-center gap-3 py-3">
              <small className="text-body-secondary">
                Showing {payments.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} transactions
              </small>
              {totalPages > 1 && (
                <nav>
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(page - 1)}>‹</button>
                    </li>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                      return (
                        <li key={p} className={`page-item ${page === p ? 'active' : ''}`}>
                          <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                        </li>
                      )
                    })}
                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(page + 1)}>›</button>
                    </li>
                  </ul>
                </nav>
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── col-xl-4 ──────────────────────────────────── */}
        <div className="col-xl-4">

          {/* Revenue by Course */}
          <div className="card mb-6">
            <div className="card-header border-bottom py-4">
              <h5 className="card-title mb-0">Revenue by Course</h5>
            </div>
            <div className="card-body py-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={i < 3 ? 'mb-4' : ''}>
                    <span className="placeholder col-8 d-block mb-1"></span>
                    <div className="progress" style={{ height: 6 }}><div className="progress-bar bg-secondary placeholder" style={{ width: '60%' }}></div></div>
                  </div>
                ))
              ) : courseRevenue.length === 0 ? (
                <p className="text-body-secondary text-center py-3 mb-0">No data yet</p>
              ) : (
                courseRevenue.map((c, i) => (
                  <div key={c.courseId} className={i < courseRevenue.length - 1 ? 'mb-4' : ''}>
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

          {/* Payout Summary */}
          <div className="card p-0 overflow-hidden">
            <div
              className="card-body p-5"
              style={{ background: 'linear-gradient(135deg, #28C76F 0%, #48DA89 100%)', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: -30,  right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)',  pointerEvents: 'none' }}></div>
              <div style={{ position: 'absolute', bottom: -50, left: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }}></div>

              <div className="position-relative">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div className="d-flex align-items-center justify-content-center rounded-circle" style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.2)' }}>
                    <i className="ti tabler-building-bank" style={{ fontSize: 18, color: '#fff' }}></i>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600 }}>Payout Summary</span>
                </div>

                {(() => {
                  const gross    = stats.totalRevenue
                  const platform = Math.round(gross * 0.1)
                  const net      = gross - platform
                  return (
                    <>
                      <h2 className="fw-bold mb-1" style={{ color: '#fff', fontSize: 32 }}>{fmtINR(net)}</h2>
                      <p className="mb-4" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Available after 10% platform fee</p>
                      <div className="d-flex gap-3 mb-4">
                        {[
                          { label: 'Gross',    val: fmtINR(gross)    },
                          { label: 'Platform', val: fmtINR(platform) },
                        ].map((q) => (
                          <div key={q.label} className="rounded-3 px-3 py-2" style={{ background: 'rgba(255,255,255,0.15)' }}>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{q.val}</div>
                            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>{q.label}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                })()}

                <button className="btn w-100 fw-semibold" style={{ background: '#fff', color: '#28C76F' }}>
                  <i className="ti tabler-send me-1"></i>Request Payout
                </button>
                <p className="text-center mb-0 mt-2" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                  Processed within 3–5 business days
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

    </AdminLayout>
  )
}
