'use client'

import { useState } from 'react'
import { useQuery } from 'react-query'
import Link from 'next/link'
import TutorLayout from '@/components/layouts/TutorLayout'
import api from '@/lib/api'

const STATUS_BADGE: Record<string, string> = {
  DRAFT:     'bg-label-secondary',
  PUBLISHED: 'bg-label-success',
  ARCHIVED:  'bg-label-danger',
}
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', PUBLISHED: 'Published', ARCHIVED: 'Archived',
}

const CATEGORY_COLORS = ['primary', 'info', 'warning', 'success', 'danger']
function categoryColor(idx: number) { return CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }

export default function TutorCoursesPage() {
  const [view,          setView]          = useState<'card' | 'table'>('card')
  const [statusFilter,  setStatusFilter]  = useState('All')
  const [subjectFilter, setSubjectFilter] = useState('All')
  const [search,        setSearch]        = useState('')

  const { data, isLoading } = useQuery('tutorCourses', () =>
    api.get('/courses?limit=50').then((r) => r.data)
  )

  const allCourses: any[] = data?.courses ?? []

  const totalStudents  = allCourses.reduce((s: number, c: any) => s + (c._count?.enrollments ?? 0), 0)
  const activeCourses  = allCourses.filter((c) => c.status === 'PUBLISHED').length
  const draftCourses   = allCourses.filter((c) => c.status === 'DRAFT').length
  const categories     = [...new Set(allCourses.map((c: any) => c.category).filter(Boolean))]

  const filtered = allCourses.filter((c: any) => {
    if (statusFilter !== 'All' && c.status !== statusFilter) return false
    if (subjectFilter !== 'All' && c.category !== subjectFilter) return false
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <TutorLayout title="My Courses" breadcrumb="Home / My Courses">

      {/* ── Hero Banner ── */}
      <div className="card p-0 mb-6">
        <div className="card-body d-flex flex-column flex-md-row justify-content-between align-items-center p-0 pt-6">
          <div className="flex-grow-1 d-flex align-items-center flex-column text-md-center px-6 py-6">
            <h4 className="mb-2 text-heading lh-lg">
              Manage Your Courses<br />
              <span className="text-primary text-nowrap">All in one place.</span>
            </h4>
            <p className="mb-4 text-body">Build, publish, and track your law courses — schedule classes, view student progress and more.</p>
            <div className="d-flex align-items-center gap-3 w-100" style={{ maxWidth: 480 }}>
              <input
                type="search"
                placeholder="Search courses..."
                className="form-control"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="row g-6 mb-6">
        {[
          { icon: 'tabler-users',          label: 'Total Students', value: isLoading ? '—' : String(totalStudents), sub: 'Across all courses',  color: 'bg-label-primary', iconColor: '#7367F0' },
          { icon: 'tabler-book',           label: 'Active Courses', value: isLoading ? '—' : String(activeCourses), sub: `${draftCourses} in draft`, color: 'bg-label-info', iconColor: '#00CFE8' },
          { icon: 'tabler-star',           label: 'Avg. Rating',    value: '—',                                      sub: 'No rating data',      color: 'bg-label-warning', iconColor: '#FF9F43' },
          { icon: 'tabler-book-2',         label: 'Total Courses',  value: isLoading ? '—' : String(allCourses.length), sub: 'All statuses',   color: 'bg-label-success', iconColor: '#28C76F' },
        ].map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between">
                  <div className="content-left">
                    <span className="text-heading">{s.label}</span>
                    <div className="d-flex align-items-center my-1">
                      <h4 className="mb-0 me-2">{s.value}</h4>
                    </div>
                    <small className="mb-0 text-body-secondary">{s.sub}</small>
                  </div>
                  <div className="avatar">
                    <span className={`avatar-initial rounded ${s.color}`}>
                      <i className={`icon-base ti ${s.icon} icon-26px`} style={{ color: s.iconColor }} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters + View Toggle ── */}
      <div className="card mb-6">
        <div className="card-header d-flex flex-wrap justify-content-between gap-4">
          <div className="card-title mb-0">
            <h5 className="mb-0">My Courses</h5>
            <p className="mb-0 text-body small">{allCourses.length} courses</p>
          </div>
          <div className="d-flex align-items-center flex-md-nowrap flex-wrap gap-3">
            <select className="form-select" style={{ maxWidth: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <select className="form-select" style={{ maxWidth: 180 }} value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
              <option value="All">All Subjects</option>
              {categories.map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <div className="btn-group">
              <button type="button" className={`btn btn-icon btn-outline-secondary${view === 'card' ? ' active' : ''}`} onClick={() => setView('card')} title="Card view">
                <i className="ti tabler-layout-grid" />
              </button>
              <button type="button" className={`btn btn-icon btn-outline-secondary${view === 'table' ? ' active' : ''}`} onClick={() => setView('table')} title="Table view">
                <i className="ti tabler-list" />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="card-body">
            <div className="row g-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="col-md-6 col-xl-4">
                  <div className="card"><div className="card-body placeholder-glow"><span className="placeholder col-8 mb-2 d-block" /><span className="placeholder col-5" /></div></div>
                </div>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-body text-center py-5 text-body-secondary">
            <i className="ti tabler-book mb-2" style={{ fontSize: 40 }} />
            <p className="mb-0">No courses found</p>
          </div>
        ) : view === 'card' ? (
          /* ── Card View ── */
          <div className="card-body">
            <div className="row gy-6">
              {filtered.map((c: any, idx: number) => {
                const catColor = categoryColor(idx)
                return (
                  <div key={c.id} className="col-sm-6 col-lg-4">
                    <div className="card p-2 h-100 shadow-none border">
                      {/* Thumbnail placeholder */}
                      <div className="rounded-2 d-flex align-items-center justify-content-center mb-3 overflow-hidden position-relative" style={{ height: 140, background: `var(--bs-${catColor}-bg, #f0f0f0)` }}>
                        <i className={`ti tabler-book text-${catColor}`} style={{ fontSize: 48, opacity: 0.4 }} />
                        <span className={`badge ${STATUS_BADGE[c.status] ?? 'bg-label-secondary'} position-absolute`} style={{ top: 10, right: 10, fontSize: 11 }}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </span>
                      </div>

                      <div className="card-body p-2 pt-0">
                        {/* Category + Rating */}
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <span className={`badge bg-label-${catColor}`}>{c.category ?? 'General'}</span>
                          <span className="text-body-secondary small">No ratings yet</span>
                        </div>

                        {/* Title + desc */}
                        <Link href={`/tutor/courses/${c.id}`} className="h6 text-heading d-block mb-1 fw-semibold">{c.title}</Link>
                        <p className="text-body-secondary small mt-1 mb-2">{c.description || 'No description'}</p>

                        {/* Meta */}
                        <div className="d-flex align-items-center gap-3 mb-3 small text-body-secondary">
                          <span><i className="ti tabler-layout-list me-1" />{c._count?.modules ?? 0} modules</span>
                          <span><i className="ti tabler-users me-1" />{c._count?.enrollments ?? 0} students</span>
                        </div>

                        {/* Actions */}
                        <div className="d-flex gap-2">
                          <Link href={`/tutor/students?courseId=${c.id}`} className="btn btn-sm btn-label-secondary flex-grow-1">
                            <i className="ti tabler-users icon-xs me-1" />Students
                          </Link>
                          <Link href={`/tutor/courses/${c.id}`} className="btn btn-sm btn-label-primary flex-grow-1">
                            <i className="ti tabler-edit icon-xs me-1" />Manage
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* ── Table View ── */
          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="border-top">
                <tr>
                  <th>Course</th>
                  <th>Category</th>
                  <th>Students</th>
                  <th>Modules</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any, idx: number) => {
                  const catColor = categoryColor(idx)
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div className={`avatar rounded bg-label-${catColor}`}>
                            <i className="ti tabler-book avatar-initial" style={{ fontSize: 16 }} />
                          </div>
                          <div>
                            <Link href={`/tutor/courses/${c.id}`} className="fw-semibold text-heading d-block">{c.title}</Link>
                            <small className="text-body-secondary">{c.description?.slice(0, 40) || 'No description'}</small>
                          </div>
                        </div>
                      </td>
                      <td><span className={`badge bg-label-${catColor}`}>{c.category ?? 'General'}</span></td>
                      <td><i className="ti tabler-users text-primary me-1" />{c._count?.enrollments ?? 0}</td>
                      <td>{c._count?.modules ?? 0}</td>
                      <td><span className={`badge ${STATUS_BADGE[c.status] ?? 'bg-label-secondary'}`}>{STATUS_LABEL[c.status] ?? c.status}</span></td>
                      <td>
                        <div className="dropdown">
                          <button className="btn btn-sm btn-icon btn-text-secondary rounded-pill dropdown-toggle hide-arrow" data-bs-toggle="dropdown">
                            <i className="ti tabler-dots-vertical" />
                          </button>
                          <div className="dropdown-menu dropdown-menu-end">
                            <Link className="dropdown-item" href={`/tutor/courses/${c.id}`}>
                              <i className="ti tabler-edit me-2" />Manage Course
                            </Link>
                            <Link className="dropdown-item" href={`/tutor/students?courseId=${c.id}`}>
                              <i className="ti tabler-users me-2" />View Students
                            </Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </TutorLayout>
  )
}
