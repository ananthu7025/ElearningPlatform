'use client'

import { useQuery } from 'react-query'
import Link from 'next/link'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'

export default function MyCoursesPage() {
  const { data, isLoading } = useQuery('myEnrollments', () =>
    api.get('/enrollments/me').then((r) => r.data)
  )

  const enrollments = data?.enrollments ?? []

  return (
    <StudentLayout title="My Learning">

      <div className="d-flex justify-content-between align-items-center mb-6">
        <p className="text-body-secondary mb-0">{enrollments.length} courses enrolled</p>
        <Link href="/courses/browse" className="btn btn-primary">
          <i className="ti tabler-search me-1" />Browse More Courses
        </Link>
      </div>

      {isLoading ? (
        <div className="row g-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="col-md-6 col-xl-4">
              <div className="card h-100 placeholder-glow">
                <div className="card-body">
                  <span className="placeholder col-9 d-block mb-2" style={{ height: 18 }} />
                  <span className="placeholder col-5 d-block mb-4" style={{ height: 14 }} />
                  <div className="d-flex justify-content-between mb-1">
                    <span className="placeholder col-3" style={{ height: 12 }} />
                    <span className="placeholder col-2" style={{ height: 12 }} />
                  </div>
                  <span className="placeholder col-12 d-block mb-4 rounded" style={{ height: 8 }} />
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="placeholder col-4" style={{ height: 14 }} />
                    <span className="placeholder col-3 rounded" style={{ height: 30 }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : enrollments.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-8">
            <img
              src="/img/illustrations/boy-with-rocket-light.png"
              alt="No courses enrolled"
              height={200}
              className="img-fluid mb-4"
            />
            <h5 className="mb-2">Ready to Launch Your Learning?</h5>
            <p className="text-body-secondary mb-4">
              You haven't enrolled in any courses yet. Explore our catalog and start your legal education journey.
            </p>
            <Link href="/courses/browse" className="btn btn-primary">
              <i className="ti tabler-search me-1" />Browse Courses
            </Link>
          </div>
        </div>
      ) : (
        <div className="row g-6">
          {enrollments.map((e: any) => (
            <div key={e.id} className="col-md-6 col-xl-4">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="mb-1">{e.course.title}</h6>
                  <small className="text-body-secondary d-block mb-3">
                    {e.course.tutor?.name ?? 'Unknown tutor'} · {e.course._count?.modules ?? 0} modules
                  </small>

                  <div className="mb-1 d-flex justify-content-between">
                    <small className="text-body-secondary">Progress</small>
                    <small className="fw-semibold">{e.completionPct}%</small>
                  </div>
                  <div className="progress mb-4" style={{ height: 8 }}>
                    <div
                      className={`progress-bar ${e.completionPct === 100 ? 'bg-success' : 'bg-primary'}`}
                      style={{ width: `${e.completionPct}%` }}
                    />
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-body-secondary">{e.completedLessons}/{e.totalLessons} lessons</small>
                    <Link
                      href={`/courses/${e.courseId}`}
                      className={`btn btn-sm ${e.completionPct === 100 ? 'btn-outline-success' : 'btn-outline-primary'}`}
                    >
                      {e.completionPct === 100 ? 'Review' : e.completionPct > 0 ? 'Continue' : 'Start'}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </StudentLayout>
  )
}
