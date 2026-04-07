'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'

interface Lesson {
  id: string
  title: string
  type: string
  orderIndex: number
  isFreePreview: boolean
  durationSeconds: number | null
}

interface Module {
  id: string
  title: string
  orderIndex: number
  lessons: Lesson[]
}

interface Course {
  id: string
  title: string
  description: string
  previewDescription: string | null
  thumbnailUrl: string | null
  price: number
  category: string
  totalDuration: number | null
  tutor: { name: string; avatarUrl: string | null }
  modules: Module[]
  _count: { enrollments: number }
}

interface Institute {
  primaryColor: string | null
  name: string
}

function fmtDuration(secs: number | null) {
  if (!secs) return null
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const LESSON_ICON: Record<string, string> = {
  VIDEO:      'tabler-player-play',
  PDF:        'tabler-file-text',
  QUIZ:       'tabler-help-circle',
  ASSIGNMENT: 'tabler-clipboard',
  LIVE:       'tabler-video',
}

export default function PublicCourseDetailPage() {
  const { slug, courseId } = useParams<{ slug: string; courseId: string }>()

  const [institute, setInstitute] = useState<Institute | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [openModule, setOpenModule] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      axios.get(`/api/public/${slug}`),
      axios.get(`/api/public/${slug}/courses/${courseId}`),
    ])
      .then(([instRes, courseRes]) => {
        setInstitute(instRes.data.institute)
        setCourse(courseRes.data.course)
        if (courseRes.data.course.modules[0]) {
          setOpenModule(courseRes.data.course.modules[0].id)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug, courseId])

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" />
      </div>
    )
  }

  if (notFound || !course) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center text-center" style={{ minHeight: '100vh' }}>
        <h3 className="mb-2">Course Not Found</h3>
        <p className="text-muted">This course is not available for public enrollment.</p>
        <Link href={`/${slug}/courses`} className="btn btn-primary mt-3">Browse Other Courses</Link>
      </div>
    )
  }

  const primary = institute?.primaryColor ?? '#7367F0'
  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0)
  const freePreviewCount = course.modules.reduce(
    (sum, m) => sum + m.lessons.filter((l) => l.isFreePreview).length, 0
  )

  return (
    <div>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`, padding: '40px 24px', color: '#fff' }}>
        <div className="container">
          <nav className="mb-3">
            <Link href={`/${slug}/courses`} className="text-white opacity-75" style={{ textDecoration: 'none' }}>
              <i className="tabler-arrow-left me-1" />Back to Courses
            </Link>
          </nav>
          <div className="row align-items-start">
            <div className="col-12 col-lg-8">
              <span className="badge bg-white text-dark mb-3">{course.category}</span>
              <h1 className="fw-bold mb-3" style={{ fontSize: '1.8rem' }}>{course.title}</h1>
              <p style={{ opacity: 0.9 }}>
                {course.previewDescription ?? course.description.slice(0, 200)}
              </p>
              <div className="d-flex flex-wrap gap-4 mt-4 small">
                <span><i className="tabler-user me-1" />{course.tutor.name}</span>
                <span><i className="tabler-users me-1" />{course._count.enrollments} enrolled</span>
                <span><i className="tabler-books me-1" />{totalLessons} lessons</span>
                {course.totalDuration && (
                  <span><i className="tabler-clock me-1" />{fmtDuration(course.totalDuration)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-5">
        <div className="row g-5">
          {/* Curriculum */}
          <div className="col-12 col-lg-7">
            <h4 className="fw-bold mb-4">Course Curriculum</h4>

            {freePreviewCount > 0 && (
              <div className="alert alert-info py-2 small mb-4">
                <i className="tabler-eye me-2" />
                {freePreviewCount} lesson{freePreviewCount > 1 ? 's' : ''} available as free preview
              </div>
            )}

            <div className="accordion" id="curriculumAccordion">
              {course.modules.map((mod) => (
                <div key={mod.id} className="accordion-item border mb-2 rounded overflow-hidden">
                  <h2 className="accordion-header">
                    <button
                      className={`accordion-button fw-semibold ${openModule !== mod.id ? 'collapsed' : ''}`}
                      type="button"
                      onClick={() => setOpenModule(openModule === mod.id ? null : mod.id)}
                      style={{ background: '#f8f7fa' }}
                    >
                      <span className="me-auto">{mod.title}</span>
                      <span className="badge bg-label-secondary ms-3 me-3">{mod.lessons.length} lessons</span>
                    </button>
                  </h2>
                  {openModule === mod.id && (
                    <div className="accordion-body p-0">
                      <ul className="list-group list-group-flush">
                        {mod.lessons.map((lesson) => (
                          <li key={lesson.id} className="list-group-item d-flex align-items-center gap-3 py-3">
                            <i className={`${LESSON_ICON[lesson.type] ?? 'tabler-file'} icon-base`} style={{ color: primary }} />
                            <span className="flex-grow-1">{lesson.title}</span>
                            {lesson.isFreePreview && (
                              <span className="badge bg-label-success small">Preview</span>
                            )}
                            {lesson.durationSeconds && (
                              <span className="text-muted small">{fmtDuration(lesson.durationSeconds)}</span>
                            )}
                            {!lesson.isFreePreview && (
                              <i className="tabler-lock text-muted" />
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Full description */}
            <div className="mt-5">
              <h4 className="fw-bold mb-3">About This Course</h4>
              <div className="text-muted" style={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
                {course.description}
              </div>
            </div>
          </div>

          {/* Enrollment card */}
          <div className="col-12 col-lg-5">
            <div className="card border-0 shadow-lg sticky-top" style={{ top: 20 }}>
              {course.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: '0.5rem 0.5rem 0 0' }}
                />
              )}
              <div className="card-body p-4">
                <div className="mb-4 text-center">
                  <span className="fw-bold" style={{ fontSize: '2rem', color: primary }}>
                    {Number(course.price) === 0 ? 'Free' : `₹${Number(course.price).toLocaleString('en-IN')}`}
                  </span>
                </div>

                <Link href={`/${slug}/register`} className="btn btn-primary d-grid w-100 mb-3 btn-lg">
                  Enroll Now
                </Link>
                <Link href={`/${slug}/login`} className="btn btn-outline-secondary d-grid w-100">
                  Already have an account? Sign In
                </Link>

                <hr className="my-4" />
                <ul className="list-unstyled mb-0">
                  <li className="d-flex align-items-center gap-2 mb-2 small">
                    <i className="tabler-books text-primary" />
                    <span>{totalLessons} lessons across {course.modules.length} modules</span>
                  </li>
                  <li className="d-flex align-items-center gap-2 mb-2 small">
                    <i className="tabler-certificate text-success" />
                    <span>Certificate on completion</span>
                  </li>
                  <li className="d-flex align-items-center gap-2 mb-2 small">
                    <i className="tabler-infinity text-info" />
                    <span>Lifetime access</span>
                  </li>
                  <li className="d-flex align-items-center gap-2 small">
                    <i className="tabler-device-mobile text-warning" />
                    <span>Access on any device</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center py-4 text-muted small border-top">
        Powered by <strong>LexEd</strong>
      </footer>
    </div>
  )
}
