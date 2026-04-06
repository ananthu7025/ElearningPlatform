'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'react-query'
import SuperAdminLayout from '@/components/layouts/SuperAdminLayout'
import api from '@/lib/api'

const STATUS_META = {
  CAPTURED: { badge: 'bg-label-success', label: 'Paid',     stamp: '#28C76F' },
  PENDING:  { badge: 'bg-label-warning', label: 'Pending',  stamp: '#FF9F43' },
  FAILED:   { badge: 'bg-label-danger',  label: 'Failed',   stamp: '#FF4C51' },
  REFUNDED: { badge: 'bg-label-secondary',label: 'Refunded',stamp: '#808390' },
} as const

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 })

export default function BillingReceiptPage({ params }: { params: { id: string } }) {
  const [sendSuccess, setSendSuccess] = useState(false)

  const { data, isLoading } = useQuery(
    ['billing-payment', params.id],
    () => api.get(`/super/billing/${params.id}`).then((r) => r.data.payment)
  )

  const sendMutation = useMutation(
    () => api.post(`/super/billing/${params.id}/send-receipt`).then((r) => r.data),
    {
      onSuccess: () => {
        setSendSuccess(true)
        setTimeout(() => setSendSuccess(false), 4000)
      },
    }
  )

  const p = data
  const meta = p ? (STATUS_META[p.status as keyof typeof STATUS_META] ?? { badge: 'bg-label-secondary', label: p.status, stamp: '#808390' }) : null
  const adminUser = p?.institute?.users?.[0]

  const periodStart = p ? new Date(p.billingPeriodStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  const periodEnd   = p ? new Date(p.billingPeriodEnd).toLocaleDateString('en-IN',   { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  const paidDate    = p ? new Date(p.createdAt).toLocaleDateString('en-IN',           { day: 'numeric', month: 'long',  year: 'numeric' }) : ''
  const shortId     = p ? p.id.substring(0, 8).toUpperCase() : ''

  return (
    <SuperAdminLayout
      title="Subscription Receipt"
      breadcrumb={`Home / Billing / ${shortId}`}
    >
      <style>{`
        @media print {
          .layout-menu,
          .layout-navbar,
          #layout-navbar,
          .layout-overlay,
          .content-backdrop,
          .invoice-sidebar,
          h4.py-3 { display: none !important; }

          body, .layout-wrapper, .layout-container,
          .layout-page, .content-wrapper,
          .container-xxl { padding: 0 !important; margin: 0 !important; background: #fff !important; }

          .invoice-main {
            width: 100% !important;
            max-width: 100% !important;
            flex: 0 0 100% !important;
            padding: 0 !important;
          }

          .invoice-main .card {
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
      {isLoading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : !p ? (
        <div className="alert alert-danger">Payment not found.</div>
      ) : (
        <div className="row invoice-preview">

          {/* ── Receipt Card ──────────────────────────────────────────── */}
          <div className="col-xl-9 col-md-8 col-12 mb-md-0 mb-6 invoice-main">
            <div className="card p-sm-12 p-6 position-relative">

              {/* Status stamp */}
              <div
                className="position-absolute d-none d-sm-flex align-items-center justify-content-center"
                style={{
                  top: 36, right: 48,
                  border: `3px solid ${meta!.stamp}`,
                  color: meta!.stamp,
                  fontWeight: 800,
                  padding: '4px 18px',
                  borderRadius: 6,
                  fontSize: 18,
                  transform: 'rotate(-10deg)',
                  opacity: 0.7,
                  letterSpacing: 3,
                  pointerEvents: 'none',
                }}
              >
                {meta!.label.toUpperCase()}
              </div>

              {/* ── Header ─────────────────────────────────────────────── */}
              <div
                className="card-body rounded mb-6"
                style={{ background: '#7367F010', padding: '1.5rem 1.75rem' }}
              >
                <div className="d-flex justify-content-between flex-xl-row flex-md-column flex-sm-row flex-column align-items-xl-center align-items-md-start align-items-sm-center align-items-start gap-4">

                  {/* Brand */}
                  <div className="mb-xl-0 mb-4">
                    <div className="d-flex align-items-center gap-2 mb-4">
                      <div
                        style={{
                          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                          background: 'linear-gradient(135deg, #7367F0 0%, #9E95F5 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <i className="ti tabler-school" style={{ fontSize: 20, color: '#fff' }} />
                      </div>
                      <span className="fw-bold text-heading" style={{ fontSize: 22 }}>LedxElearn</span>
                    </div>
                    <p className="mb-1 text-heading fw-semibold">Platform Subscription Receipt</p>
                    <p className="mb-0 text-body-secondary" style={{ fontSize: 13 }}>support@ledxelearn.com</p>
                  </div>

                  {/* Receipt meta */}
                  <div>
                    <h5 className="mb-4 fw-bold text-primary">Receipt #{shortId}</h5>
                    <table>
                      <tbody>
                        <tr>
                          <td className="text-body-secondary pe-4 pb-1">Date:</td>
                          <td className="fw-medium text-heading">{paidDate}</td>
                        </tr>
                        {p.razorpayPaymentId && (
                          <tr>
                            <td className="text-body-secondary pe-4 pb-1">Payment ID:</td>
                            <td><code className="text-primary fw-semibold" style={{ fontSize: 12 }}>{p.razorpayPaymentId}</code></td>
                          </tr>
                        )}
                        <tr>
                          <td className="text-body-secondary pe-4 pb-1">Status:</td>
                          <td><span className={`badge ${meta!.badge} rounded-pill`}>{meta!.label}</span></td>
                        </tr>
                        <tr>
                          <td className="text-body-secondary pe-4">Currency:</td>
                          <td className="fw-medium text-heading">{p.currency}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* ── Billed To / Plan Info ──────────────────────────────── */}
              <div className="card-body px-0 pb-6">
                <div className="row">
                  <div className="col-xl-6 col-md-12 col-sm-5 col-12 mb-xl-0 mb-md-6 mb-sm-0 mb-6">
                    <h6 className="mb-3">Billed To:</h6>
                    <p className="fw-semibold text-heading mb-1">{p.institute.name}</p>
                    {adminUser && (
                      <>
                        <p className="mb-1 text-body-secondary">{adminUser.email}</p>
                        <p className="mb-1 text-body-secondary">Contact: {adminUser.name}</p>
                      </>
                    )}
                    {p.institute.phone && (
                      <p className="mb-0 text-body-secondary">{p.institute.phone}</p>
                    )}
                    <p className="mb-0 text-body-secondary">
                      Subdomain: <span className="text-heading fw-medium">{p.institute.subdomain}</span>
                    </p>
                  </div>
                  <div className="col-xl-6 col-md-12 col-sm-7 col-12">
                    <h6 className="mb-3">Subscription Details:</h6>
                    <table>
                      <tbody>
                        <tr>
                          <td className="text-body-secondary pe-4 pb-2">Plan:</td>
                          <td className="fw-medium text-heading">{p.plan.name}</td>
                        </tr>
                        <tr>
                          <td className="text-body-secondary pe-4 pb-2">Period Start:</td>
                          <td className="fw-medium text-heading">{periodStart}</td>
                        </tr>
                        <tr>
                          <td className="text-body-secondary pe-4 pb-2">Period End:</td>
                          <td className="fw-medium text-heading">{periodEnd}</td>
                        </tr>
                        <tr>
                          <td className="text-body-secondary pe-4">Institute ID:</td>
                          <td><code className="text-primary fw-semibold" style={{ fontSize: 12 }}>{p.institute.id.substring(0, 8)}</code></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* ── Items Table ─────────────────────────────────────────── */}
              <div className="table-responsive border rounded">
                <table className="table m-0">
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th>Billing Period</th>
                      <th>Institute</th>
                      <th className="text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className="fw-semibold text-heading">{p.plan.name}</div>
                        <small className="text-body-secondary">Platform subscription</small>
                      </td>
                      <td className="text-nowrap text-body-secondary" style={{ fontSize: 13 }}>
                        {periodStart} – {periodEnd}
                      </td>
                      <td className="text-heading fw-medium">{p.institute.name}</td>
                      <td className="text-end fw-semibold text-heading">{fmt(Number(p.amount))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── Summary ─────────────────────────────────────────────── */}
              <div className="table-responsive">
                <table className="table m-0 table-borderless">
                  <tbody>
                    <tr>
                      <td className="align-top ps-0 pe-6 py-6">
                        <p className="fw-semibold text-heading mb-2">Note:</p>
                        <p className="text-body-secondary mb-0" style={{ maxWidth: 340, fontSize: 13 }}>
                          Thank you for subscribing to the <span className="fw-medium text-heading">{p.plan.name}</span> plan.
                          This is a computer-generated receipt and does not require a physical signature.
                        </p>
                      </td>
                      <td className="px-0 py-6 text-body-secondary" style={{ width: 160 }}>
                        <p className="mb-2 border-bottom pb-2">Subtotal:</p>
                        <p className="mb-0 fw-semibold text-heading">Total:</p>
                      </td>
                      <td className="text-end px-0 py-6" style={{ width: 130 }}>
                        <p className="fw-medium text-body-secondary mb-2 border-bottom pb-2">{fmt(Number(p.amount))}</p>
                        <p className="fw-bold text-heading mb-0">{fmt(Number(p.amount))}</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <hr className="mt-0 mb-5" />

              <div className="card-body p-0">
                <p className="text-body-secondary mb-0" style={{ fontSize: 12 }}>
                  <span className="fw-semibold text-heading">LedxElearn Platform</span>
                  {' · '}For support contact:{' '}
                  <a href="mailto:support@ledxelearn.com" className="text-primary">support@ledxelearn.com</a>
                </p>
              </div>

            </div>
          </div>

          {/* ── Action Sidebar ───────────────────────────────────────────── */}
          <div className="col-xl-3 col-md-4 col-12 invoice-sidebar">
            <div className="card">
              <div className="card-body d-flex flex-column gap-3">

                <button
                  className="btn btn-primary d-flex align-items-center justify-content-center gap-2 w-100"
                  onClick={() => window.print()}
                >
                  <i className="icon-base ti tabler-printer icon-xs" />
                  Print Receipt
                </button>

                <button
                  className={`btn d-flex align-items-center justify-content-center gap-2 w-100 ${sendSuccess ? 'btn-success' : 'btn-label-secondary'}`}
                  onClick={() => sendMutation.mutate()}
                  disabled={sendMutation.isLoading || !adminUser}
                >
                  {sendMutation.isLoading ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : (
                    <i className={`icon-base ti ${sendSuccess ? 'tabler-check' : 'tabler-send'} icon-xs`} />
                  )}
                  {sendSuccess ? 'Receipt Sent!' : 'Send Receipt'}
                </button>

                {sendMutation.isError && (
                  <small className="text-danger text-center">Failed to send. Try again.</small>
                )}
                {!adminUser && (
                  <small className="text-warning text-center">No admin email found for this institute.</small>
                )}

                <hr className="my-1" />

                <a
                  href="/super-admin/billing"
                  className="btn btn-label-secondary d-flex align-items-center justify-content-center gap-2 w-100"
                >
                  <i className="icon-base ti tabler-arrow-left icon-xs" />
                  Back to Billing
                </a>

              </div>
            </div>

            {/* Institute card */}
            <div className="card mt-4">
              <div className="card-body">
                <h6 className="fw-semibold mb-3">Institute</h6>
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="avatar">
                    <span className="avatar-initial rounded-circle bg-label-primary">
                      {p.institute.name[0]}
                    </span>
                  </div>
                  <div>
                    <div className="fw-semibold text-heading" style={{ fontSize: 13 }}>{p.institute.name}</div>
                    <small className="text-body-secondary">{p.institute.subdomain}</small>
                  </div>
                </div>
                <a
                  href={`/super-admin/institutes/${p.institute.id}`}
                  className="btn btn-sm btn-label-primary w-100"
                >
                  <i className="ti tabler-building me-1" />View Institute
                </a>
              </div>
            </div>

            {/* Plan card */}
            <div className="card mt-4">
              <div className="card-body">
                <h6 className="fw-semibold mb-3">Plan</h6>
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="avatar">
                    <span className="avatar-initial rounded bg-label-info">
                      <i className="icon-base ti tabler-package icon-lg" />
                    </span>
                  </div>
                  <div>
                    <div className="fw-semibold text-heading" style={{ fontSize: 13 }}>{p.plan.name}</div>
                    <small className="text-body-secondary">Subscription Plan</small>
                  </div>
                </div>
                <a href="/super-admin/plans" className="btn btn-sm btn-label-secondary w-100">
                  <i className="ti tabler-external-link me-1" />View Plans
                </a>
              </div>
            </div>

          </div>
        </div>
      )}
    </SuperAdminLayout>
  )
}
