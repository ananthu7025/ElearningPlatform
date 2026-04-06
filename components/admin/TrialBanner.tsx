'use client'

import { useQuery, useQueryClient } from 'react-query'
import { useState } from 'react'
import api from '@/lib/api'

interface SubscriptionStatus {
  status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED'
  trialEndsAt: string | null
  daysRemaining: number | null
  trialTotal: number | null
  plan: {
    id: string
    name: string
    priceMonthly: number
    maxStudents: number
    maxCourses: number
  }
}

declare global {
  interface Window {
    Razorpay: any
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window.Razorpay !== 'undefined') { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function TrialBanner() {
  const qc = useQueryClient()
  const [paying, setPaying] = useState(false)
  const [error, setError]   = useState('')

  const { data, isLoading } = useQuery<SubscriptionStatus>(
    'subscriptionStatus',
    () => api.get('/admin/subscription/status').then((r) => r.data),
    { staleTime: 60_000 }
  )

  if (isLoading || !data) return null
  if (data.status !== 'TRIAL') return null

  const { daysRemaining, trialTotal, plan } = data
  const progress = trialTotal && daysRemaining !== null
    ? Math.round(((trialTotal - daysRemaining) / trialTotal) * 100)
    : 0

  const isUrgent  = (daysRemaining ?? 0) <= 3
  const isExpired = (daysRemaining ?? 0) === 0

  const barColor = isExpired ? 'bg-danger' : isUrgent ? 'bg-warning' : 'bg-info'
  const bannerBg = isExpired ? 'bg-label-danger' : isUrgent ? 'bg-label-warning' : 'bg-label-info'

  async function handlePayNow() {
    setError('')
    setPaying(true)
    try {
      const loaded = await loadRazorpayScript()
      if (!loaded) { setError('Could not load payment gateway. Please try again.'); setPaying(false); return }

      const { data: order } = await api.post('/admin/subscription/create-order')

      const options = {
        key:         order.keyId,
        amount:      order.amount,
        currency:    order.currency,
        name:        'LedX Learn',
        description: `${order.planName} Plan — Monthly Subscription`,
        order_id:    order.orderId,
        prefill:     {},
        theme:       { color: '#7367F0' },
        handler: async (response: any) => {
          try {
            await api.post('/admin/subscription/verify', {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            })
            qc.invalidateQueries('subscriptionStatus')
          } catch {
            setError('Payment verification failed. Please contact support.')
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', () => {
        setError('Payment failed. Please try again.')
        setPaying(false)
      })
      rzp.open()
    } catch {
      setError('Could not initiate payment. Please try again.')
      setPaying(false)
    }
  }

  return (
    <div className={`alert ${bannerBg} border-0 rounded-0 mb-0 py-2 px-4`} role="alert">
      <div className="d-flex align-items-center gap-3 flex-wrap">

        {/* Icon */}
        <span className="d-flex align-items-center gap-2 flex-shrink-0">
          <i className={`ti ${isExpired ? 'tabler-alert-circle' : 'tabler-clock'} fs-5`} />
          <strong className="text-nowrap">
            {isExpired
              ? 'Trial Expired'
              : `Trial: ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`}
          </strong>
        </span>

        {/* Progress bar */}
        {trialTotal !== null && (
          <div className="flex-grow-1" style={{ minWidth: 120, maxWidth: 200 }}>
            <div className="progress" style={{ height: 6 }}>
              <div
                className={`progress-bar ${barColor}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Plan info */}
        <span className="text-body-secondary text-nowrap small">
          {plan.name} Plan · ₹{Number(plan.priceMonthly).toLocaleString('en-IN')}/mo
        </span>

        {/* Error */}
        {error && (
          <span className="text-danger small">{error}</span>
        )}

        {/* CTA */}
        <button
          className="btn btn-sm btn-primary ms-auto text-nowrap"
          onClick={handlePayNow}
          disabled={paying}
        >
          {paying
            ? <><span className="spinner-border spinner-border-sm me-1" />Processing…</>
            : <><i className="ti tabler-credit-card me-1" />Pay Now · ₹{Number(plan.priceMonthly).toLocaleString('en-IN')}</>
          }
        </button>

      </div>
    </div>
  )
}
