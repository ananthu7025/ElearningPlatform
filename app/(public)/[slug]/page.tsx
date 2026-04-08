'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'

interface Institute {
  id: string
  name: string
  logoUrl: string | null
  primaryColor: string | null
  publicSlug: string | null
  subdomain: string
  _count: { courses: number; users: number }
}

export default function PublicInstitutePage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [institute, setInstitute] = useState<Institute | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    axios
      .get(`/api/public/${slug}`)
      .then((r) => setInstitute(r.data.institute))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" />
      </div>
    )
  }

  if (notFound || !institute) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center text-center" style={{ minHeight: '100vh' }}>
        <i className="tabler-alert-circle icon-base text-danger mb-3" style={{ fontSize: '3rem' }} />
        <h3 className="mb-2">Institute Not Found</h3>
        <p className="text-muted">This page is not available or the institute has not enabled public enrollment.</p>
      </div>
    )
  }

  const primary = institute.primaryColor ?? '#7367F0'

  return (
    <div>
      {/* Hero */}
      <div
        style={{
          background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`,
          padding: '60px 24px',
          color: '#fff',
          textAlign: 'center',
        }}
      >
        {institute.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={institute.logoUrl}
            alt={institute.name}
            style={{ height: 72, objectFit: 'contain', marginBottom: 20, borderRadius: 8 }}
          />
        )}
        <h1 className="fw-bold mb-2" style={{ fontSize: '2.2rem' }}>{institute.name}</h1>
        <p className="mb-4" style={{ opacity: 0.85, fontSize: '1.1rem' }}>
          {institute._count.courses} courses &nbsp;&bull;&nbsp; {institute._count.users} students enrolled
        </p>
        <div className="d-flex justify-content-center gap-3 flex-wrap">
          <Link href={`/${slug}/courses`} className="btn btn-light btn-lg px-5">
            Browse Courses
          </Link>
          <Link href={`/${slug}/register`} className="btn btn-outline-light btn-lg px-5">
            Create Account
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="container py-5">
        <div className="row g-4 mb-5 text-center">
          <div className="col-12 col-sm-4">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body py-4">
                <div className="avatar avatar-lg mx-auto mb-3" style={{ background: `${primary}1a`, borderRadius: '50%', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="tabler-books icon-base" style={{ color: primary, fontSize: '1.5rem' }} />
                </div>
                <h3 className="fw-bold mb-1">{institute._count.courses}</h3>
                <p className="text-muted mb-0">Courses Available</p>
              </div>
            </div>
          </div>
          <div className="col-12 col-sm-4">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body py-4">
                <div className="avatar avatar-lg mx-auto mb-3" style={{ background: '#28a74520', borderRadius: '50%', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="tabler-users icon-base" style={{ color: '#28a745', fontSize: '1.5rem' }} />
                </div>
                <h3 className="fw-bold mb-1">{institute._count.users}</h3>
                <p className="text-muted mb-0">Students Enrolled</p>
              </div>
            </div>
          </div>
          <div className="col-12 col-sm-4">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body py-4">
                <div className="avatar avatar-lg mx-auto mb-3" style={{ background: '#ff9f4320', borderRadius: '50%', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="tabler-certificate icon-base" style={{ color: '#ff9f43', fontSize: '1.5rem' }} />
                </div>
                <h3 className="fw-bold mb-1">✓</h3>
                <p className="text-muted mb-0">Certificate on Completion</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-5">
          <h4 className="fw-bold mb-3">Ready to start learning?</h4>
          <p className="text-muted mb-4">Browse our courses and enroll today. No prior experience required.</p>
          <Link href={`/${slug}/courses`} className="btn btn-primary btn-lg px-6 me-3">
            View All Courses
          </Link>
          <Link href={`/${slug}/register`} className="btn btn-outline-primary btn-lg px-6">
            Sign Up Free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-muted small border-top">
        Powered by <strong>LexEd</strong>
      </footer>
    </div>
  )
}
