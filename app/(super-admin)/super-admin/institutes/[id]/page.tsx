'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
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
  trialEndsAt: string | null
}

interface Payment {
  id: string
  amount: number
  status: 'CAPTURED' | 'FAILED' | 'REFUNDED' | 'PENDING'
  createdAt: string
  plan: { name: string }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_META = {
  ACTIVE:    { badge: 'bg-label-success', dot: 'bg-success', label: 'Active'    },
  TRIAL:     { badge: 'bg-label-info',    dot: 'bg-info',    label: 'Trial'     },
  SUSPENDED: { badge: 'bg-label-danger',  dot: 'bg-danger',  label: 'Suspended' },
} as const

const PAYMENT_STATUS_META: Record<string, { badge: string; label: string }> = {
  CAPTURED: { badge: 'bg-label-success', label: 'Paid'     },
  PENDING:  { badge: 'bg-label-warning', label: 'Pending'  },
  FAILED:   { badge: 'bg-label-danger',  label: 'Failed'   },
  REFUNDED: { badge: 'bg-label-info',    label: 'Refunded' },
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

// ── Edit schema ───────────────────────────────────────────────────────────────

const editSchema = z.object({
  name:   z.string().min(2, 'Required'),
  planId: z.string().uuid('Select a plan'),
  phone:  z.string().optional(),
  region: z.string().optional(),
})
type EditForm = z.infer<typeof editSchema>

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InstituteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'details' | 'billing'>(
    searchParams.get('tab') === 'billing' ? 'billing' : 'details'
  )

  // ── Institute query ────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery(
    ['institute', id],
    () => api.get(`/super/institutes/${id}`).then((r) => r.data),
    { enabled: !!id }
  )

  // ── Plans query (for edit form) ────────────────────────────────────────────
  const { data: plansData } = useQuery('plans', () =>
    api.get('/super/plans').then((r) => r.data)
  )

  // ── Billing query ──────────────────────────────────────────────────────────
  const { data: billingData, isLoading: billingLoading } = useQuery(
    ['billing', id],
    () => api.get(`/super/billing?instituteId=${id}&limit=50`).then((r) => r.data),
    { enabled: !!id && activeTab === 'billing' }
  )

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateStatus = useMutation(
    (status: string) => api.put(`/super/institutes/${id}/status`, { status }),
    { onSuccess: () => qc.invalidateQueries(['institute', id]) }
  )

  const updateInstitute = useMutation(
    (body: EditForm) => api.put(`/super/institutes/${id}`, body),
    {
      onSuccess: () => {
        qc.invalidateQueries(['institute', id])
        document.getElementById('editOffcanvasClose')?.click()
      },
    }
  )

  const deleteInstitute = useMutation(
    () => api.delete(`/super/institutes/${id}`),
    { onSuccess: () => router.push('/super-admin/institutes') }
  )

  // ── Edit form ──────────────────────────────────────────────────────────────
  const { register, handleSubmit, reset: resetEdit, formState: { errors: editErrors, isSubmitting: editSubmitting } } =
    useForm<EditForm>({ resolver: zodResolver(editSchema) })

