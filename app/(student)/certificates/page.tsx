'use client'

import { useQuery } from 'react-query'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'

export default function CertificatesPage() {
  const { data, isLoading } = useQuery('certificates', () =>
    api.get('/certificates').then((r) => r.data)
  )

  const certificates = data?.certificates ?? []

  return (
    <StudentLayout title="My Certificates">

      {isLoading ? (
        <div className="row g-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="col-md-6 col-xl-4">
              <div className="card border placeholder-glow">
                <div className="card-body text-center py-5">
                  <span className="placeholder rounded-circle d-block mx-auto mb-4" style={{ width: 64, height: 64 }} />
                  <span className="placeholder col-8 d-block mx-auto mb-2" />
                  <span className="placeholder col-5 d-block mx-auto mb-4" />
                  <span className="placeholder col-6 d-block mx-auto rounded" style={{ height: 32 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-8">
            <img
              src="/img/illustrations/girl-app-academy.png"
              alt="No certificates"
              height={200}
              className="img-fluid mb-4"
            />
            <h5 className="mb-2">No Certificates Yet</h5>
            <p className="text-body-secondary mb-4">
              Complete any enrolled course to earn your certificate and showcase your achievement.
            </p>
            <a href="/courses" className="btn btn-primary">
              <i className="ti tabler-book me-1" />Go to My Courses
            </a>
          </div>
        </div>
      ) : (
        <div className="row g-6">
          {certificates.map((c: any) => (
            <div key={c.enrollmentId} className="col-md-6 col-xl-4">
              <div className="card border border-success">
                <div className="card-body text-center py-5">
                  <div className="avatar avatar-lg bg-label-success rounded mb-4">
                    <i className="ti tabler-certificate avatar-initial" style={{ fontSize: 32 }} />
                  </div>
                  <h6 className="mb-1">{c.course.title}</h6>
                  <small className="text-body-secondary d-block mb-4">
                    Instructor: {c.course.tutor?.name ?? 'LexEd'}
                    {c.completedAt && (
                      <span className="d-block">
                        Completed {new Date(c.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    )}
                  </small>
                  <a href={`/api/certificates/${c.enrollmentId}/download`} className="btn btn-outline-success btn-sm">
                    <i className="ti tabler-download me-1" />Download PDF
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </StudentLayout>
  )
}
