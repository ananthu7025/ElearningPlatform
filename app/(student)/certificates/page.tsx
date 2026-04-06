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
        <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" role="status" /></div>
      ) : certificates.length === 0 ? (
        <div className="text-center py-5 text-body-secondary">
          <i className="ti tabler-certificate mb-2" style={{ fontSize: 48 }} />
          <h6 className="mt-2">No certificates yet</h6>
          <p className="small">Complete a course to earn your certificate</p>
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
