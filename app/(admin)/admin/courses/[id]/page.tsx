'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import AdminLayout from '@/components/layouts/AdminLayout'
import api from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Tutor  { id: string; name: string; email?: string }
interface Course {
  id: string; title: string; description: string; thumbnailUrl?: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'; price: number; category: string
  tutor: Tutor; _count: { enrollments: number; modules: number }
}
interface Stats  { enrolled: number; avgCompletion: number }
interface Lesson {
  id: string; title: string; type: string; orderIndex: number
  durationSeconds?: number; isFreePreview: boolean
}
interface Module { id: string; title: string; orderIndex: number; lessons: Lesson[] }
interface Enrollment {
  id: string
  student: { id: string; name: string; email: string }
  completionPercentage: number
  enrolledAt: string
  lastAccessedAt?: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const LESSON_ICON: Record<string, string> = {
  VIDEO:      'tabler-video',
  PDF:        'tabler-file-text',
  QUIZ:       'tabler-file-analytics',
  ASSIGNMENT: 'tabler-file-report',
  LIVE:       'tabler-broadcast',
}
const LESSON_COLOR: Record<string, string> = {
  VIDEO: 'primary', PDF: 'info', QUIZ: 'warning', ASSIGNMENT: 'danger', LIVE: 'success',
}

const settingsSchema = z.object({
  price:   z.coerce.number().nonnegative(),
  tutorId: z.string().min(1, 'Select a tutor'),
})
type SettingsForm = z.infer<typeof settingsSchema>

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc     = useQueryClient()
  const [tab, setTab]     = useState<'students' | 'analytics' | 'settings'>('students')
  const [openMod, setOpenMod] = useState<string>('')

  // ── Data fetching ────────────────────────────────────────────────
  const { data: courseData, isLoading: courseLoading } = useQuery(
    ['course', id],
    () => api.get(`/courses/${id}`).then((r) => r.data),
  )
  const { data: curriculumData } = useQuery(
    ['curriculum', id],
    () => api.get(`/courses/${id}/curriculum`).then((r) => r.data),
    { onSuccess: (d) => { if (d.modules?.[0]) setOpenMod(d.modules[0].id) } },
  )
  const { data: studentsData, isLoading: studentsLoading } = useQuery(
    ['course-students', id],
    () => api.get(`/courses/${id}/students?limit=20`).then((r) => r.data),
    { enabled: tab === 'students' },
  )
  const { data: tutorsData } = useQuery(
    'tutors-list',
    () => api.get('/admin/tutors?limit=50').then((r) => r.data),
    { enabled: tab === 'settings' },
  )

  const course: Course | undefined    = courseData?.course
  const stats:  Stats | undefined     = courseData?.stats
  const modules: Module[]             = curriculumData?.modules ?? []
  const enrollments: Enrollment[]     = studentsData?.enrollments ?? []
  const tutors: Tutor[]               = tutorsData?.tutors ?? []

  // ── Mutations ────────────────────────────────────────────────────
  const togglePublish = useMutation(
    () => api.post(`/courses/${id}/publish`),
    { onSuccess: () => qc.invalidateQueries(['course', id]) },
  )
  const saveSettings = useMutation(
    (d: SettingsForm) => api.put(`/courses/${id}`, d),
    { onSuccess: () => qc.invalidateQueries(['course', id]) },
  )

