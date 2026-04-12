'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import AdminLayout from '@/components/layouts/AdminLayout'
import api from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Student {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
  createdAt: string
  lastLoginAt?: string | null
  avgProgress: number
  paymentStatus: 'PAID' | 'PENDING' | 'NONE'
  _count: { enrollments: number }
}

interface Stats {
  total: number
  paid: number
  activeToday: number
  pending: number
}

interface Course { id: string; title: string }

// ── Constants ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-label-primary', 'bg-label-success', 'bg-label-info',
  'bg-label-warning', 'bg-label-danger',
]

const PAY_BADGE: Record<string, string> = {
  PAID:    'bg-label-success',
  PENDING: 'bg-label-warning',
  NONE:    'bg-label-secondary',
}
const PAY_LABEL: Record<string, string> = { PAID: 'Paid', PENDING: 'Pending', NONE: 'None' }

const initials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const fmtRelative = (d?: string | null) => {
  if (!d) return 'Never'
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60)   return 'Today'
  if (mins < 1440) return 'Yesterday'
  const days = Math.floor(mins / 1440)
  if (days < 7)    return `${days}d ago`
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ── Invite form schema ─────────────────────────────────────────────────────────

const inviteSchema = z.object({
  name:  z.string().min(2, 'Required'),
  email: z.string().email('Enter a valid email'),
})
type InviteForm = z.infer<typeof inviteSchema>

// ── CSV helpers ────────────────────────────────────────────────────────────────

