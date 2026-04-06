'use client'

import { useQuery } from 'react-query'
import Link from 'next/link'
import TutorLayout from '@/components/layouts/TutorLayout'
import api from '@/lib/api'

const STATUS_BADGE: Record<string, string> = {
  DRAFT:     'bg-label-secondary',
  PUBLISHED: 'bg-label-success',
  ARCHIVED:  'bg-label-danger',
}

export default function TutorCoursesPage() {
  const { data, isLoading } = useQuery('tutorCourses', () =>
    api.get('/courses?limit=50').then((r) => r.data)
  )

  const courses = data?.courses ?? []

  return (
    <TutorLayout title="My Courses" breadcrumb="Home / My Courses">

      {isLoading ? (
        <div className="row g-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="col-md-6 col-xl-4">
              <div className="card"><div className="card-body placeholder-glow"><span className="placeholder col-8 mb-2 d-block" /><span className="placeholder col-5" /></div></div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-5 text-body-secondary">
          <i className="ti tabler-book mb-2" style={{ fontSize: 40 }} />
          <p>No courses assigned yet</p>
        </div>
      ) : (
        <div className="row g-6">
          {courses.map((c: any) => (
            <div key={c.id} className="col-md-6 col-xl-4">
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex align-items-start justify-content-between mb-3">
                    <span className={`badge ${STATUS_BADGE[c.status] ?? 'bg-label-secondary'} rounded-pill`}>{c.status}</span>
                    <small className="text-body-secondary">{c._count?.modules ?? 0} modules</small>
                  </div>
                  <h6 className="mb-1">{c.title}</h6>
                  <p className="text-body-secondary small mb-4">{c.description ?? 'No description'}</p>
                  <div className="d-flex align-items-center justify-content-between">
                    <small className="text-body-secondary">
                      <strong className="text-heading">{c._count?.enrollments ?? 0}</strong> students
                    </small>
                    <Link href={`/admin/courses/${c.id}`} className="btn btn-sm btn-outline-primary">
                      <i className="ti tabler-edit me-1" />Manage
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </TutorLayout>
  )
}
