'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'

export default function CourseBrowsePage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery(
    ['browseCourses', search],
    () => api.get(`/courses?status=PUBLISHED&limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`).then((r) => r.data),
    { keepPreviousData: true }
  )

  const { data: enrollData } = useQuery('myEnrollments', () =>
    api.get('/enrollments/me').then((r) => r.data)
  )

  const enroll = useMutation(
    (courseId: string) => api.post('/payments/create-order', { courseId }),
    { onSuccess: () => qc.invalidateQueries('myEnrollments') }
  )

  const enrolledIds = new Set((enrollData?.enrollments ?? []).map((e: any) => e.courseId))
  const courses = data?.courses ?? []
  const filtered = search
    ? courses.filter((c: any) => c.title.toLowerCase().includes(search.toLowerCase()))
    : courses

  return (
    <StudentLayout title="Course Catalog">

      <div className="mb-6">
        <div className="input-group" style={{ maxWidth: 400 }}>
          <span className="input-group-text"><i className="ti tabler-search" /></span>
          <input
            type="text"
            className="form-control"
            placeholder="Search courses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="row g-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="col-md-6 col-xl-4">
              <div className="card"><div className="card-body placeholder-glow"><span className="placeholder col-8 mb-2 d-block" /><span className="placeholder col-5" /></div></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-5 text-body-secondary">No courses found</div>
      ) : (
        <div className="row g-6">
          {filtered.map((c: any) => {
            const isEnrolled = enrolledIds.has(c.id)
            return (
              <div key={c.id} className="col-md-6 col-xl-4">
                <div className="card h-100">
                  <div className="card-body">
                    <h6 className="mb-1">{c.title}</h6>
                    <small className="text-body-secondary d-block mb-1">{c.tutor?.name ?? 'Unknown tutor'}</small>
                    <small className="text-body-secondary d-block mb-3">{c._count?.modules ?? 0} modules · {c._count?.enrollments ?? 0} students</small>
                    {c.description && (
                      <p className="text-body-secondary small mb-4">{c.description.slice(0, 80)}{c.description.length > 80 ? '…' : ''}</p>
                    )}
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-bold">
                        {c.price === 0 ? (
                          <span className="badge bg-label-success rounded-pill">Free</span>
                        ) : `₹${Number(c.price).toLocaleString('en-IN')}`}
                      </span>
                      {isEnrolled ? (
                        <a href={`/courses/${c.id}`} className="btn btn-sm btn-outline-success">Continue</a>
                      ) : (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => enroll.mutate(c.id)}
                          disabled={enroll.isLoading}
                        >
                          {c.price === 0 ? 'Enroll Free' : 'Buy Now'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </StudentLayout>
  )
}