function toCSV(rows: Student[]): string {
  const headers = ['Name', 'Email', 'Courses Enrolled', 'Payment Status', 'Avg Progress (%)', 'Joined', 'Last Active']
  const escape  = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines   = rows.map((s) => [
    escape(s.name),
    escape(s.email),
    String(s._count.enrollments),
    s.paymentStatus,
    String(s.avgProgress),
    escape(fmtDate(s.createdAt)),
    escape(fmtRelative(s.lastLoginAt)),
  ].join(','))
  return [headers.join(','), ...lines].join('\n')
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function StudentsPage() {
  const qc = useQueryClient()

  // ── Filter state ──────────────────────────────────────────────────
  const [search,     setSearch]     = useState('')
  const [courseId,   setCourseId]   = useState('')
  const [payment,    setPayment]    = useState('')
  const [page,       setPage]       = useState(1)
  const [pageSize,   setPageSize]   = useState(20)
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [showCanvas, setShowCanvas] = useState(false)

  // ── Data queries ──────────────────────────────────────────────────
  const params = new URLSearchParams({
    ...(search   ? { search }   : {}),
    ...(courseId ? { courseId } : {}),
    ...(payment  ? { payment }  : {}),
    page:  String(page),
    limit: String(pageSize),
  })

  const { data, isLoading } = useQuery(
    ['students', search, courseId, payment, page, pageSize],
    () => api.get(`/admin/students?${params}`).then((r) => r.data),
    { keepPreviousData: true },
  )

  const { data: coursesData } = useQuery(
    ['courses-list'],
    () => api.get('/courses?limit=100').then((r) => r.data),
    { staleTime: 60_000 },
  )

  const students: Student[] = data?.students ?? []
  const stats: Stats        = data?.stats    ?? { total: 0, paid: 0, activeToday: 0, pending: 0 }
  const total: number       = data?.total    ?? 0
  const courses: Course[]   = coursesData?.courses ?? []

  // ── Invite mutation ───────────────────────────────────────────────
  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteForm>({ resolver: zodResolver(inviteSchema) })

  const invite = useMutation(
    (d: InviteForm) => api.post('/admin/students', d),
    {
      onSuccess: () => {
        qc.invalidateQueries('students')
        setShowCanvas(false)
        reset()
      },
    },
  )

  // ── Selection helpers ─────────────────────────────────────────────
  const allChecked = students.length > 0 && students.every((s) => selected.has(s.id))
  const toggleAll  = (checked: boolean) =>
    setSelected(checked ? new Set(students.map((s) => s.id)) : new Set())
  const toggleOne  = (id: string, checked: boolean) => {
    const ns = new Set(selected)
    checked ? ns.add(id) : ns.delete(id)
    setSelected(ns)
  }

  // ── CSV export ───────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false)

  const handleExportAll = async () => {
    setExporting(true)
    try {
      const allParams = new URLSearchParams({
        ...(search   ? { search }   : {}),
        ...(courseId ? { courseId } : {}),
        ...(payment  ? { payment }  : {}),
        limit: '10000',
      })
      const res  = await api.get(`/admin/students?${allParams}`)
      const rows: Student[] = res.data?.students ?? []
      downloadCSV(toCSV(rows), `students-${new Date().toISOString().slice(0, 10)}.csv`)
    } finally {
      setExporting(false)
    }
  }

  const handleExportSelected = () => {
    const rows = students.filter((s) => selected.has(s.id))
    downloadCSV(toCSV(rows), `students-selected-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  // ── Pagination ────────────────────────────────────────────────────
  const totalPages = Math.ceil(total / pageSize)

  return (
    <AdminLayout title="Students" breadcrumb="Home / Students">

      {/* ── Stat Cards ──────────────────────────────────────────────── */}
      <div className="row g-6 mb-6">
        {[
          { label: 'Total Students',   val: stats.total,       icon: 'tabler-users',            color: 'primary', sub: 'Registered students'   },
          { label: 'Paid Students',    val: stats.paid,        icon: 'tabler-user-check',       color: 'success', sub: 'With captured payment'  },
          { label: 'Active Today',     val: stats.activeToday, icon: 'tabler-user-bolt',        color: 'info',    sub: 'Logged in today'        },
          { label: 'Pending Payment',  val: stats.pending,     icon: 'tabler-user-exclamation', color: 'warning', sub: 'No payment captured'    },
        ].map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between">
                  <div className="content-left">
                    <span className="text-heading">{s.label}</span>
                    <div className="d-flex align-items-center my-1">
                      <h4 className="mb-0 me-2">{s.val.toLocaleString()}</h4>
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

      {/* ── Main Card ───────────────────────────────────────────────── */}
      <div className="card">

        {/* ── Filters ─────────────────────────────────────────────── */}
        <div className="card-header border-bottom">
          <h5 className="card-title mb-0">Filters</h5>
          <div className="row pt-4 gap-4 gap-md-0">
            <div className="col-md-6">
              <select
                className="form-select"
                value={courseId}
                onChange={(e) => { setCourseId(e.target.value); setPage(1) }}
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <select
                className="form-select"
                value={payment}
                onChange={(e) => { setPayment(e.target.value); setPage(1) }}
              >
                <option value="">All Payment Status</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="NONE">No Payment</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Table Toolbar ────────────────────────────────────────── */}
        <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-3 border-bottom py-4">
          <div className="d-flex align-items-center gap-2">
            <label className="mb-0 text-nowrap small">Show</label>
            <select
              className="form-select form-select-sm"
              style={{ width: 70 }}
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <label className="mb-0 text-nowrap small">entries</label>
          </div>
          <div className="d-flex align-items-center flex-wrap gap-2">
            <div className="input-group input-group-sm" style={{ width: 220 }}>
              <span className="input-group-text"><i className="ti tabler-search"></i></span>
              <input
                type="search"
                className="form-control"
                placeholder="Search student…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={handleExportAll}
              disabled={exporting}
            >
              {exporting
                ? <span className="spinner-border spinner-border-sm me-1" />
                : <i className="ti tabler-download me-1"></i>
              }
              Export CSV
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => setShowCanvas(true)}>
              <i className="ti tabler-plus me-1"></i>Add Student
            </button>
          </div>
        </div>

        {/* ── Bulk action bar ──────────────────────────────────────── */}
        {selected.size > 0 && (
          <div className="px-4 py-2 bg-label-primary d-flex align-items-center gap-3 flex-wrap border-bottom">
            <span className="fw-semibold small">{selected.size} selected</span>
            <button className="btn btn-sm btn-outline-primary bg-white">
              <i className="ti tabler-mail me-1"></i>Send Message
            </button>
            <button className="btn btn-sm btn-outline-primary bg-white" onClick={handleExportSelected}>
              <i className="ti tabler-download me-1"></i>Export CSV
            </button>
          </div>
        )}

        {/* ── Table ───────────────────────────────────────────────── */}
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="border-top">
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={allChecked}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th>Student</th>
                <th>Courses</th>
                <th>Payment</th>
                <th>Progress</th>
                <th>Last Active</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><span className="placeholder col-8"></span></td>
                    ))}
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8">
                    <img src="/img/illustrations/boy-app-academy.png" alt="No students" height={120} className="img-fluid mb-3" />
                    <p className="fw-semibold text-heading mb-1">No Students Found</p>
                    <p className="text-body-secondary small mb-0">No students match your current search or filters.</p>
                  </td>
                </tr>
              ) : (
                students.map((s, idx) => (
                  <tr key={s.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selected.has(s.id)}
                        onChange={(e) => toggleOne(s.id, e.target.checked)}
                      />
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div className="avatar">
                          {s.avatarUrl ? (
                            <img src={s.avatarUrl} alt={s.name} className="rounded-circle" />
                          ) : (
                            <span className={`avatar-initial rounded-circle ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                              {initials(s.name)}
                            </span>
                          )}
                        </div>
                        <div>
                          <Link href={`/admin/students/${s.id}`} className="fw-semibold text-heading d-block">
                            {s.name}
                          </Link>
                          <small className="text-body-secondary">{s.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-label-primary rounded-pill">
                        {s._count.enrollments}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${PAY_BADGE[s.paymentStatus]}`}>
                        {PAY_LABEL[s.paymentStatus]}
                      </span>
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress flex-grow-1" style={{ height: 6 }}>
                          <div
                            className={`progress-bar ${s.avgProgress === 100 ? 'bg-success' : 'bg-primary'}`}
                            style={{ width: `${s.avgProgress}%` }}
                          ></div>
                        </div>
                        <small className="fw-semibold text-nowrap">{s.avgProgress}%</small>
                      </div>
                    </td>
                    <td className="text-body-secondary">
                      <small>{fmtRelative(s.lastLoginAt)}</small>
                    </td>
                    <td className="text-body-secondary">
                      <small>{fmtDate(s.createdAt)}</small>
                    </td>
                    <td>
                      <div className="dropdown">
                        <button
                          className="btn btn-sm btn-icon btn-text-secondary rounded-pill dropdown-toggle hide-arrow"
                          data-bs-toggle="dropdown"
                        >
                          <i className="ti tabler-dots-vertical"></i>
                        </button>
                        <div className="dropdown-menu dropdown-menu-end">
                          <Link className="dropdown-item" href={`/admin/students/${s.id}`}>
                            <i className="ti tabler-eye me-2"></i>View Profile
                          </Link>
                          <a className="dropdown-item" href={`mailto:${s.email}`}>
                            <i className="ti tabler-mail me-2"></i>Send Email
                          </a>
                          <div className="dropdown-divider"></div>
                          <button className="dropdown-item text-danger">
                            <i className="ti tabler-trash me-2"></i>Remove Student
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────────────────── */}
        <div className="card-footer d-flex flex-wrap justify-content-between align-items-center gap-3 py-3">
          <small className="text-body-secondary">
            Showing {students.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} students
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

      {/* ── Add Student Offcanvas ────────────────────────────────────── */}
      {showCanvas && (
        <>
          <div
            className="offcanvas offcanvas-end show"
            style={{ visibility: 'visible', width: 400 }}
          >
            <div className="offcanvas-header border-bottom">
              <h5 className="offcanvas-title">Add New Student</h5>
              <button type="button" className="btn-close" onClick={() => { setShowCanvas(false); reset() }} />
            </div>
            <div className="offcanvas-body p-4">
              <p className="text-body-secondary mb-4">
                Add a student manually. They will receive a temporary password to log in.
              </p>

              {invite.isError && (
                <div className="alert alert-danger py-2 small mb-4">
                  Failed — check details or email may already be in use.
                </div>
              )}
              {invite.isSuccess && (
                <div className="alert alert-success py-2 small mb-4">
                  Student added successfully!
                </div>
              )}

              <form onSubmit={handleSubmit((d) => invite.mutate(d))} noValidate>
                <div className="mb-4">
                  <label className="form-label fw-semibold">Full Name <span className="text-danger">*</span></label>
                  <input
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    placeholder="e.g. Rahul Sharma"
                    {...register('name')}
                  />
                  {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
                </div>
                <div className="mb-5">
                  <label className="form-label fw-semibold">Email <span className="text-danger">*</span></label>
                  <input
                    type="email"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    placeholder="e.g. rahul@example.com"
                    {...register('email')}
                  />
                  {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
                  <div className="form-text">A temporary password will be generated and logged.</div>
                </div>
                <div className="d-flex gap-3">
                  <button
                    type="submit"
                    className="btn btn-primary flex-grow-1"
                    disabled={isSubmitting || invite.isLoading}
                  >
                    {(isSubmitting || invite.isLoading) && (
                      <span className="spinner-border spinner-border-sm me-2" />
                    )}
                    <i className="ti tabler-user-plus me-1"></i>Add Student
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => { setShowCanvas(false); reset() }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="offcanvas-backdrop fade show" onClick={() => { setShowCanvas(false); reset() }}></div>
        </>
      )}

    </AdminLayout>
  )
}