  // ── Settings form ────────────────────────────────────────────────
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    values: course ? { price: Number(course.price), tutorId: course.tutor?.id ?? '' } : undefined,
  })

  if (courseLoading) {
    return (
      <AdminLayout title="Course" breadcrumb="Home / Courses / …">
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      </AdminLayout>
    )
  }

  if (!course) {
    return (
      <AdminLayout title="Course" breadcrumb="Home / Courses">
        <div className="alert alert-danger">Course not found.</div>
      </AdminLayout>
    )
  }

  const totalLessons = modules.reduce((a, m) => a + m.lessons.length, 0)

  return (
    <AdminLayout title={course.title} breadcrumb={`Home / Courses / ${course.title}`}>
      <div className="row g-6">

        {/* ── Main (col-lg-8) ───────────────────────────────────── */}
        <div className="col-lg-8">

          {/* Course header card */}
          <div className="card mb-6">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                <div>
                  <h5 className="mb-1 text-heading">{course.title}</h5>
                  <p className="mb-0 text-body">
                    Taught by <span className="fw-medium text-heading">{course.tutor?.name ?? 'Admin Direct'}</span>
                  </p>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <span className="badge bg-label-primary">{course.category}</span>
                  <span className={`badge ${course.status === 'PUBLISHED' ? 'bg-label-success' : 'bg-label-secondary'}`}>
                    {course.status}
                  </span>
                  <button
                    className={`btn btn-sm ${course.status === 'PUBLISHED' ? 'btn-outline-warning' : 'btn-success'}`}
                    onClick={() => togglePublish.mutate()}
                    disabled={togglePublish.isLoading}
                  >
                    <i className={`ti ${course.status === 'PUBLISHED' ? 'tabler-eye-off' : 'tabler-eye'} me-1`} />
                    {course.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </div>

              {/* Thumbnail banner */}
              <div className="card shadow-none border mb-0">
                <div className="p-2">
                  <div className="rounded-2 overflow-hidden position-relative" style={{ height: 280 }}>
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="d-flex align-items-center justify-content-center h-100 bg-label-primary">
                        <i className="ti tabler-book text-primary" style={{ fontSize: 64, opacity: 0.4 }}></i>
                      </div>
                    )}
                    <div
                      className="position-absolute bottom-0 start-0 end-0 px-4 py-3"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)' }}
                    >
                      <h5 className="text-white mb-1">{course.title}</h5>
                      <p className="text-white mb-0 small" style={{ opacity: 0.85 }}>
                        {totalLessons} lessons · {course._count.modules} modules
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card-body pt-4">
                  <h5 className="mb-2">About this course</h5>
                  <p className="mb-0 text-body">{course.description || 'No description provided.'}</p>

                  <hr className="my-5" />

                  <h5 className="mb-3">By the numbers</h5>
                  <div className="d-flex flex-wrap row-gap-2 gap-8">
                    <div>
                      <p className="mb-2 text-nowrap">
                        <i className="ti tabler-users me-2"></i>Students: <strong>{stats?.enrolled ?? course._count.enrollments}</strong>
                      </p>
                      <p className="mb-2 text-nowrap">
                        <i className="ti tabler-circle-check me-2"></i>Avg. completion: <strong>{stats?.avgCompletion ?? 0}%</strong>
                      </p>
                      <p className="mb-0 text-nowrap">
                        <i className="ti tabler-layout-list me-2"></i>Modules: <strong>{course._count.modules}</strong>
                      </p>
                    </div>
                    <div>
                      <p className="mb-2 text-nowrap">
                        <i className="ti tabler-video me-2"></i>Lessons: <strong>{totalLessons}</strong>
                      </p>
                      <p className="mb-2 text-nowrap">
                        <i className="ti tabler-currency-rupee me-2"></i>Price:&nbsp;
                        <strong>{Number(course.price) === 0 ? 'Free' : `₹${Number(course.price).toLocaleString('en-IN')}`}</strong>
                      </p>
                      <p className="mb-0 text-nowrap">
                        <i className="ti tabler-check me-2"></i>Category: <strong>{course.category}</strong>
                      </p>
                    </div>
                  </div>

                  <hr className="my-5" />

                  <h5 className="mb-3">Instructor</h5>
                  <div className="d-flex align-items-center gap-3">
                    <span
                      className="badge rounded bg-label-primary fw-bold fs-4 d-inline-flex align-items-center justify-content-center"
                      style={{ width: 48, height: 48 }}
                    >
                      {(course.tutor?.name ?? 'A').slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <h6 className="mb-0">{course.tutor?.name ?? 'Admin Direct'}</h6>
                      <small className="text-body-secondary">{course.tutor?.email ?? ''}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tabs ──────────────────────────────────────────────── */}
          <div className="card">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-3">
              <ul className="nav nav-tabs card-header-tabs mb-0">
                {([
                  ['students',  'tabler-users',     'Students'],
                  ['analytics', 'tabler-chart-bar', 'Analytics'],
                  ['settings',  'tabler-settings',  'Settings'],
                ] as const).map(([key, icon, label]) => (
                  <li key={key} className="nav-item">
                    <button
                      className={`nav-link d-flex align-items-center gap-2${tab === key ? ' active' : ''}`}
                      onClick={() => setTab(key)}
                    >
                      <i className={`ti ${icon}`}></i>{label}
                    </button>
                  </li>
                ))}
              </ul>
              {tab === 'students' && (
                <Link href="/admin/students" className="btn btn-sm btn-outline-primary">
                  <i className="ti tabler-external-link me-1"></i>View All Students
                </Link>
              )}
            </div>

            {/* Students tab */}
            {tab === 'students' && (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="border-top">
                    <tr>
                      <th>Student</th>
                      <th>Enrolled</th>
                      <th>Progress</th>
                      <th>Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>{Array.from({ length: 4 }).map((_, j) => <td key={j}><span className="placeholder col-8" /></td>)}</tr>
                      ))
                    ) : enrollments.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-5 text-body-secondary">No students enrolled yet</td></tr>
                    ) : (
                      enrollments.map((e) => (
                        <tr key={e.id}>
                          <td>
                            <div className="d-flex align-items-center gap-3">
                              <div className="avatar">
                                <span className="avatar-initial rounded-circle bg-label-primary">{e.student.name[0]}</span>
                              </div>
                              <div>
                                <span className="fw-semibold d-block">{e.student.name}</span>
                                <small className="text-body-secondary">{e.student.email}</small>
                              </div>
                            </div>
                          </td>
                          <td className="text-body-secondary">
                            {new Date(e.enrolledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2" style={{ minWidth: 120 }}>
                              <div className="progress flex-grow-1" style={{ height: 6 }}>
                                <div
                                  className={`progress-bar ${e.completionPercentage === 100 ? 'bg-success' : 'bg-primary'}`}
                                  style={{ width: `${e.completionPercentage}%` }}
                                />
                              </div>
                              <small className="fw-semibold">{e.completionPercentage}%</small>
                            </div>
                          </td>
                          <td className="text-body-secondary">
                            {e.lastAccessedAt
                              ? new Date(e.lastAccessedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                              : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Analytics tab */}
            {tab === 'analytics' && (
              <div className="card-body">
                <div className="row g-4 mb-4">
                  {[
                    { label: 'Enrolled',      val: stats?.enrolled ?? course._count.enrollments, icon: 'tabler-users',         color: 'primary' },
                    { label: 'Avg Completion', val: `${stats?.avgCompletion ?? 0}%`,              icon: 'tabler-circle-check',  color: 'success' },
                    { label: 'Modules',        val: course._count.modules,                        icon: 'tabler-layout-list',   color: 'warning' },
                    { label: 'Lessons',        val: totalLessons,                                 icon: 'tabler-files',         color: 'info'    },
                  ].map((s) => (
                    <div key={s.label} className="col-sm-6 col-lg-3">
                      <div className="border rounded p-3 text-center">
                        <div
                          className={`badge rounded bg-label-${s.color} mx-auto mb-2 d-flex align-items-center justify-content-center`}
                          style={{ width: 52, height: 52, fontSize: 0 }}
                        >
                          <i className={`icon-base ti ${s.icon} icon-lg`}></i>
                        </div>
                        <h4 className="mb-0 fw-bold">{s.val}</h4>
                        <small className="text-body-secondary">{s.label}</small>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="row g-4">
                  <div className="col-md-6">
                    <h6 className="fw-semibold mb-3">Content Breakdown</h6>
                    {Object.entries({ VIDEO: 'primary', PDF: 'info', QUIZ: 'warning', ASSIGNMENT: 'danger', LIVE: 'success' }).map(([type, color]) => {
                      const count = modules.reduce((a, m) => a + m.lessons.filter((l) => l.type === type).length, 0)
                      return (
                        <div key={type} className="d-flex align-items-center gap-3 py-2 border-bottom">
                          <div className="avatar avatar-sm flex-shrink-0">
                            <span className={`avatar-initial rounded bg-label-${color}`}>
                              <i className={`icon-base ti ${LESSON_ICON[type]} icon-md`}></i>
                            </span>
                          </div>
                          <span className="small fw-medium text-heading flex-grow-1">{type.charAt(0) + type.slice(1).toLowerCase()}</span>
                          <span className={`badge bg-label-${color}`}>{count}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-semibold mb-3">Enrollment Completion</h6>
                    <div className="d-flex justify-content-between mb-1">
                      <small className="fw-semibold">Avg. completion rate</small>
                      <small className="fw-semibold">{stats?.avgCompletion ?? 0}%</small>
                    </div>
                    <div className="progress mb-3" style={{ height: 8 }}>
                      <div className="progress-bar bg-primary" style={{ width: `${stats?.avgCompletion ?? 0}%` }} />
                    </div>
                    <small className="text-body-secondary">
                      Based on {stats?.enrolled ?? 0} enrolled students
                    </small>
                  </div>
                </div>
              </div>
            )}

            {/* Settings tab */}
            {tab === 'settings' && (
              <div className="card-body">

                <h5 className="mb-3">Course Performance</h5>
                <div className="d-flex flex-wrap row-gap-2 gap-8 mb-2">
                  <div>
                    <p className="text-nowrap mb-2">
                      <i className="ti tabler-users me-2"></i>Students enrolled: <strong>{stats?.enrolled ?? course._count.enrollments}</strong>
                    </p>
                    <p className="text-nowrap mb-0">
                      <i className="ti tabler-circle-check me-2"></i>Avg. completion rate: <strong>{stats?.avgCompletion ?? 0}%</strong>
                    </p>
                  </div>
                  <div>
                    <p className="text-nowrap mb-2">
                      <i className="ti tabler-layout-list me-2"></i>Modules: <strong>{course._count.modules}</strong>
                    </p>
                    <p className="text-nowrap mb-0">
                      <i className="ti tabler-files me-2"></i>Total lessons: <strong>{totalLessons}</strong>
                    </p>
                  </div>
                </div>

                <hr className="my-5" />

                <h5 className="mb-4">Course Actions</h5>
                <div className="row g-3">
                  {[
                    { icon: 'tabler-clipboard-list', label: 'Edit Curriculum',    sub: 'Manage lessons & modules', href: `/admin/courses/${id}/curriculum`, color: 'primary' },
                    { icon: 'tabler-users',          label: 'View Students',       sub: `${stats?.enrolled ?? 0} students enrolled`,   href: '/admin/students',               color: 'success' },
                    { icon: 'tabler-speakerphone',   label: 'Send Announcement',   sub: 'Notify course students',   href: '/admin/announcements',           color: 'warning' },
                  ].map((a) => (
                    <div key={a.label} className="col-sm-6">
                      <Link
                        href={a.href}
                        className="card shadow-none border d-flex flex-row align-items-center gap-3 p-3 h-100 text-decoration-none"
                        style={{ borderRadius: 10 }}
                      >
                        <div className="avatar flex-shrink-0">
                          <span className={`avatar-initial rounded bg-label-${a.color}`}>
                            <i className={`icon-base ti ${a.icon} icon-26px`}></i>
                          </span>
                        </div>
                        <div className="flex-grow-1 overflow-hidden">
                          <div className="fw-semibold text-heading text-truncate">{a.label}</div>
                          <small className="text-body-secondary text-truncate d-block">{a.sub}</small>
                        </div>
                        <i className="ti tabler-chevron-right text-body-secondary flex-shrink-0"></i>
                      </Link>
                    </div>
                  ))}
                </div>

                <hr className="my-5" />

                <h5 className="mb-4">Configuration</h5>
                <form onSubmit={handleSubmit((d) => saveSettings.mutate(d))} noValidate>
                  <div className="row g-4 mb-4" style={{ maxWidth: 560 }}>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Price (₹)</label>
                      <input
                        className={`form-control ${errors.price ? 'is-invalid' : ''}`}
                        type="number"
                        {...register('price')}
                      />
                      {errors.price && <div className="invalid-feedback">{errors.price.message}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Assign Tutor</label>
                      <select className={`form-select ${errors.tutorId ? 'is-invalid' : ''}`} {...register('tutorId')}>
                        <option value="">Select tutor…</option>
                        {tutors.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      {errors.tutorId && <div className="invalid-feedback">{errors.tutorId.message}</div>}
                    </div>
                  </div>
                  {saveSettings.isError && (
                    <div className="alert alert-danger py-2 small mb-3">
                      {(saveSettings.error as any)?.response?.data?.error?.message ?? 'Save failed'}
                    </div>
                  )}
                  {saveSettings.isSuccess && (
                    <div className="alert alert-success py-2 small mb-3">Settings saved.</div>
                  )}
                  <div className="d-flex flex-wrap gap-3">
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting || saveSettings.isLoading}>
                      {(isSubmitting || saveSettings.isLoading) && <span className="spinner-border spinner-border-sm me-2" />}
                      <i className="ti tabler-device-floppy me-1"></i>Save Settings
                    </button>
                    <button
                      type="button"
                      className={`btn ${course.status === 'PUBLISHED' ? 'btn-outline-warning' : 'btn-outline-success'}`}
                      onClick={() => togglePublish.mutate()}
                      disabled={togglePublish.isLoading}
                    >
                      <i className={`ti ${course.status === 'PUBLISHED' ? 'tabler-eye-off' : 'tabler-eye'} me-1`} />
                      {course.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar (col-lg-4) ────────────────────────────────── */}
        <div className="col-lg-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h6 className="fw-bold mb-0">Course Content</h6>
            <Link href={`/admin/courses/${id}/curriculum`} className="btn btn-sm btn-outline-primary">
              <i className="ti tabler-edit me-1"></i>Edit
            </Link>
          </div>

          {modules.length === 0 ? (
            <div className="card">
              <div className="card-body text-center text-body-secondary py-5">
                <i className="ti tabler-books mb-2" style={{ fontSize: 32 }} />
                <p className="mb-0 small">No modules yet.</p>
                <Link href={`/admin/courses/${id}/curriculum`} className="btn btn-sm btn-primary mt-3">
                  Build Curriculum
                </Link>
              </div>
            </div>
          ) : (
            <div className="accordion accordion-custom-button" id="courseContent">
              {modules.map((mod) => (
                <div key={mod.id} className="accordion-item">
                  <div className="accordion-header">
                    <button
                      type="button"
                      className={`accordion-button${openMod !== mod.id ? ' collapsed' : ''}`}
                      onClick={() => setOpenMod(openMod === mod.id ? '' : mod.id)}
                    >
                      <span className="d-flex flex-column">
                        <span className="h5 mb-0">{mod.title}</span>
                        <span className="text-body fw-normal">{mod.lessons.length} lessons</span>
                      </span>
                    </button>
                  </div>
                  {openMod === mod.id && (
                    <div className="accordion-collapse">
                      <div className="accordion-body py-4">
                        {mod.lessons.map((lesson, li) => (
                          <div key={lesson.id} className={`form-check${li < mod.lessons.length - 1 ? ' mb-4' : ''}`}>
                            <span className="form-check-input mt-3 d-inline-flex align-items-center justify-content-center"
                              style={{ width: 16, height: 16 }}>
                              <i className={`ti ${LESSON_ICON[lesson.type] ?? 'tabler-file'} text-${LESSON_COLOR[lesson.type] ?? 'secondary'}`}
                                style={{ fontSize: 14 }} />
                            </span>
                            <label className="form-check-label ms-4">
                              <span className="mb-0 h6 d-block">{lesson.title}</span>
                              <small className="text-body d-block">
                                {lesson.isFreePreview && <span className="badge bg-label-success me-1 rounded-pill" style={{ fontSize: 10 }}>Free</span>}
                                {lesson.durationSeconds ? `${Math.round(lesson.durationSeconds / 60)} min` : lesson.type}
                              </small>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  )
}
