'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import SuperAdminLayout from '@/components/layouts/SuperAdminLayout'
import api from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Institute {
  id: string
  name: string
  subdomain: string
  phone: string | null
  region: string | null
  status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED'
  plan: { id: string; name: string; priceMonthly: number; maxStudents: number }
  adminName: string
  adminEmail: string
  revenue: number
  _count: { users: number }
  createdAt: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_META = {
  ACTIVE:    { badge: 'bg-label-success', dot: 'bg-success', label: 'Active'    },
  TRIAL:     { badge: 'bg-label-info',    dot: 'bg-info',    label: 'Trial'     },
  SUSPENDED: { badge: 'bg-label-danger',  dot: 'bg-danger',  label: 'Suspended' },
} as const

const PLAN_BADGE: Record<string, string> = {
  Starter: 'bg-label-secondary',
  Growth:  'bg-label-info',
  Pro:     'bg-label-primary',
}

const AVATAR_COLORS = [
  'bg-label-primary','bg-label-success','bg-label-info',
  'bg-label-warning','bg-label-danger', 'bg-label-secondary',
]

const REGIONS = ['Delhi','Mumbai','Bangalore','Chennai','Hyderabad','Pune','Kolkata','Other']

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRevenue(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`
  return n > 0 ? `₹${n}` : '—'
}

// ── Invite form schema ────────────────────────────────────────────────────────

const inviteSchema = z.object({
  name:       z.string().min(2, 'Required'),
  subdomain:  z.string().min(2).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens'),
  adminEmail: z.string().email('Enter a valid email'),
  adminName:  z.string().min(2, 'Required'),
  planId:     z.string().uuid('Select a plan'),
  phone:      z.string().optional(),
  region:     z.string().optional(),
  trialDays:  z.coerce.number().int().min(1).max(365),
})
type InviteForm = z.infer<typeof inviteSchema>

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InstitutesPage() {
  const qc = useQueryClient()

  const [statusFilter, setStatusFilter] = useState('')
  const [planFilter,   setPlanFilter]   = useState('')
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [selected,     setSelected]     = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<Institute | null>(null)

  const limit = 10

  const { data, isLoading } = useQuery(
    ['institutes', statusFilter, planFilter, page],
    () => {
      const params = new URLSearchParams({ limit: String(limit), page: String(page) })
      if (statusFilter) params.set('status', statusFilter)
      if (planFilter)   params.set('planId', planFilter)
      return api.get(`/super/institutes?${params}`).then((r) => r.data)
    }
  )

  const { data: plansData } = useQuery('plans', () =>
    api.get('/super/plans').then((r) => r.data)
  )

  const updateStatus = useMutation(
    ({ id, status }: { id: string; status: string }) =>
      api.put(`/super/institutes/${id}/status`, { status }),
    { onSuccess: () => qc.invalidateQueries('institutes') }
  )

  const deleteInstitute = useMutation(
    (id: string) => api.delete(`/super/institutes/${id}`),
    {
      onSuccess: () => {
        qc.invalidateQueries('institutes')
        setDeleteTarget(null)
      },
    }
  )

  const createInstitute = useMutation(
    (formData: InviteForm) => api.post('/super/institutes', formData),
    {
      onSuccess: () => {
        qc.invalidateQueries('institutes')
        document.getElementById('offcanvasClose')?.click()
        reset()
      },
    }
  )

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { trialDays: 14 },
  })

  const institutes: Institute[] = data?.institutes ?? []
  const total: number           = data?.total ?? 0
  const newThisMonth: number    = data?.newThisMonth ?? 0
  const totalPages              = Math.ceil(total / limit)

  const filtered = search
    ? institutes.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.adminName.toLowerCase().includes(search.toLowerCase())
      )
    : institutes

  const pendingCount = institutes.filter((i) => i.status === 'TRIAL').length

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleAll = () =>
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((i) => i.id)))

  return (
    <SuperAdminLayout title="Institutes" breadcrumb="Home / Institutes">

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="row g-6 mb-6">
        {[
          { label: 'Total Institutes', value: isLoading ? '—' : total,          change: '+5.1%', pos: true,  sub: 'All time',           icon: 'tabler-building',      color: 'bg-label-primary' },
          { label: 'Active',           value: isLoading ? '—' : institutes.filter(i => i.status === 'ACTIVE').length,    change: '+12%',  pos: true,  sub: 'Currently live',     icon: 'tabler-buildings',     color: 'bg-label-success' },
          { label: 'New This Month',   value: isLoading ? '—' : newThisMonth,   change: '+42%',  pos: true,  sub: new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' }), icon: 'tabler-building-plus', color: 'bg-label-info' },
          { label: 'Pending Review',   value: isLoading ? '—' : institutes.filter(i => i.status === 'TRIAL').length,     change: 'Action',pos: false, sub: 'Awaiting approval',  icon: 'tabler-clock',         color: 'bg-label-warning' },
        ].map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between">
                  <div className="content-left">
                    <span className="text-heading">{s.label}</span>
                    <div className="d-flex align-items-center my-1">
                      <h4 className="mb-0 me-2">{s.value}</h4>
                      <p className={`mb-0 ${s.pos ? 'text-success' : 'text-warning'}`}>({s.change})</p>
                    </div>
                    <small className="mb-0 text-body-secondary">{s.sub}</small>
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

      {/* ── Main Card ────────────────────────────────────────────────────── */}
      <div className="card">

        {/* Filter header */}
        <div className="card-header border-bottom">
          <h5 className="card-title mb-0">Search Filters</h5>
          <div className="d-flex justify-content-between align-items-center row pt-4 gap-4 gap-md-0">
            <div className="col-md-4">
              <select
                className="form-select"
                value={planFilter}
                onChange={(e) => { setPlanFilter(e.target.value); setPage(1) }}
              >
                <option value="">All Plans</option>
                {(plansData?.plans ?? []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="TRIAL">Trial</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            <div className="col-md-4">
              <select className="form-select" defaultValue="">
                <option value="">All Regions</option>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="card-body border-bottom py-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="position-relative" style={{ minWidth: 240 }}>
              <span className="position-absolute top-50 start-0 translate-middle-y ps-3" style={{ pointerEvents: 'none' }}>
                <i className="ti tabler-search text-body-secondary" />
              </span>
              <input
                type="text"
                className="form-control ps-5"
                placeholder="Search institute or owner…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  const headers = ['Name', 'Admin', 'Email', 'Plan', 'Students', 'Revenue', 'Status', 'Region', 'Joined']
                  const rows = filtered.map((i) => [
                    i.name,
                    i.adminName,
                    i.adminEmail,
                    i.plan.name,
                    i._count.users,
                    i.revenue,
                    i.status,
                    i.region ?? '',
                    new Date(i.createdAt).toLocaleDateString('en-IN'),
                  ])
                  const csv = [headers, ...rows]
                    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
                    .join('\n')
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `institutes-${new Date().toISOString().slice(0, 10)}.csv`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                <i className="ti tabler-download me-1" />Export CSV
              </button>
              <button
                className="btn btn-outline-warning"
                onClick={() => { setStatusFilter('TRIAL'); setPage(1) }}
              >
                <i className="ti tabler-clock me-1" />Pending ({pendingCount})
              </button>
              <button
                className="btn btn-primary"
                data-bs-toggle="offcanvas"
                data-bs-target="#offcanvasInviteInstitute"
              >
                <i className="ti tabler-plus me-1" />Invite Institute
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive text-nowrap">
          <table className="table table-hover align-middle">
            <thead className="border-top">
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleAll}
                  />
                </th>
                <th>Institute</th>
                <th>Plan</th>
                <th>Students</th>
                <th>Revenue (Mo.)</th>
                <th>Joined</th>
                <th>Status</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody className="table-border-bottom-0">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><span className="placeholder col-8" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-body-secondary">
                    No institutes found
                  </td>
                </tr>
              ) : filtered.map((inst, idx) => {
                const meta    = STATUS_META[inst.status]
                const pct     = inst.plan.maxStudents > 0
                  ? Math.round((inst._count.users / inst.plan.maxStudents) * 100)
                  : 0
                const barColor = pct > 80 ? 'bg-danger' : pct > 50 ? 'bg-warning' : 'bg-success'
                return (
                  <tr key={inst.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selected.has(inst.id)}
                        onChange={() => toggleSelect(inst.id)}
                      />
                    </td>

                    {/* Institute + owner */}
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div className="avatar">
                          <span className={`avatar-initial rounded-circle ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} fw-bold`}>
                            {inst.name[0]}
                          </span>
                        </div>
                        <div>
                          <Link
                            href={`/super-admin/institutes/${inst.id}`}
                            className="fw-semibold text-heading text-decoration-none d-block"
                            style={{ lineHeight: 1.3 }}
                          >
                            {inst.name}
                          </Link>
                          <small className="text-body-secondary">{inst.adminName}</small>
                        </div>
                      </div>
                    </td>

                    {/* Plan */}
                    <td>
                      <span className={`badge ${PLAN_BADGE[inst.plan.name] ?? 'bg-label-secondary'} rounded-pill`}>
                        {inst.plan.name}
                      </span>
                    </td>

                    {/* Students + capacity bar */}
                    <td>
                      <div style={{ minWidth: 110 }}>
                        <div className="d-flex justify-content-between mb-1">
                          <span className="fw-semibold small">{inst._count.users.toLocaleString('en-IN')}</span>
                          <span className="text-body-secondary small">{pct}%</span>
                        </div>
                        <div className="progress" style={{ height: 5 }}>
                          <div className={`progress-bar ${barColor}`} style={{ width: `${pct}%` }} role="progressbar" />
                        </div>
                      </div>
                    </td>

                    {/* Revenue */}
                    <td>
                      <span className="fw-semibold">{fmtRevenue(inst.revenue)}</span>
                    </td>

                    {/* Joined */}
                    <td>
                      <span className="text-body-secondary">
                        {new Date(inst.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </td>

                    {/* Status with dot */}
                    <td>
                      <span className={`badge ${meta.badge} rounded-pill`}>
                        <span
                          className={`${meta.dot} me-1`}
                          style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', verticalAlign: 'middle' }}
                        />
                        {meta.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="d-flex align-items-center gap-1">
                        <Link
                          href={`/super-admin/institutes/${inst.id}`}
                          className="btn btn-sm btn-icon btn-text-secondary rounded-pill"
                          title="View details"
                        >
                          <i className="ti tabler-eye icon-md" />
                        </Link>
                        <div className="dropdown">
                          <button
                            className="btn btn-sm btn-icon btn-text-secondary rounded-pill dropdown-toggle hide-arrow"
                            data-bs-toggle="dropdown"
                          >
                            <i className="ti tabler-dots-vertical icon-md" />
                          </button>
                          <div className="dropdown-menu dropdown-menu-end">
                            <Link className="dropdown-item" href={`/super-admin/institutes/${inst.id}`}>
                              <i className="ti tabler-eye me-2 text-body-secondary" />View Details
                            </Link>
                            <Link className="dropdown-item" href={`/super-admin/institutes/${inst.id}`}>
                              <i className="ti tabler-pencil me-2 text-body-secondary" />Edit Details
                            </Link>
                            <Link className="dropdown-item" href={`/super-admin/institutes/${inst.id}?tab=billing`}>
                              <i className="ti tabler-credit-card me-2 text-body-secondary" />View Billing
                            </Link>
                            <div className="dropdown-divider" />
                            {inst.status !== 'ACTIVE' ? (
                              <button
                                className="dropdown-item text-success"
                                onClick={() => updateStatus.mutate({ id: inst.id, status: 'ACTIVE' })}
                              >
                                <i className="ti tabler-player-play me-2" />
                                {inst.status === 'TRIAL' ? 'Approve' : 'Reactivate'}
                              </button>
                            ) : (
                              <button
                                className="dropdown-item text-warning"
                                onClick={() => updateStatus.mutate({ id: inst.id, status: 'SUSPENDED' })}
                              >
                                <i className="ti tabler-player-pause me-2" />Suspend
                              </button>
                            )}
                            <button
                              className="dropdown-item text-danger"
                              data-bs-toggle="modal"
                              data-bs-target="#modalDeleteInstitute"
                              onClick={() => setDeleteTarget(inst)}
                            >
                              <i className="ti tabler-trash me-2" />Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="card-footer">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <span className="text-body-secondary small">
              Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total} institutes
            </span>
            <nav>
              <ul className="pagination pagination-sm mb-0 gap-1">
                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                  <button className="page-link rounded" onClick={() => setPage(page - 1)}>‹</button>
                </li>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page + i - 2
                  if (p < 1 || p > totalPages) return null
                  return (
                    <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                      <button className="page-link rounded" onClick={() => setPage(p)}>{p}</button>
                    </li>
                  )
                })}
                <li className={`page-item ${page === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
                  <button className="page-link rounded" onClick={() => setPage(page + 1)}>›</button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>

      {/* ── Offcanvas — Invite ────────────────────────────────────────────── */}
      <div className="offcanvas offcanvas-end" tabIndex={-1} id="offcanvasInviteInstitute" style={{ width: 420 }}>
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title">Invite Institute</h5>
          <button id="offcanvasClose" type="button" className="btn-close" data-bs-dismiss="offcanvas" />
        </div>
        <div className="offcanvas-body p-4">
          <p className="text-body-secondary mb-5 small">
            Send an invitation to onboard a new institute. They will receive setup instructions via email.
          </p>

          {createInstitute.isError && (
            <div className="alert alert-danger py-2 small mb-4">
              Failed to create institute. Check details and try again.
            </div>
          )}

          <form onSubmit={handleSubmit((d) => createInstitute.mutate(d))} noValidate>
            {([
              { id: 'name',       label: 'Institute Name',  type: 'text',  placeholder: 'e.g. Supreme Law Academy'      },
              { id: 'subdomain',  label: 'Subdomain',       type: 'text',  placeholder: 'e.g. supreme'                   },
              { id: 'adminName',  label: 'Admin Name',      type: 'text',  placeholder: 'e.g. Rajesh Sharma'             },
              { id: 'adminEmail', label: 'Admin Email',     type: 'email', placeholder: 'e.g. rajesh@supremelaw.in'      },
              { id: 'phone',      label: 'Phone Number',    type: 'tel',   placeholder: '+91 98000 00000'                },
            ] as const).map((f) => (
              <div key={f.id} className="mb-4">
                <label className="form-label fw-semibold" htmlFor={f.id}>{f.label}</label>
                <input
                  id={f.id}
                  type={f.type}
                  className={`form-control ${errors[f.id] ? 'is-invalid' : ''}`}
                  placeholder={f.placeholder}
                  {...register(f.id)}
                />
                {errors[f.id] && <div className="invalid-feedback">{errors[f.id]?.message}</div>}
              </div>
            ))}

            <div className="mb-4">
              <label className="form-label fw-semibold" htmlFor="planId">Assign Plan</label>
              <select id="planId" className={`form-select ${errors.planId ? 'is-invalid' : ''}`} {...register('planId')}>
                <option value="">Select a plan…</option>
                {(plansData?.plans ?? []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} — ₹{Number(p.priceMonthly).toLocaleString('en-IN')}/mo</option>
                ))}
              </select>
              {errors.planId && <div className="invalid-feedback">{errors.planId.message}</div>}
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold" htmlFor="region">Region / City</label>
              <select id="region" className="form-select" {...register('region')}>
                <option value="">Select region…</option>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div className="mb-5">
              <label className="form-label fw-semibold" htmlFor="trialDays">Trial Period (days)</label>
              <div className="input-group">
                <input
                  id="trialDays"
                  type="number"
                  min={1}
                  max={365}
                  className={`form-control ${errors.trialDays ? 'is-invalid' : ''}`}
                  {...register('trialDays')}
                />
                <span className="input-group-text">days</span>
                {errors.trialDays && <div className="invalid-feedback">{errors.trialDays.message}</div>}
              </div>
              <small className="text-body-secondary">Institute admin will see trial countdown and can pay to activate.</small>
            </div>

            <div className="d-flex gap-3">
              <button type="submit" className="btn btn-primary flex-grow-1" disabled={isSubmitting || createInstitute.isLoading}>
                {(isSubmitting || createInstitute.isLoading) && <span className="spinner-border spinner-border-sm me-2" />}
                <i className="ti tabler-send me-1" />Send Invite
              </button>
              <button type="reset" className="btn btn-label-secondary" data-bs-dismiss="offcanvas">Cancel</button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      <div className="modal fade" id="modalDeleteInstitute" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header border-0 pb-0">
              <button type="button" className="btn-close" data-bs-dismiss="modal" onClick={() => setDeleteTarget(null)} />
            </div>
            <div className="modal-body px-5 pb-2 text-center">
              <div className="mb-4">
                <span className="avatar avatar-lg bg-label-danger rounded-circle">
                  <i className="ti tabler-trash icon-28px text-danger" />
                </span>
              </div>
              <h4 className="mb-2">Delete Institute?</h4>
              <p className="text-body-secondary mb-1">You are about to permanently delete</p>
              <p className="fw-semibold mb-3">{deleteTarget?.name}</p>
              <div className="alert alert-danger py-2 text-start small mb-0">
                <i className="ti tabler-alert-triangle me-1" />
                <strong>This cannot be undone.</strong> All students, courses, payments, and data will be permanently erased.
              </div>
            </div>
            <div className="modal-footer border-0 pt-3 justify-content-center gap-3">
              <button type="button" className="btn btn-label-secondary px-5" data-bs-dismiss="modal" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger px-5"
                data-bs-dismiss="modal"
                disabled={deleteInstitute.isLoading}
                onClick={() => deleteTarget && deleteInstitute.mutate(deleteTarget.id)}
              >
                {deleteInstitute.isLoading
                  ? <span className="spinner-border spinner-border-sm me-2" />
                  : <i className="ti tabler-trash me-1" />
                }
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      </div>

    </SuperAdminLayout>
  )
}