  function openEdit() {
    if (!inst) return
    resetEdit({ name: inst.name, planId: inst.plan.id, phone: inst.phone ?? '', region: inst.region ?? '' })
    document.getElementById('editOffcanvasBtn')?.click()
  }

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SuperAdminLayout title="Institute Details" breadcrumb="Home / Institutes / ...">
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 300 }}>
          <div className="spinner-border text-primary" />
        </div>
      </SuperAdminLayout>
    )
  }

  if (isError || !data?.institute) {
    return (
      <SuperAdminLayout title="Institute Not Found" breadcrumb="Home / Institutes / Not Found">
        <div className="card">
          <div className="card-body text-center py-6">
            <i className="ti tabler-building-off icon-48px text-body-secondary mb-3 d-block" />
            <h5 className="mb-2">Institute not found</h5>
            <p className="text-body-secondary mb-4">The institute you are looking for does not exist or was deleted.</p>
            <Link href="/super-admin/institutes" className="btn btn-primary">
              <i className="ti tabler-arrow-left me-1" />Back to Institutes
            </Link>
          </div>
        </div>
      </SuperAdminLayout>
    )
  }

  const inst: Institute = data.institute
  const meta = STATUS_META[inst.status]
  const pct = inst.plan.maxStudents > 0
    ? Math.round((inst._count.users / inst.plan.maxStudents) * 100)
    : 0
  const barColor = pct > 80 ? 'bg-danger' : pct > 50 ? 'bg-warning' : 'bg-success'
  const avatarColor = AVATAR_COLORS[inst.name.charCodeAt(0) % AVATAR_COLORS.length]
  const payments: Payment[] = billingData?.payments ?? []

  return (
    <SuperAdminLayout title={inst.name} breadcrumb={`Home / Institutes / ${inst.name}`}>

      {/* ── Header Card ──────────────────────────────────────────────────── */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-4">
            <div className="d-flex align-items-center gap-4">
              <div className="avatar avatar-xl">
                <span className={`avatar-initial rounded-circle ${avatarColor} fw-bold fs-3`}>
                  {inst.name[0]}
                </span>
              </div>
              <div>
                <h4 className="mb-1">{inst.name}</h4>
                <p className="text-body-secondary mb-1">
                  <i className="ti tabler-world me-1" />
                  {inst.subdomain}.ledxlearn.com
                </p>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className={`badge ${meta.badge} rounded-pill`}>
                    <span
                      className={`${meta.dot} me-1`}
                      style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', verticalAlign: 'middle' }}
                    />
                    {meta.label}
                  </span>
                  <span className="badge bg-label-secondary rounded-pill">{inst.plan.name} Plan</span>
                  {inst.region && (
                    <span className="text-body-secondary small">
                      <i className="ti tabler-map-pin me-1" />{inst.region}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="d-flex gap-2 flex-wrap">
              <Link href="/super-admin/institutes" className="btn btn-outline-secondary">
                <i className="ti tabler-arrow-left me-1" />Back
              </Link>
              <button className="btn btn-outline-primary" onClick={openEdit}>
                <i className="ti tabler-pencil me-1" />Edit
              </button>
              {inst.status !== 'ACTIVE' ? (
                <button
                  className="btn btn-success"
                  disabled={updateStatus.isLoading}
                  onClick={() => updateStatus.mutate('ACTIVE')}
                >
                  {updateStatus.isLoading
                    ? <span className="spinner-border spinner-border-sm me-1" />
                    : <i className="ti tabler-player-play me-1" />
                  }
                  {inst.status === 'TRIAL' ? 'Approve' : 'Reactivate'}
                </button>
              ) : (
                <button
                  className="btn btn-warning"
                  disabled={updateStatus.isLoading}
                  onClick={() => updateStatus.mutate('SUSPENDED')}
                >
                  {updateStatus.isLoading
                    ? <span className="spinner-border spinner-border-sm me-1" />
                    : <i className="ti tabler-player-pause me-1" />
                  }
                  Suspend
                </button>
              )}
              <button
                className="btn btn-danger"
                data-bs-toggle="modal"
                data-bs-target="#modalDeleteInstitute"
              >
                <i className="ti tabler-trash me-1" />Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="row g-6 mb-6">
        {[
          {
            label: 'Students',
            value: inst._count.users.toLocaleString('en-IN'),
            sub: `${pct}% of ${inst.plan.maxStudents.toLocaleString('en-IN')} capacity`,
            icon: 'tabler-users',
            color: 'bg-label-primary',
          },
          {
            label: 'Revenue',
            value: fmtRevenue(inst.revenue),
            sub: 'All-time subscription payments',
            icon: 'tabler-currency-rupee',
            color: 'bg-label-success',
          },
          {
            label: 'Plan',
            value: inst.plan.name,
            sub: `₹${Number(inst.plan.priceMonthly).toLocaleString('en-IN')}/month`,
            icon: 'tabler-diamond',
            color: 'bg-label-info',
          },
          {
            label: 'Joined',
            value: new Date(inst.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            sub: inst.trialEndsAt
              ? `Trial ends ${new Date(inst.trialEndsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : 'No trial period',
            icon: 'tabler-calendar',
            color: 'bg-label-warning',
          },
        ].map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between">
                  <div>
                    <span className="text-heading">{s.label}</span>
                    <h4 className="my-1 mb-0">{s.value}</h4>
                    <small className="text-body-secondary">{s.sub}</small>
                  </div>
                  <div className="avatar">
                    <span className={`avatar-initial rounded ${s.color}`}>
                      <i className={`icon-base ti ${s.icon} icon-26px`} />
                    </span>
                  </div>
                </div>
                {s.label === 'Students' && (
                  <div className="progress mt-2" style={{ height: 5 }}>
                    <div className={`progress-bar ${barColor}`} style={{ width: `${pct}%` }} role="progressbar" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <i className="ti tabler-info-circle me-1" />Details
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing')}
          >
            <i className="ti tabler-credit-card me-1" />Billing
          </button>
        </li>
      </ul>

      {/* ── Details Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'details' && (
        <div className="row g-6">
          <div className="col-xl-6">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="card-title mb-0">Institute Information</h5>
              </div>
              <div className="card-body">
                <dl className="row mb-0">
                  {[
                    { label: 'Institute ID', value: inst.id, mono: true },
                    { label: 'Subdomain', value: `${inst.subdomain}.ledxlearn.com` },
                    { label: 'Phone', value: inst.phone ?? '—' },
                    { label: 'Region', value: inst.region ?? '—' },
                    { label: 'Status', value: inst.status },
                    { label: 'Created At', value: new Date(inst.createdAt).toLocaleString('en-IN') },
                  ].map((row) => (
                    <div key={row.label} className="col-12 mb-3">
                      <dt className="text-body-secondary small fw-normal mb-1">{row.label}</dt>
                      <dd className={`mb-0 fw-semibold ${row.mono ? 'font-monospace small' : ''}`}>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>

          <div className="col-xl-6">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="card-title mb-0">Admin &amp; Plan</h5>
              </div>
              <div className="card-body">
                <h6 className="text-body-secondary text-uppercase small mb-3">Admin Contact</h6>
                <dl className="row mb-4">
                  {[
                    { label: 'Name', value: inst.adminName },
                    { label: 'Email', value: inst.adminEmail },
                  ].map((row) => (
                    <div key={row.label} className="col-12 mb-3">
                      <dt className="text-body-secondary small fw-normal mb-1">{row.label}</dt>
                      <dd className="mb-0 fw-semibold">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                <h6 className="text-body-secondary text-uppercase small mb-3">Subscription Plan</h6>
                <dl className="row mb-0">
                  {[
                    { label: 'Plan Name', value: inst.plan.name },
                    { label: 'Monthly Price', value: `₹${Number(inst.plan.priceMonthly).toLocaleString('en-IN')}` },
                    { label: 'Max Students', value: inst.plan.maxStudents.toLocaleString('en-IN') },
                  ].map((row) => (
                    <div key={row.label} className="col-12 mb-3">
                      <dt className="text-body-secondary small fw-normal mb-1">{row.label}</dt>
                      <dd className="mb-0 fw-semibold">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Billing Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'billing' && (
        <div className="card">
          <div className="card-header d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0">Billing History</h5>
            <span className="badge bg-label-secondary rounded-pill">{billingData?.total ?? 0} transactions</span>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="border-top">
                <tr>
                  <th>Transaction ID</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody className="table-border-bottom-0">
                {billingLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j}><span className="placeholder col-8" /></td>
                      ))}
                    </tr>
                  ))
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-5 text-body-secondary">
                      <i className="ti tabler-credit-card-off d-block icon-32px mb-2" />
                      No billing records found
                    </td>
                  </tr>
                ) : payments.map((p) => {
                  const pmeta = PAYMENT_STATUS_META[p.status] ?? { badge: 'bg-label-secondary', label: p.status }
                  return (
                    <tr key={p.id}>
                      <td>
                        <span className="font-monospace small text-body-secondary">{p.id.slice(0, 8)}…</span>
                      </td>
                      <td>{p.plan.name}</td>
                      <td>
                        <span className="fw-semibold">₹{Number(p.amount).toLocaleString('en-IN')}</span>
                      </td>
                      <td>
                        <span className={`badge ${pmeta.badge} rounded-pill`}>{pmeta.label}</span>
                      </td>
                      <td>
                        <span className="text-body-secondary">
                          {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {payments.length > 0 && (
            <div className="card-footer d-flex align-items-center justify-content-between">
              <span className="text-body-secondary small">
                Total paid: <strong>{fmtRevenue(payments.filter(p => p.status === 'CAPTURED').reduce((s, p) => s + Number(p.amount), 0))}</strong>
              </span>
              <span className="text-body-secondary small">
                Refunded: <strong>{fmtRevenue(payments.filter(p => p.status === 'REFUNDED').reduce((s, p) => s + Number(p.amount), 0))}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Edit Offcanvas ────────────────────────────────────────────────── */}
      {/* Hidden trigger button — opened programmatically via openEdit() */}
      <button
        id="editOffcanvasBtn"
        className="d-none"
        data-bs-toggle="offcanvas"
        data-bs-target="#offcanvasEditInstitute"
      />

      <div className="offcanvas offcanvas-end" tabIndex={-1} id="offcanvasEditInstitute" style={{ width: 420 }}>
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title">Edit Institute</h5>
          <button id="editOffcanvasClose" type="button" className="btn-close" data-bs-dismiss="offcanvas" />
        </div>
        <div className="offcanvas-body p-4">
          {updateInstitute.isError && (
            <div className="alert alert-danger py-2 small mb-4">
              Failed to save changes. Please try again.
            </div>
          )}
          {updateInstitute.isSuccess && (
            <div className="alert alert-success py-2 small mb-4">
              Institute updated successfully.
            </div>
          )}

          <form onSubmit={handleSubmit((d) => updateInstitute.mutate(d))} noValidate>
            <div className="mb-4">
              <label className="form-label fw-semibold" htmlFor="edit-name">Institute Name</label>
              <input
                id="edit-name"
                type="text"
                className={`form-control ${editErrors.name ? 'is-invalid' : ''}`}
                {...register('name')}
              />
              {editErrors.name && <div className="invalid-feedback">{editErrors.name.message}</div>}
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold" htmlFor="edit-planId">Plan</label>
              <select
                id="edit-planId"
                className={`form-select ${editErrors.planId ? 'is-invalid' : ''}`}
                {...register('planId')}
              >
                <option value="">Select a plan…</option>
                {(plansData?.plans ?? []).map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{Number(p.priceMonthly).toLocaleString('en-IN')}/mo
                  </option>
                ))}
              </select>
              {editErrors.planId && <div className="invalid-feedback">{editErrors.planId.message}</div>}
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold" htmlFor="edit-phone">Phone Number</label>
              <input
                id="edit-phone"
                type="tel"
                className="form-control"
                placeholder="+91 98000 00000"
                {...register('phone')}
              />
            </div>

            <div className="mb-5">
              <label className="form-label fw-semibold" htmlFor="edit-region">Region / City</label>
              <select id="edit-region" className="form-select" {...register('region')}>
                <option value="">Select region…</option>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div className="d-flex gap-3">
              <button
                type="submit"
                className="btn btn-primary flex-grow-1"
                disabled={editSubmitting || updateInstitute.isLoading}
              >
                {(editSubmitting || updateInstitute.isLoading) && (
                  <span className="spinner-border spinner-border-sm me-2" />
                )}
                <i className="ti tabler-check me-1" />Save Changes
              </button>
              <button type="button" className="btn btn-label-secondary" data-bs-dismiss="offcanvas">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Delete Modal ─────────────────────────────────────────────────── */}
      <div className="modal fade" id="modalDeleteInstitute" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header border-0 pb-0">
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body px-5 pb-2 text-center">
              <div className="mb-4">
                <span className="avatar avatar-lg bg-label-danger rounded-circle">
                  <i className="ti tabler-trash icon-28px text-danger" />
                </span>
              </div>
              <h4 className="mb-2">Delete Institute?</h4>
              <p className="text-body-secondary mb-1">You are about to permanently delete</p>
              <p className="fw-semibold mb-3">{inst.name}</p>
              <div className="alert alert-danger py-2 text-start small mb-0">
                <i className="ti tabler-alert-triangle me-1" />
                <strong>This cannot be undone.</strong> All students, courses, payments, and data will be permanently erased.
              </div>
            </div>
            <div className="modal-footer border-0 pt-3 justify-content-center gap-3">
              <button type="button" className="btn btn-label-secondary px-5" data-bs-dismiss="modal">
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger px-5"
                data-bs-dismiss="modal"
                disabled={deleteInstitute.isLoading}
                onClick={() => deleteInstitute.mutate()}
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
