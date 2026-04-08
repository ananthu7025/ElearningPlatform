'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import Script from 'next/script'
import Link from 'next/link'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  // 1. Fetch Course metadata
  const { data: courseData, isLoading } = useQuery(['courseDetail', id], () =>
    api.get(`/courses/${id}`).then((r) => r.data)
  )

  // 2. Enrollment mutation (Razorpay Flow)
  const enroll = useMutation(
    () => api.post('/payments/create-order', { courseId: id }),
    {
      onSuccess: (res) => {
        const data = res.data
        if (data.enrolled) {
          qc.invalidateQueries('myEnrollments')
          router.push(`/courses/${id}`)
          return
        }

        if (data.orderId) {
          const options = {
            key: data.keyId,
            amount: data.amount,
            currency: data.currency,
            name: 'LexEd Learning',
            description: `Enrollment: ${course?.title}`,
            order_id: data.orderId,
            handler: async (response: any) => {
              try {
                await api.post('/payments/verify', {
                  ...response,
                  courseId: data.courseId,
                  amount: data.finalAmount,
                })
                qc.invalidateQueries('myEnrollments')
                router.push(`/courses/${id}`)
              } catch (err) {
                alert('Payment verification failed. Please contact support.')
              }
            },
            theme: { color: '#7367f0' },
          }
          const rzp = new (window as any).Razorpay(options)
          rzp.open()
        }
      },
      onError: (err: any) => {
        const msg = err.response?.data?.error?.message || 'Failed to initiate checkout.'
        alert(msg)
      }
    }
  )

  const course = courseData?.course

  if (isLoading) return (
    <StudentLayout>
      <div className="d-flex justify-content-center py-10"><div className="spinner-border text-primary" /></div>
    </StudentLayout>
  )

  if (!course) return <StudentLayout><div className="alert alert-danger">Course not found</div></StudentLayout>

  const basePrice = 9999
  const currentPrice = Number(course.price)
  const discount = basePrice - currentPrice

  return (
    <StudentLayout>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
      <div className="mx-auto" style={{ maxWidth: 1000 }}>
        <nav aria-label="breadcrumb" className="mb-4">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link href={`/courses/${id}`}>Back to Course</Link></li>
            <li className="breadcrumb-item active">Checkout</li>
          </ol>
        </nav>

        <h3 className="fw-bold text-heading mb-6">Complete your enrollment</h3>

        <div className="row g-6">
          {/* Left: Order Details */}
          <div className="col-lg-7">
            <div className="card shadow-none border mb-6">
              <div className="card-body p-5">
                <h5 className="fw-bold text-heading mb-4 text-uppercase extra-small">Order Details</h5>
                
                <div className="d-flex gap-4">
                  <div className="rounded bg-label-primary d-flex align-items-center justify-content-center flex-shrink-0 mb-auto" style={{ width: 100, height: 70 }}>
                    <i className="ti tabler-book-2 fs-2 text-primary"></i>
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="fw-bold text-heading mb-1">{course.title}</h6>
                    <p className="extra-small text-body-secondary mb-3">By {course.tutor?.name || 'LexEd Instructor'} • Lifetime Access</p>
                    <div className="d-flex gap-2">
                       <span className="badge bg-label-primary extra-small">Certificate</span>
                       <span className="badge bg-label-info extra-small">24/7 Support</span>
                    </div>
                  </div>
                  <div className="text-end">
                    <span className="fw-bold text-heading">₹{currentPrice.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-top">
                  <div className="d-flex justify-content-between mb-2">
                     <span className="text-body-secondary small">List Price</span>
                     <span className="text-body-secondary text-decoration-line-through small">₹{basePrice.toLocaleString()}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-4">
                     <span className="text-body-secondary small">Course Discount</span>
                     <span className="text-success fw-medium small">- ₹{discount.toLocaleString()}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center pt-4 border-top">
                     <span className="h5 fw-bold text-heading mb-0">Total</span>
                     <span className="h4 fw-bold text-primary mb-0">₹{currentPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card shadow-none border">
              <div className="card-body p-4">
                <h6 className="fw-bold text-heading mb-3 small">Apply Coupon Code</h6>
                <div className="d-flex gap-2">
                   <input type="text" className="form-control" placeholder="Enter code" />
                   <button className="btn btn-outline-primary px-4">Apply</button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Payment Method & Action */}
          <div className="col-lg-5">
            <div className="card shadow-none border">
              <div className="card-body p-5 text-center">
                <div className="avatar avatar-lg rounded bg-label-primary mx-auto mb-4">
                  <i className="ti tabler-shield-check fs-2"></i>
                </div>
                <h5 className="fw-bold text-heading mb-2">Secure Checkout</h5>
                <p className="small text-body-secondary mb-6 px-4">
                  Safe and encrypted payment processing via Razorpay.
                </p>

                <div className="d-flex flex-column gap-3 mb-6">
                  {[
                    { label: 'UPI (GPay, PhonePe)', icon: 'tabler-device-mobile' },
                    { label: 'Cards (Visa, Master)', icon: 'tabler-credit-card' },
                    { label: 'Net Banking', icon: 'tabler-building-bank' },
                  ].map(p => (
                    <div key={p.label} className="d-flex align-items-center gap-3 p-3 rounded border text-start border-light op-75">
                       <i className={`ti ${p.icon} text-body-secondary`}></i>
                       <span className="small text-heading">{p.label}</span>
                       <i className="ti tabler-circle ms-auto text-body-tertiary"></i>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => enroll.mutate()}
                  className="btn btn-primary w-100 btn-lg py-3 fw-bold mb-4"
                  disabled={enroll.isLoading}
                >
                  {enroll.isLoading ? 'Processing...' : `Pay Now — ₹${currentPrice.toLocaleString()}`}
                </button>

                <div className="d-flex align-items-center justify-content-center gap-2 extra-small text-body-secondary">
                  <i className="ti tabler-lock"></i>
                   100% Secured Payment
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  )
}
