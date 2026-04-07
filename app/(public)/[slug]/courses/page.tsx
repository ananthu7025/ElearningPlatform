'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'

interface Course {
  id: string
  title: string
  previewDescription: string | null
  description: string
  thumbnailUrl: string | null
  price: number
  category: string
  tutor: { name: string; avatarUrl: string | null }
  _count: { enrollments: number; modules: number }
}

interface Institute {
  name: string
  logoUrl: string | null
  primaryColor: string | null
}

export default function PublicCoursesPage() {
  const { slug } = useParams<{ slug: string }>()

  const [institute, setInstitute] = useState<Institute | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Fetch institute info
  useEffect(() => {
    axios
      .get(`/api/public/${slug}`)
      .then((r) => setInstitute(r.data.institute))
      .catch(() => setNotFound(true))
  }, [slug])

  // Fetch courses (re-runs on filter change)
  useEffect(() => {
    if (notFound) return
    setLoading(true)
    const params = new URLSearchParams()
    if (search)   params.set('search',   search)
    if (category) params.set('category', category)
    axios
      .get(`/api/public/${slug}/courses?${params}`)
      .then((r) => {
        setCourses(r.data.courses)
        setCategories(r.data.categories)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug, search, category, notFound])

  if (notFound) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center text-center" style={{ minHeight: '100vh' }}>
        <h3 className="mb-2">Institute Not Found</h3>
        <p className="text-muted">This page is not available.</p>
      </div>
    )
  }

  const primary = institute?.primaryColor ?? '#7367F0'

  return (
    <div>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`, padding: '40px 24px 60px', color: '#fff' }}>
        <div className="container">
          <div className="d-flex align-items-center gap-3 mb-4">
            <Link href={`/${slug}`} className="text-white opacity-75" style={{ textDecoration: 'none' }}>
              <i className="tabler-arrow-left me-1" />
              {institute?.name ?? slug}
            </Link>
          </div>
          <h2 className="fw-bold mb-1">All Courses</h2>
          <p style={{ opacity: 0.85 }}>{courses.length} courses available for enrollment</p>
        </div>
      </div>

      <div className="container" style={{ marginTop: -30 }}>
        {/* Filter bar */}
        <div className="card border-0 shadow-sm mb-5 p-3">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <div className="input-group">
                <span className="input-group-text"><i className="tabler-search" /></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search courses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-md-4">
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.filter(Boolean).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {category && (
              <div className="col-12 col-md-2">
                <button className="btn btn-outline-secondary w-100" onClick={() => setCategory('')}>
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Course grid */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="tabler-books mb-3" style={{ fontSize: '3rem', display: 'block' }} />
            <p>No courses found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="row g-4 mb-5">
            {courses.map((course) => (
              <div key={course.id} className="col-12 col-sm-6 col-lg-4">
                <div className="card h-100 border-0 shadow-sm overflow-hidden">
                  {course.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      style={{ width: '100%', height: 180, objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ height: 180, background: `${primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="tabler-book" style={{ fontSize: '3rem', color: primary }} />
                    </div>
                  )}
                  <div className="card-body d-flex flex-column">
                    <span className="badge bg-label-primary mb-2" style={{ alignSelf: 'flex-start' }}>
                      {course.category}
                    </span>
                    <h6 className="fw-bold mb-2">{course.title}</h6>
                    <p className="text-muted small mb-3" style={{ flexGrow: 1 }}>
                      {course.previewDescription ?? course.description.slice(0, 100) + '…'}
                    </p>
                    <div className="d-flex align-items-center gap-2 mb-3 text-muted small">
                      <i className="tabler-user" />
                      <span>{course.tutor.name}</span>
                      <span className="ms-auto">
                        <i className="tabler-users me-1" />
                        {course._count.enrollments} enrolled
                      </span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="fw-bold fs-5" style={{ color: primary }}>
                        {Number(course.price) === 0 ? 'Free' : `₹${Number(course.price).toLocaleString('en-IN')}`}
                      </span>
                      <Link
                        href={`/${slug}/courses/${course.id}`}
                        className="btn btn-primary btn-sm"
                      >
                        View Course
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="text-center py-4 text-muted small border-top">
        Powered by <strong>LexEd</strong>
      </footer>
    </div>
  )
}
