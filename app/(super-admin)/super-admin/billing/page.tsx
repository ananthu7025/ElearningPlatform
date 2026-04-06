'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'react-query'
import SuperAdminLayout from '@/components/layouts/SuperAdminLayout'
import api from '@/lib/api'

const STATUS_META = {
  CAPTURED: { badge: 'bg-label-success', label: 'Paid'     },
  PENDING:  { badge: 'bg-label-warning', label: 'Pending'  },
  FAILED:   { badge: 'bg-label-danger',  label: 'Failed'   },
  REFUNDED: { badge: 'bg-label-secondary',label: 'Refunded'},
} as const

const PLAN_BADGE: Record<string, string> = {
  Starter: 'bg-label-secondary',
  Growth:  'bg-label-info',
  Pro:     'bg-label-primary',
}

const AVATAR_COLORS = ['bg-label-primary','bg-label-success','bg-label-info','bg-label-warning','bg-label-danger']

export default function BillingPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const sendReceipt = useMutation(
    (id: string) => api.post(`/super/billing/${id}/send-receipt`).then((r) => r.data),
    {
      onSuccess: (_, id) => setSentIds((prev) => new Set(prev).add(id)),
    }
  )

  const { data, isLoading } = useQuery(
    ['billing', statusFilter],
    () => api.get(`/super/billing?${statusFilter ? `status=${statusFilter}&` : ''}limit=50`).then((r) => r.data)
  )

  const payments = data?.payments ?? []

  const totalRevenue = payments
    .filter((p: any) => p.status === 'CAPTURED')
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0)

  return (
    <SuperAdminLayout title="Billing" breadcrumb="Home / Billing">

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="row g-6 mb-6">
        {[
          { label: 'Total Revenue',  value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: 'tabler-currency-rupee', color: 'bg-label-success' },
          { label: 'Transactions',   value: data?.total ?? '—',                          icon: 'tabler-receipt',        color: 'bg-label-primary' },
          { label: 'Failed',         value: payments.filter((p: any) => p.status === 'FAILED').length,   icon: 'tabler-alert-circle', color: 'bg-label-danger'  },
          { label: 'Pending',        value: payments.filter((p: any) => p.status === 'PENDING').length,  icon: 'tabler-clock',        color: 'bg-label-warning' },
        ].map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between">
                  <div>
                    <span className="text-heading">{s.label}</span>
                    <h4 className="my-1">{isLoading ? '—' : s.value}</h4>
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

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">Subscription Payments</h5>
          <select
            className="form-select w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="CAPTURED">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="border-top">
              <tr>
                <th>Institute</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Billing Period</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><span className="placeholder col-8" /></td>
                    ))}
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-body-secondary">No payments found</td>
                </tr>
              ) : (
                payments.map((p: any, idx: number) => {
                  const meta = STATUS_META[p.status as keyof typeof STATUS_META] ?? { badge: 'bg-label-secondary', label: p.status }
                  const isSending = sendReceipt.isLoading && sendReceipt.variables === p.id
                  const wasSent = sentIds.has(p.id)
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="avatar avatar-sm">
                            <span className={`avatar-initial rounded-circle ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                              {p.institute.name[0]}
                            </span>
                          </div>
                          <span className="fw-medium">{p.institute.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${PLAN_BADGE[p.plan.name] ?? 'bg-label-secondary'} rounded-pill`}>
                          {p.plan.name}
                        </span>
                      </td>
                      <td className="fw-semibold">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                      <td>
                        <small className="text-body-secondary">
                          {new Date(p.billingPeriodStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          {' – '}
                          {new Date(p.billingPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </small>
                      </td>
                      <td><span className={`badge ${meta.badge} rounded-pill`}>{meta.label}</span></td>
                      <td>
                        <small className="text-body-secondary">
                          {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </small>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <a
                            href={`/super-admin/billing/${p.id}`}
                            className="btn btn-sm btn-label-primary"
                            title="View Receipt"
                          >
                            <i className="ti tabler-receipt icon-xs me-1" />Receipt
                          </a>
                          <button
                            className={`btn btn-sm ${wasSent ? 'btn-label-success' : 'btn-label-secondary'}`}
                            title="Send Receipt"
                            disabled={isSending}
                            onClick={() => sendReceipt.mutate(p.id)}
                          >
                            {isSending ? (
                              <span className="spinner-border spinner-border-sm" />
                            ) : (
                              <i className={`ti ${wasSent ? 'tabler-check' : 'tabler-send'} icon-xs me-1`} />
                            )}
                            {wasSent ? 'Sent' : 'Send'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </SuperAdminLayout>
  )
}
