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

interface Tutor {
  id:           string
  name:         string
  email:        string
  avatarUrl?:   string | null
  isActive:     boolean
  status:       'ACTIVE' | 'INVITED' | 'INACTIVE'
  courseCount:  number
  studentCount: number
  createdAt:    string
  lastLoginAt?: string | null
}

interface Stats { total: number; active: number; invited: number; inactive: number }

// ── Constants ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-label-primary', 'bg-label-success', 'bg-label-info',
  'bg-label-warning', 'bg-label-danger',
]

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:   'bg-label-success',
  INVITED:  'bg-label-warning',
  INACTIVE: 'bg-label-secondary',
}
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active', INVITED: 'Invited', INACTIVE: 'Inactive',
}

const initials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

// ── CSV helpers ────────────────────────────────────────────────────────────────

function toCSV(rows: Tutor[]): string {
  const headers = ['Name', 'Email', 'Status', 'Courses', 'Students']
  const escape  = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines   = rows.map((t) => [
    escape(t.name), escape(t.email),
    STATUS_LABEL[t.status], String(t.courseCount), String(t.studentCount),
  ].join(','))
  return [headers.join(','), ...lines].join('\n')
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Invite form schema ─────────────────────────────────────────────────────────

const inviteSchema = z.object({
  name:  z.string().min(2, 'Required'),
  email: z.string().email('Enter a valid email'),
})
type InviteForm = z.infer<typeof inviteSchema>

// ── Page ───────────────────────────────────────────────────────────────────────

export default function TutorsPage() {
  const qc = useQueryClient()

  const [search,     setSearch]     = useState('')
  const [status,     setStatus]     = useState('')
  const [page,       setPage]       = useState(1)
  const [pageSize,   setPageSize]   = useState(20)
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [showCanvas, setShowCanvas] = useState(false)
  const [exporting,  setExporting]  = useState(false)

  // ── Query ──────────────────────────────────────────────────────────
  const params = new URLSearchParams({
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    page:  String(page),
    limit: String(pageSize),
  })

  const { data, isLoading } = useQuery(
    ['tutors', search, status, page, pageSize],
    () => api.get(`/admin/tutors?${params}`).then((r) => r.data),
    { keepPreviousData: true },
  )

  const tutors: Tutor[] = data?.tutors  ?? []
  const stats: Stats    = data?.stats   ?? { total: 0, active: 0, invited: 0, inactive: 0 }
  const total: number   = data?.total   ?? 0

  // ── Invite mutation ───────────────────────────────────────────────
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<InviteForm>({ resolver: zodResolver(inviteSchema) })

  const invite = useMutation(
    (d: InviteForm) => api.post('/admin/tutors', d),
    {
      onSuccess: () => {
        qc.invalidateQueries('tutors')
        setShowCanvas(false)
        reset()
      },
    },
  )

  // ── Deactivate mutation ───────────────────────────────────────────
  const deactivate = useMutation(
    (id: string) => api.patch(`/admin/tutors/${id}`, { isActive: false }),
    { onSuccess: () => qc.invalidateQueries('tutors') },
  )

  // ── Selection helpers ─────────────────────────────────────────────
  const allChecked = tutors.length > 0 && tutors.every((t) => selected.has(t.id))
  const toggleAll  = (checked: boolean) =>
    setSelected(checked ? new Set(tutors.map((t) => t.id)) : new Set())
  const toggleOne  = (id: string, checked: boolean) => {
    const ns = new Set(selected)
    checked ? ns.add(id) : ns.delete(id)
    setSelected(ns)
  }

  // ── Export handlers ───────────────────────────────────────────────
  const handleExportAll = async () => {
    setExporting(true)
    try {
      const allParams = new URLSearchParams({
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
        limit: '10000',
      })
      const res = await api.get(`/admin/tutors?${allParams}`)
      downloadCSV(toCSV(res.data?.tutors ?? []), `tutors-${new Date().toISOString().slice(0, 10)}.csv`)
    } finally {
      setExporting(false)
    }
  }

  const handleExportSelected = () => {
    const rows = tutors.filter((t) => selected.has(t.id))
    downloadCSV(toCSV(rows), `tutors-selected-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  // ── Pagination ────────────────────────────────────────────────────
  const totalPages = Math.ceil(total / pageSize)

  return (
    <AdminLayout title="Tutors" breadcrumb="Home / Tutors">

      {/* ── Stat Cards ──────────────────────────────────────────────── */}
      <div className="row g-6 mb-6">
        {[
          { label: 'Total Tutors',   val: stats.total,    icon: 'tabler-users',            color: 'primary', sub: 'All registered tutors'    },
          { label: 'Active Tutors',  val: stats.active,   icon: 'tabler-user-check',       color: 'success', sub: 'Currently active'          },
          { label: 'Invited',        val: stats.invited,  icon: 'tabler-mail-forward',     color: 'warning', sub: 'Pending first login'        },
          { label: 'Inactive',       val: stats.inactive, icon: 'tabler-user-off',         color: 'danger',  sub: 'Deactivated accounts'      },
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
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1) }}
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INVITED">Invited</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="col-md-6">
              {/* placeholder col for layout symmetry */}
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
                placeholder="Search tutor…"
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
              Export
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => setShowCanvas(true)}>
              <i className="ti tabler-plus me-1"></i>Invite Tutor
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
            <button className="btn btn-sm btn-outline-primary bg-white">
              <i className="ti tabler-user-off me-1"></i>Deactivate
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
                <th>Tutor</th>
                <th>Courses</th>
                <th>Students</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}><span className="placeholder col-8"></span></td>
                    ))}
                  </tr>
                ))
              ) : tutors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <img src="/img/illustrations/lady-with-laptop-light.png" alt="No tutors" height={120} className="img-fluid mb-3" />
                    <p className="fw-semibold text-heading mb-1">No Tutors Found</p>
                    <p className="text-body-secondary small mb-0">No tutors match your current search or filters.</p>
                  </td>
                </tr>
              ) : (
                tutors.map((t, idx) => (
                  <tr key={t.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selected.has(t.id)}
                        onChange={(e) => toggleOne(t.id, e.target.checked)}
                      />
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div className="avatar">
                          {t.avatarUrl ? (
                            <img src={t.avatarUrl} alt={t.name} className="rounded-circle" />
                          ) : (
                            <span className={`avatar-initial rounded-circle ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                              {initials(t.name)}
                            </span>
                          )}
                        </div>
                        <div>
                          <Link href={`/admin/tutors/${t.id}`} className="fw-semibold text-heading d-block">
                            {t.name}
                          </Link>
                          <small className="text-body-secondary">{t.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-label-primary rounded-pill">{t.courseCount}</span>
                    </td>
                    <td className="text-body-secondary">{t.studentCount.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[t.status]}`}>
                        {STATUS_LABEL[t.status]}
                      </span>
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
                          <Link className="dropdown-item" href={`/admin/tutors/${t.id}`}>
                            <i className="ti tabler-eye me-2"></i>View Profile
                          </Link>
                          <a className="dropdown-item" href={`mailto:${t.email}`}>
                            <i className="ti tabler-mail me-2"></i>Send Message
                          </a>
                          <div className="dropdown-divider"></div>
                          <button
                            className="dropdown-item text-danger"
                            onClick={() => deactivate.mutate(t.id)}
                            disabled={!t.isActive}
                          >
                            <i className="ti tabler-user-off me-2"></i>Deactivate
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
            Showing {tutors.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} tutors
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

      {/* ── Invite Tutor Offcanvas ───────────────────────────────────── */}
      {showCanvas && (
        <>
          <div
            className="offcanvas offcanvas-end show"
            style={{ visibility: 'visible', width: 400 }}
          >
            <div className="offcanvas-header border-bottom">
              <h5 className="offcanvas-title">Invite New Tutor</h5>
              <button type="button" className="btn-close" onClick={() => { setShowCanvas(false); reset() }} />
            </div>
            <div className="offcanvas-body p-4">
              <p className="text-body-secondary mb-4">
                Fill in the details to invite a tutor. They will receive a temporary password to log in.
              </p>

              {invite.isError && (
                <div className="alert alert-danger py-2 small mb-4">
                  Failed — email may already be in use.
                </div>
              )}
              {invite.isSuccess && (
                <div className="alert alert-success py-2 small mb-4">
                  Tutor invited successfully!
                </div>
              )}

              <form onSubmit={handleSubmit((d) => invite.mutate(d))} noValidate>
                <div className="mb-4">
                  <label className="form-label fw-semibold">Full Name <span className="text-danger">*</span></label>
                  <input
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    placeholder="e.g. Dr. Priya Verma"
                    {...register('name')}
                  />
                  {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
                </div>
                <div className="mb-5">
                  <label className="form-label fw-semibold">Email <span className="text-danger">*</span></label>
                  <input
                    type="email"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    placeholder="e.g. tutor@institute.in"
                    {...register('email')}
                  />
                  {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
                  <div className="form-text">A temporary password will be generated and sent.</div>
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
                    <i className="ti tabler-mail-forward me-1"></i>Send Invite
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
          <div
            className="offcanvas-backdrop fade show"
            onClick={() => { setShowCanvas(false); reset() }}
          ></div>
        </>
      )}

    </AdminLayout>
  )
}
