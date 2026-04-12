'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import Link from 'next/link'
import Script from 'next/script'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'

// Predefined categories matching the Law LMS theme
const CATEGORIES = [
  'Criminal Law',
  'Constitutional Law',
  'Civil Law',
  'Corporate Law',
  'Family Law',
  'Exam Prep',
  'Evidence Law',
]

export default function CourseBrowsePage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [hideCompleted, setHideCompleted] = useState(false)

  // Fetch published courses with search and category filters
  const { data, isLoading } = useQuery(
    ['browseCourses', search, category],
    () => {
      let url = `/courses?status=PUBLISHED&limit=50`
      if (search) url += `&search=${encodeURIComponent(search)}`
      if (category) url += `&category=${encodeURIComponent(category)}`
      return api.get(url).then((r) => r.data)
    },
    { keepPreviousData: true }
  )

  // Fetch current student enrollments
  const { data: enrollData } = useQuery('myEnrollments', () =>
    api.get('/enrollments/me').then((r) => r.data)
  )

  // Enrollment mutation
  const enroll = useMutation(
    (courseId: string) => api.post('/payments/create-order', { courseId }),
    {
      onSuccess: (res) => {
        const data = res.data
        if (data.enrolled) {
          qc.invalidateQueries('myEnrollments')
          alert('Successfully enrolled in the course!')
          return
        }

        // Paid course — Open Razorpay
        if (data.orderId) {
          const options = {
            key: data.keyId,
            amount: data.amount,
            currency: data.currency,
            name: 'LexEd Learning',
            description: 'Course Enrollment',
            order_id: data.orderId,
            handler: async (response: any) => {
              try {
                await api.post('/payments/verify', {
                  ...response,
                  courseId: data.courseId,
                  amount: data.finalAmount,
                })
                qc.invalidateQueries('myEnrollments')
                alert('Payment successful! You are now enrolled.')
              } catch (err) {
                alert('Payment verification failed. Please contact support.')
              }
            },
            prefill: {
              email: '', // could fill from user store
            },
            theme: { color: '#7367f0' },
          }
          const rzp = new (window as any).Razorpay(options)
          rzp.open()
        }
      },
      onError: (err: any) => {
        const msg = err.response?.data?.error?.message || 'Failed to initiate enrollment.'
        alert(msg)
      }
    }
  )

  // Reset Progress mutation
  const resetProgress = useMutation(
    (courseId: string) => api.post(`/enrollments/${courseId}/reset`, {}),
    {
      onSuccess: () => {
        qc.invalidateQueries('myEnrollments')
        qc.invalidateQueries('browseCourses')
      }
    }
  )

  const enrolledIds = new Set((enrollData?.enrollments ?? []).map((e: any) => e.courseId))
  const enrollmentsMap = new Map<string, any>((enrollData?.enrollments ?? []).map((e: any) => [e.courseId, e]))
  
  const courses = data?.courses ?? []

  // Client-side filtering for "Hide Completed"
  const filteredCourses = courses.filter((c: any) => {
    if (hideCompleted) {
      const enrollment = enrollmentsMap.get(c.id)
      if (enrollment && enrollment.completionPercentage === 100) return false
    }
    return true
  })

  const handleStartOver = (courseId: string) => {
    if (window.confirm('Are you sure you want to start over? This will reset all your progress for this course.')) {
      resetProgress.mutate(courseId)
    }
  }

  return (
    <StudentLayout>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="app-academy">
        
        {/* ── Hero Banner ── */}
        <div className="card p-0 mb-6">
          <div className="card-body d-flex flex-column flex-md-row justify-content-between p-0 pt-6">
            <div className="d-none d-md-flex align-items-end ps-6 pb-0" style={{ minWidth: 90 }}>
              <img src="/img/illustrations/bulb-light.png" alt="bulb" height={90} style={{ objectFit: 'contain' }} />
            </div>
            
            <div className="flex-grow-1 d-flex align-items-md-center flex-column text-md-center mb-6 py-6 px-6">
              <span className="card-title mb-4 lh-lg px-md-12 h4 text-heading">
                Your Law Learning Journey.<br />
                <span className="text-primary text-nowrap">All in one place.</span>
              </span>
              <p className="mb-4 text-body">
                Continue your enrolled courses, track progress and earn certificates<br className="d-none d-md-inline" />
                in criminal law, constitutional law, CLAT prep and more.
              </p>
              <div className="d-flex align-items-center w-100" style={{ maxWidth: 480 }}>
                <div className="input-group">
                  <span className="input-group-text"><i className="ti tabler-search" /></span>
                  <input
                    type="search"
                    placeholder="Find your course"
                    className="form-control"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="d-none d-md-flex align-items-end justify-content-end pe-0" style={{ minWidth: 120 }}>
              <img src="/img/illustrations/pencil-rocket.png" alt="rocket" height={188} style={{ objectFit: 'contain' }} />
            </div>
          </div>
        </div>

        {/* ── Filter Header ── */}
        <div className="card mb-6">
          <div className="card-header d-flex flex-wrap justify-content-between gap-4">
            <div className="card-title mb-0 me-1">
              <h5 className="mb-0">Course Catalog</h5>
              <p className="mb-0 text-body">Total {data?.total ?? 0} courses available</p>
            </div>
            <div className="d-flex justify-content-md-end align-items-center column-gap-6 flex-sm-row flex-column row-gap-4">
              <select
                className="form-select"
                style={{ maxWidth: 200 }}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              
              <div className="form-check form-switch my-2 ms-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="HideCompleted"
                  checked={hideCompleted}
                  onChange={(e) => setHideCompleted(e.target.checked)}
                />
                <label className="form-check-label text-nowrap mb-0" htmlFor="HideCompleted">Hide completed</label>
              </div>
            </div>
          </div>

          {/* ── Course Grid ── */}
          <div className="card-body">
            {isLoading ? (
              <div className="row g-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="col-sm-6 col-lg-4">
                    <div className="card h-100 border p-2">
                      <div className="placeholder-glow">
                        <div className="placeholder col-12 mb-3 rounded" style={{ height: 160 }}></div>
                        <div className="px-2">
                          <span className="placeholder col-4 mb-2"></span>
                          <span className="placeholder col-10 mb-4 d-block"></span>
                          <span className="placeholder col-12"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-6">
                <img
                  src="/img/illustrations/girl-doing-yoga-light.png"
                  alt="No results"
                  height={180}
                  className="img-fluid mb-4"
                />
                <h5 className="mb-2">No Courses Found</h5>
                <p className="text-body-secondary mb-4">
                  We couldn't find any courses matching your search. Try a different keyword or category.
                </p>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => { setSearch(''); setCategory('') }}
                >
                  <i className="ti tabler-refresh me-1" />Clear Filters
                </button>
              </div>
            ) : (
              <div className="row gy-6 mb-6">
                {filteredCourses.map((c: any) => {
                  const enrollment = enrollmentsMap.get(c.id)
                  const isEnrolled = !!enrollment
                  const progress = enrollment?.completionPercentage ?? 0

                  return (
                    <div key={c.id} className="col-sm-6 col-lg-4">
                      <div className="card p-2 h-100 shadow-none border">
                        {/* Thumbnail */}
                        <div className="rounded-2 text-center mb-4 overflow-hidden" style={{ height: 160 }}>
                          <Link href={`/courses/${c.id}`}>
                              <img
                                src={c.thumbnailUrl || (['Criminal Law', 'Constitutional Law', 'Corporate Law', 'Exam Prep'].includes(c.category) 
                                  ? `/img/courses/${c.category.toLowerCase().replace(/\s+/g, '_')}.png` 
                                  : '/img/courses/criminal_law.png')}
                                alt={c.title}
                                className="w-100 h-100"
                                style={{ objectFit: 'cover' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/img/courses/criminal_law.png'
                                }}
                              />
                          </Link>
                        </div>

                        <div className="card-body p-4 pt-2">
                          <div className="d-flex justify-content-between align-items-center mb-4">
                            <span className="badge bg-label-primary">{c.category}</span>
                            <p className="d-flex align-items-center justify-content-center fw-medium gap-1 mb-0">
                              4.8
                              <span className="text-warning"><i className="ti tabler-star-filled icon-lg me-1 mb-1"></i></span>
                              <span className="fw-normal text-body-secondary small">(1.2k)</span>
                            </p>
                          </div>

                          <Link href={`/courses/${c.id}`} className="h5 text-heading d-block mb-2">{c.title}</Link>
                          <p className="text-body-secondary small mb-4">
                            {c.description ? (c.description.length > 80 ? c.description.slice(0, 80) + '...' : c.description) : 'No description available'}
                          </p>

                          {isEnrolled && progress === 100 ? (
                            <p className="d-flex align-items-center text-success mb-1 small">
                              <i className="ti tabler-check me-1"></i>Completed
                            </p>
                          ) : (
                            <p className="d-flex align-items-center mb-1 text-body-secondary small">
                              <i className="ti tabler-clock me-1"></i>{c.totalDuration ? `${c.totalDuration} hours` : 'Ongoing'}
                            </p>
                          )}

                          <div className="progress mb-4" style={{ height: 8 }}>
                            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                          </div>

                          <div className="d-flex flex-column flex-md-row gap-4">
                            {isEnrolled ? (
                              <>
                                <button
                                  onClick={() => handleStartOver(c.id)}
                                  className="w-100 btn btn-label-secondary"
                                  disabled={resetProgress.isLoading}
                                >
                                  <i className="ti tabler-rotate-clockwise-2 me-1"></i>Start Over
                                </button>
                                <Link href={`/courses/${c.id}`} className="w-100 btn btn-label-primary">
                                  Continue <i className="ti tabler-chevron-right ms-1"></i>
                                </Link>
                              </>
                            ) : (
                              <Link
                                href={`/courses/${c.id}`}
                                className="btn btn-primary w-100"
                              >
                                {c.price == 0 ? 'Enroll Free' : `Buy Now - ₹${Number(c.price).toLocaleString()}`}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Promo Sections ── */}
        <div className="row gy-6 mb-6">
          <div className="col-lg-6">
            <div className="card shadow-none bg-label-primary h-100">
              <div className="card-body d-flex justify-content-between flex-wrap-reverse align-items-center">
                <div className="mb-0 d-flex flex-column justify-content-between text-center text-sm-start" style={{ maxWidth: '60%' }}>
                  <div className="card-title">
                    <h5 className="text-primary mb-2">Earn a Certificate</h5>
                    <p className="text-body small">Get professional certificates in law to boost your career and credibility.</p>
                  </div>
                  <button className="btn btn-sm btn-primary align-self-start">View Programs</button>
                </div>
                <img src="/img/illustrations/boy-app-academy.png" alt="boy" style={{ maxHeight: 120 }} />
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card shadow-none bg-label-danger h-100">
              <div className="card-body d-flex justify-content-between flex-wrap-reverse align-items-center">
                <div className="mb-0 d-flex flex-column justify-content-between text-center text-sm-start" style={{ maxWidth: '60%' }}>
                  <div className="card-title">
                    <h5 className="text-danger mb-2">Best Rated Courses</h5>
                    <p className="text-body small">Enroll in the most popular and top-rated law courses on our platform.</p>
                  </div>
                  <button className="btn btn-sm btn-danger align-self-start">View Courses</button>
                </div>
                <img src="/img/illustrations/girl-app-academy.png" alt="girl" style={{ maxHeight: 120 }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Free Lessons Promo ── */}
        <div className="card">
          <div className="card-body row gy-6">
            <div className="col-sm-12 col-lg-4 text-center py-6 px-4 border-end">
              <span className="badge bg-label-primary rounded mb-4 d-inline-flex align-items-center justify-content-center" style={{ height: 52, width: 52 }}>
                <i className="ti tabler-gift icon-36px" />
              </span>
              <h4 className="card-title mb-4">Free Trial Lessons</h4>
              <p className="card-text text-body-secondary small">
                We offer free preview lessons from top law tutors. Start learning today without any commitment.
              </p>
              <button className="btn btn-primary">Get Premium Access</button>
            </div>
            
            <div className="col-sm-12 col-lg-8">
              <div className="row g-6">
                <div className="col-md-6 text-center">
                  <div className="rounded overflow-hidden mb-3" style={{ height: 120 }}>
                    <img src="/img/courses/criminal_law.png" className="w-100 h-100" style={{ objectFit: 'cover' }} alt="promo" />
                  </div>
                  <h6 className="mb-2">Criminal Law — Free Intro</h6>
                  <p className="text-body-secondary small">Watch the first 3 lessons of Criminal Law Fundamentals for free.</p>
                </div>
                <div className="col-md-6 text-center">
                  <div className="rounded overflow-hidden mb-3" style={{ height: 120 }}>
                    <img src="/img/courses/corporate_law.png" className="w-100 h-100" style={{ objectFit: 'cover' }} alt="promo" />
                  </div>
                  <h6 className="mb-2">Corporate Law Insider</h6>
                  <p className="text-body-secondary small">A free strategy session covering corporate legal practice.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </StudentLayout>
  )
}
