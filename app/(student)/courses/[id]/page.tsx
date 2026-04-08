'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from 'react-query'
import Link from 'next/link'
import { useState } from 'react'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'

const TYPE_ICON_MAP: Record<string, { icon: string; color: string; route: string }> = {
  VIDEO:      { icon: 'ti tabler-player-play', color: 'primary', route: 'lesson' },
  PDF:        { icon: 'ti tabler-file-text',  color: 'danger', route: 'pdf' },
  QUIZ:       { icon: 'ti tabler-clipboard-check', color: 'warning', route: 'quiz' },
  LIVE:       { icon: 'ti tabler-video', color: 'success', route: 'live' },
  ASSIGNMENT: { icon: 'ti tabler-edit', color: 'info', route: 'assignment' },
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})

  // 1. Fetch Course metadata
  const { data: courseData, isLoading: isCourseLoading } = useQuery(['courseDetail', id], () =>
    api.get(`/courses/${id}`).then((r) => r.data)
  )

  // 2. Fetch Curriculum
  const { data: curriculumData, isLoading: isCurriculumLoading } = useQuery(['studentCurriculum', id], () =>
    api.get(`/courses/${id}/curriculum`).then((r) => r.data)
  )

  // 3. Fetch Student Enrollment
  const { data: enrollData } = useQuery('myEnrollments', () =>
    api.get('/enrollments/me').then((r) => r.data)
  )

  // 4. Fetch Progress (if enrolled)
  const { data: progressData } = useQuery(['courseProgress', id], () =>
    api.get(`/enrollments/${id}/progress`).then((r) => r.data).catch(() => ({ progress: [] })),
    { retry: false }
  )

  const isEnrolled = (enrollData?.enrollments ?? []).some((e: any) => e.courseId === id)
  const course = courseData?.course
  const modules = curriculumData?.modules ?? []
  const progress = progressData?.progress ?? []
  const completedIds = new Set(progress.filter((p: any) => p.completedAt).map((p: any) => p.lessonId))

  const totalLessons = modules.reduce((s: number, m: any) => s + m.lessons.length, 0)
  const completedLessons = completedIds.size
  const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  if (isCourseLoading || isCurriculumLoading) {
    return (
      <StudentLayout>
        <div className="d-flex justify-content-center py-10"><div className="spinner-border text-primary" /></div>
      </StudentLayout>
    )
  }

  if (!course) return <StudentLayout><div className="alert alert-danger">Course not found</div></StudentLayout>

  // ─── Case 1: Enrolled (High-Fidelity Learning Dashboard) ────────────────────
  if (isEnrolled) {
    // Find the next lesson to continue
    let nextLessonPath = '#'
    for (const mod of modules) {
      const next = mod.lessons.find((l: any) => !completedIds.has(l.id))
      if (next) {
        const typeInfo = TYPE_ICON_MAP[next.type] || TYPE_ICON_MAP.VIDEO
        nextLessonPath = `/courses/${id}/${typeInfo.route}/${next.id}`
        break
      }
    }

    return (
      <StudentLayout>
        <div className="mx-auto" style={{ maxWidth: 960 }}>
          {/* Course header */}
          <div className="card shadow-sm border-0 mb-6">
            <div className="card-body p-5">
              <div className="d-flex flex-column flex-md-row align-items-md-center gap-4">
                <div className="flex-grow-1">
                  <span className="badge bg-label-primary small mb-3">{course.category}</span>
                  <h4 className="fw-bold text-heading mb-1">{course.title}</h4>
                  <p className="small text-body-secondary mb-0">By {course.tutor?.name || 'Top Instructor'} · Updated {new Date(course.updatedAt).toLocaleDateString()}</p>
                </div>
                <Link
                  href={nextLessonPath}
                  className="btn btn-primary d-flex align-items-center gap-2 px-5 py-3 flex-shrink-0 fw-bold shadow-sm"
                >
                  <i className="ti tabler-player-play-filled"></i>
                  {pct > 0 ? 'Continue Learning' : 'Start Learning'}
                </Link>
              </div>

              {/* Progress Bar Section */}
              <div className="mt-6 pt-6 border-top">
                <div className="d-flex align-items-center justify-content-between small mb-3">
                  <span className="text-heading fw-bold">Overall Course Progress</span>
                  <span className="text-primary fw-black fs-5">{pct}%</span>
                </div>
                <div className="progress rounded-pill shadow-none bg-label-secondary" style={{ height: 10 }}>
                  <div className="progress-bar bg-primary transition-all shadow-sm" role="progressbar" style={{ width: `${pct}%` }}></div>
                </div>
                <div className="d-flex align-items-center gap-3 mt-3 extra-small text-body-secondary">
                  <span><i className="ti tabler-circle-check text-success me-1"></i>{completedLessons} / {totalLessons} lessons completed</span>
                  <span>·</span>
                  <span className="text-success fw-medium">On track</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Selection UI */}
          <div className="d-inline-flex gap-1 bg-white rounded-pill border shadow-sm p-1 mb-6">
            {['Curriculum', 'Resources', 'Student Hub'].map((tab, i) => (
              <button
                key={tab}
                className={`btn btn-sm px-5 py-2 rounded-pill small fw-bold transition-all ${
                  i === 0 ? 'btn-primary shadow-sm' : 'btn-text-secondary border-0'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Modules Accordion */}
          <div className="d-flex flex-column gap-4">
            {modules.map((mod: any, mi: number) => {
              const isExpanded = expandedModules[mod.id] ?? true
              const modProgress = mod.lessons.length > 0 ? Math.round((mod.lessons.filter((l: any) => completedIds.has(l.id)).length / mod.lessons.length) * 100) : 0
              
              return (
                <div key={mod.id} className="card shadow-sm border-0 overflow-hidden">
                  {/* Module Header */}
                  <div 
                    className="card-header bg-label-secondary d-flex align-items-center justify-content-between py-4 px-5 cursor-pointer hover-bg-light transition-all"
                    onClick={() => setExpandedModules(prev => ({ ...prev, [mod.id]: !isExpanded }))}
                  >
                    <div className="d-flex align-items-center gap-4">
                      <i className={`ti tabler-chevron-down text-body-secondary transition-all ${!isExpanded ? 'rotate-n90' : ''}`}></i>
                      <div>
                        <p className="fw-black text-heading mb-1">{mod.title}</p>
                        <div className="d-flex align-items-center gap-3 mt-1">
                          <span className="extra-small text-body-secondary fw-medium">{mod.lessons.length} lessons · {Math.floor(mod.lessons.length * 15)} mins Est.</span>
                        </div>
                      </div>
                    </div>
                    {/* Module Progress Mini */}
                    <div className="d-none d-sm-flex align-items-center gap-3">
                      <div className="progress rounded-pill bg-white" style={{ width: 100, height: 6 }}>
                        <div className="progress-bar bg-success shadow-none" role="progressbar" style={{ width: `${modProgress}%` }}></div>
                      </div>
                      <span className="extra-small fw-bold text-body-secondary">{modProgress}%</span>
                    </div>
                  </div>

                  {/* Lessons List in Module */}
                  {isExpanded && (
                    <div className="card-body p-0 border-top">
                      {mod.lessons.map((lesson: any, li: number) => {
                        const isDone = completedIds.has(lesson.id)
                        const typeInfo = TYPE_ICON_MAP[lesson.type] || TYPE_ICON_MAP.VIDEO
                        const lessonUrl = `/courses/${id}/${typeInfo.route}/${lesson.id}`

                        return (
                          <Link
                            key={lesson.id}
                            href={lessonUrl}
                            className="d-flex align-items-center gap-4 px-6 py-4 border-bottom text-decoration-none hover-bg-light transition-all lesson-row"
                          >
                            <div className={`avatar avatar-sm rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${isDone ? 'bg-label-success' : `bg-label-${typeInfo.color}`}`}>
                              <i className={`${isDone ? 'ti tabler-check' : typeInfo.icon} small`}></i>
                            </div>
                            <div className="flex-grow-1">
                               <span className={`d-block small fw-bold ${isDone ? 'text-body-secondary text-decoration-line-through' : 'text-heading'}`}>
                                 {lesson.title}
                               </span>
                               <span className="extra-small text-body-secondary opacity-75">{lesson.type} • {lesson.durationSeconds ? `${Math.round(lesson.durationSeconds / 60)} min` : '5 min read'}</span>
                            </div>
                            {isDone ? (
                              <i className="ti tabler-circle-check-filled text-success fs-4"></i>
                            ) : (
                              <i className="ti tabler-chevron-right text-body-tertiary"></i>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <style jsx>{`
          .rotate-n90 { transform: rotate(-90deg); }
          .hover-bg-light:hover { background-color: rgba(0,0,0,0.02) !important; }
          .lesson-row:last-child { border-bottom: none !important; }
        `}</style>
      </StudentLayout>
    )
  }

  // ─── Case 2: Not Enrolled (Show Premium Landing Page) ──────────────────────
  return (
    <StudentLayout>
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        {/* Hero Section */}
        <div className="row g-6 mb-6">
          <div className="col-lg-8">
            <nav aria-label="breadcrumb" className="mb-3">
              <ol className="breadcrumb extra-small">
                <li className="breadcrumb-item"><Link href="/courses/browse">Course Catalog</Link></li>
                <li className="breadcrumb-item active">{course.category}</li>
              </ol>
            </nav>

            <span className="badge bg-label-primary mb-3">{course.category}</span>
            <h2 className="fw-bold text-heading mb-3">{course.title}</h2>
            <p className="fs-5 text-body-secondary mb-4 lh-base" style={{ maxWidth: '90%' }}>
              {course.description}
            </p>

            <div className="d-flex align-items-center gap-4 mb-4 flex-wrap">
              <div className="d-flex align-items-center gap-2">
                <div className="text-warning d-flex gap-1">
                  {[1, 2, 3, 4, 5].map(s => <i key={s} className="ti tabler-star-filled fs-6"></i>)}
                </div>
                <span className="fw-bold text-heading">4.8</span>
                <span className="text-body-secondary small">(1.5k ratings)</span>
              </div>
              <div className="text-body-secondary small">
                <i className="ti tabler-users me-1"></i> 2,481 students enrolled
              </div>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2 small text-body-secondary mb-6">
              <span>Created by <span className="text-primary fw-medium">{course.tutor?.name || 'Top Instructor'}</span></span>
              <span className="mx-1">•</span>
              <span>Last updated: {new Date(course.updatedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              <span className="mx-1">•</span>
              <span><i className="ti tabler-world me-1"></i> English + Hindi</span>
            </div>

            <div className="d-flex flex-wrap gap-4 pt-4 border-top">
              {[
                { label: `${totalLessons} Lessons`, icon: 'ti tabler-book-2' },
                { label: '8.5 Hours total', icon: 'ti tabler-clock' },
                { label: 'Full Lifetime Access', icon: 'ti tabler-infinity' },
                { label: 'Completion Certificate', icon: 'ti tabler-certificate' },
              ].map(s => (
                <div key={s.label} className="d-flex align-items-center gap-2 small text-heading">
                  <i className={`${s.icon} text-primary`}></i>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card shadow-sm position-sticky" style={{ top: 100 }}>
              <div className="rounded-top overflow-hidden position-relative" style={{ height: 200, background: '#eee' }}>
                <img 
                  src={course.thumbnailUrl || `/img/courses/${course.category.toLowerCase().replace(/\s+/g, '_')}.png`} 
                  className="w-100 h-100 object-fit-cover" 
                  alt={course.title}
                  onError={(e) => (e.target as any).src = '/img/courses/criminal_law.png'}
                />
                <div className="position-absolute top-50 start-50 translate-middle">
                   <div className="rounded-circle bg-white bg-opacity-25 p-3" style={{ backdropFilter: 'blur(4px)' }}>
                      <i className="ti tabler-player-play-filled text-white fs-1"></i>
                   </div>
                </div>
                <span className="position-absolute bottom-0 start-0 m-3 badge bg-dark opacity-75">Preview Course</span>
              </div>

              <div className="card-body p-5">
                <div className="d-flex align-items-center gap-3 mb-4">
                  <span className="fs-2 fw-bold text-heading">₹{Number(course.price).toLocaleString()}</span>
                  <span className="text-body-secondary text-decoration-line-through">₹9,999</span>
                  <span className="badge bg-label-success">40% OFF</span>
                </div>

                <Link href={`/courses/${id}/checkout`} className="btn btn-primary w-100 btn-lg py-3 mb-3 fw-bold">
                  Enroll Now
                </Link>
                <button className="btn btn-outline-secondary w-100 mb-4">Try Free Sample</button>
                
                <p className="text-center small text-body-secondary mb-4">30-Day Money-Back Guarantee</p>
                
                <div className="border-top pt-4">
                  <h6 className="fw-bold mb-3 small">This course includes:</h6>
                  <div className="d-flex flex-column gap-2">
                    {[
                      'Access on mobile and TV',
                      'Assignments & Quizzes',
                      'Downloadable resources',
                      'Certificate of completion',
                    ].map(item => (
                      <div key={item} className="d-flex align-items-center gap-2 extra-small text-heading">
                        <i className="ti tabler-check text-success"></i>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-6">
          <div className="col-lg-8">
            <div className="card shadow-none border mb-6">
              <div className="card-body">
                <h5 className="fw-bold text-heading mb-4">Course Curriculum</h5>
                <div className="d-flex flex-column gap-3">
                  {modules.map((mod: any, mi: number) => (
                    <div key={mod.id} className="border rounded overflow-hidden">
                      <div className="bg-body-tertiary px-4 py-3 d-flex justify-content-between align-items-center cursor-pointer">
                         <div className="d-flex align-items-center gap-2">
                           <i className="ti tabler-chevron-down text-body-secondary"></i>
                           <span className="fw-bold text-heading">{mod.title}</span>
                         </div>
                         <span className="small text-body-secondary">{mod.lessons.length} lessons • {Math.floor(mod.lessons.length * 15)} mins</span>
                      </div>
                      <div className="bg-white">
                         {mod.lessons.map((lesson: any) => {
                           const iconInfo = TYPE_ICON_MAP[lesson.type] || { icon: 'tabler-file', color: 'secondary' }
                           return (
                             <div key={lesson.id} className="px-4 py-3 border-top d-flex align-items-center gap-3">
                               <i className={`${iconInfo.icon} text-${iconInfo.color} small`}></i>
                               <span className="flex-grow-1 small text-heading">{lesson.title}</span>
                               {lesson.isFreePreview ? (
                                 <span className="text-primary small fw-medium text-decoration-underline cursor-pointer">Preview</span>
                               ) : (
                                 <i className="ti tabler-lock text-body-tertiary small"></i>
                               )}
                             </div>
                           )
                         })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card shadow-none border mb-6">
               <div className="card-body p-5">
                 <h5 className="fw-bold text-heading mb-4">Your Instructor</h5>
                 <div className="d-flex align-items-start gap-4">
                   <div className="avatar avatar-xl">
                      <span className="avatar-initial rounded-circle bg-label-primary fs-3 fw-bold">
                        {course.tutor?.name?.charAt(0) || 'I'}
                      </span>
                   </div>
                   <div className="flex-grow-1">
                      <h6 className="fw-bold text-primary mb-1">{course.tutor?.name || 'Expert Legal Tutor'}</h6>
                      <p className="small text-body-secondary mb-3">Senior Law Faculty | 10+ Years Experience</p>
                      <div className="d-flex gap-4 extra-small text-body-secondary mb-4">
                        <span><i className="ti tabler-star-filled text-warning me-1"></i>4.9 Course Rating</span>
                        <span><i className="ti tabler-users me-1"></i>3.5k Students</span>
                        <span><i className="ti tabler-book-2 me-1"></i>5 Courses</span>
                      </div>
                      <p className="small text-heading lh-base">
                        Master law with practical insights from industry experts. Our tutors bring years of courtroom and academic experience to help you excel in your legal career goals.
                      </p>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  )
}
