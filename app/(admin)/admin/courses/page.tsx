'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import Link from 'next/link'
import Image from 'next/image'
import AdminLayout from '@/components/layouts/AdminLayout'
import api from '@/lib/api'

const STATUS_META = {
  DRAFT:     { badge: 'bg-label-secondary', label: 'Draft',     color: 'secondary' },
  PUBLISHED: { badge: 'bg-label-success',   label: 'Published', color: 'success'   },
  ARCHIVED:  { badge: 'bg-label-danger',    label: 'Archived',  color: 'danger'    },
} as const

const CATEGORY_COLORS: Record<string, string> = {
  Law:         'primary',
  Medical:     'info',
  Engineering: 'success',
  Management:  'warning',
  Finance:     'danger',
  Language:    'secondary',
  Other:       'secondary',
}

export default function CoursesPage() {
  const qc = useQueryClient()
  const [view, setView]                 = useState<'card' | 'table'>('card')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch]             = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  const { data, isLoading } = useQuery(
    ['courses', statusFilter],
    () => api.get(`/courses?${statusFilter ? `status=${statusFilter}&` : ''}limit=50`).then((r) => r.data),
  )

  const togglePublish = useMutation(
    (id: string) => api.post(`/courses/${id}/publish`),
    { onSuccess: () => qc.invalidateQueries('courses') },
  )

  const deleteCourse = useMutation(
    (id: string) => api.delete(`/courses/${id}`),
    { onSuccess: () => { qc.invalidateQueries('courses'); setDeleteTarget(null) } },
  )

  const courses  = data?.courses ?? []
  const filtered = courses.filter((c: any) =>
    search ? c.title.toLowerCase().includes(search.toLowerCase()) : true,
  )

  return (
    <AdminLayout title="Courses" breadcrumb="Home / Courses">

      {/* ── Hero Banner ── */}
      <div className="card p-0 mb-6">
        <div className="card-body d-flex flex-column flex-md-row justify-content-between p-0 pt-6">
          <div className="d-none d-md-flex align-items-end ps-6 pb-0" style={{ minWidth: 90 }}>
            <Image src="/img/illustrations/bulb-light.png" alt="" width={90} height={90} style={{ objectFit: 'contain' }} />
          </div>
          <div className="flex-grow-1 d-flex align-items-center flex-column text-md-center px-6 py-6">
            <h4 className="mb-2 text-heading lh-lg">
              Manage Your Courses<br />
              <span className="text-primary text-nowrap">All in one place.</span>
            </h4>
            <p className="mb-4 text-body">Build, publish, and track all courses for your institute — schedule classes, view progress and more.</p>
            <div className="d-flex align-items-center gap-3 w-100" style={{ maxWidth: 480 }}>
              <input
                type="search"
                placeholder="Search courses..."
                className="form-control"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Link href="/admin/courses/create" className="btn btn-primary text-nowrap">
                <i className="ti tabler-plus me-1"></i>New Course
              </Link>
            </div>
          </div>
          <div className="d-none d-md-flex align-items-end justify-content-end pe-0" style={{ minWidth: 120 }}>
            <Image src="/img/illustrations/pencil-rocket.png" alt="" width={120} height={188} style={{ objectFit: 'contain' }} />
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="card-header d-flex flex-wrap justify-content-between gap-4">
          <div className="card-title mb-0">
            <h5 className="mb-0">My Courses</h5>
            <p className="mb-0 text-body">{isLoading ? '…' : `${courses.length} courses in your institute`}</p>
          </div>
          <div className="d-flex align-items-center flex-md-nowrap flex-wrap gap-3">
            <select
              className="form-select"
              style={{ maxWidth: 160 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Courses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <select className="form-select" style={{ maxWidth: 180 }}>
              <option>All Subjects</option>
              <option>Law</option>
              <option>Medical</option>
              <option>Engineering</option>
              <option>Management</option>
              <option>Finance</option>
              <option>Language</option>
            </select>
            <div className="btn-group">
              <button
                type="button"
                className={`btn btn-icon btn-outline-secondary${view === 'card' ? ' active' : ''}`}
                onClick={() => setView('card')}
                title="Card view"
              >
                <i className="ti tabler-layout-grid"></i>
              </button>
              <button
                type="button"
                className={`btn btn-icon btn-outline-secondary${view === 'table' ? ' active' : ''}`}
                onClick={() => setView('table')}
                title="Table view"
              >
                <i className="ti tabler-list"></i>
              </button>
            </div>
          </div>
        </div>

        {/* ── Card view ── */}
        {view === 'card' && (
          <div className="card-body">
            {isLoading ? (
              <div className="row gy-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="col-sm-6 col-lg-4">
                    <div className="card p-2 h-100 shadow-none border placeholder-glow">
                      <div className="rounded-2 mb-4 placeholder" style={{ height: 160 }}></div>
                      <div className="card-body p-4 pt-2">
                        <span className="placeholder col-6 mb-2 d-block"></span>
                        <span className="placeholder col-8 mb-2 d-block"></span>
                        <span className="placeholder col-4 d-block"></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-5 text-body-secondary">No courses found</div>
            ) : (
              <div className="row gy-6">
                {filtered.map((c: any) => {
                  const meta     = STATUS_META[c.status as keyof typeof STATUS_META] ?? { badge: 'bg-label-secondary', label: c.status, color: 'secondary' }
                  const catColor = CATEGORY_COLORS[c.category] ?? 'primary'
                  return (
                    <div key={c.id} className="col-sm-6 col-lg-4">
                      <div className="card p-2 h-100 shadow-none border">
                        <div
                          className="rounded-2 d-flex align-items-center justify-content-center mb-4 overflow-hidden bg-label-primary"
                          style={{ height: 160, position: 'relative' }}
                        >
                          {c.thumbnailUrl ? (
                            <img src={c.thumbnailUrl} alt={c.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <i className="ti tabler-book" style={{ fontSize: 48, opacity: 0.3 }}></i>
                          )}
                          <span className={`badge ${meta.badge} position-absolute`} style={{ top: 10, right: 10, fontSize: 11 }}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="card-body p-4 pt-2">
                          <div className="d-flex justify-content-between align-items-center mb-4">
                            <span className={`badge bg-label-${catColor}`}>{c.category || 'General'}</span>
                            <span className="text-body-secondary small">
                              <i className="ti tabler-layout-grid me-1"></i>{c._count?.modules ?? 0} modules
                            </span>
                          </div>
                          <Link href={`/admin/courses/${c.id}`} className="h5 text-heading d-block mb-1">{c.title}</Link>
                          {c.description && (
                            <p className="text-body-secondary small mt-1 mb-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {c.description}
                            </p>
                          )}
                          <div className="d-flex align-items-center gap-3 mb-2 small text-body-secondary">
                            <span><i className="ti tabler-user me-1"></i>{c.tutor?.name ?? 'Admin Direct'}</span>
                          </div>
                          <div className="d-flex align-items-center gap-3 mb-3 small text-body-secondary">
                            <span><i className="ti tabler-users me-1"></i>{c._count?.enrollments ?? 0} students</span>
                            <span className="fw-semibold text-success">
                              {c.price === 0 ? 'Free' : `₹${Number(c.price).toLocaleString('en-IN')}`}
                            </span>
                          </div>
                          <div className="mb-4"></div>
                          <div className="d-flex gap-2">
                            <Link href={`/admin/courses/${c.id}`} className="flex-grow-1 btn btn-label-primary d-flex align-items-center justify-content-center">
                              <i className="ti tabler-edit icon-xs me-2"></i>Edit
                            </Link>
                            <button className="btn btn-label-danger d-flex align-items-center justify-content-center" onClick={() => setDeleteTarget({ id: c.id, title: c.title })}>
                              <i className="ti tabler-trash icon-xs"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Table view ── */}
        {view === 'table' && (
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="border-top">
                <tr>
                  <th>Course</th>
                  <th>Category</th>
                  <th>Tutor</th>
                  <th>Students</th>
                  <th>Revenue</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j}><span className="placeholder col-8" /></td>)}</tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-5 text-body-secondary">No courses found</td></tr>
                ) : (
                  filtered.map((c: any) => {
                    const meta     = STATUS_META[c.status as keyof typeof STATUS_META] ?? { badge: 'bg-label-secondary', label: c.status, color: 'secondary' }
                    const catColor = CATEGORY_COLORS[c.category] ?? 'primary'
                    return (
                      <tr key={c.id}>
                        <td>
                          <Link href={`/admin/courses/${c.id}`} className="fw-semibold text-heading d-block">{c.title}</Link>
                          <small className="text-body-secondary">{c._count?.modules ?? 0} modules</small>
                        </td>
                        <td><span className={`badge bg-label-${catColor}`}>{c.category || 'General'}</span></td>
                        <td className="text-body-secondary">{c.tutor?.name ?? '—'}</td>
                        <td><i className="ti tabler-users text-primary me-1"></i>{c._count?.enrollments ?? 0}</td>
                        <td className="fw-semibold">
                          {c.price === 0 ? <span className="badge bg-label-success rounded-pill">Free</span> : `₹${Number(c.price).toLocaleString('en-IN')}`}
                        </td>
                        <td><span className={`badge ${meta.badge}`}>{meta.label}</span></td>
                        <td>
                          <div className="dropdown">
                            <button className="btn btn-sm btn-icon btn-text-secondary rounded-pill dropdown-toggle hide-arrow" data-bs-toggle="dropdown">
                              <i className="ti tabler-dots-vertical"></i>
                            </button>
                            <div className="dropdown-menu dropdown-menu-end">
                              <Link className="dropdown-item" href={`/admin/courses/${c.id}`}>
                                <i className="ti tabler-edit me-2"></i>Edit Course
                              </Link>
                              <button className="dropdown-item" onClick={() => togglePublish.mutate(c.id)}>
                                <i className={`ti ${c.status === 'PUBLISHED' ? 'tabler-eye-off' : 'tabler-eye'} me-2`}></i>
                                {c.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                              </button>
                              <div className="dropdown-divider"></div>
                              <button className="dropdown-item text-danger" onClick={() => setDeleteTarget({ id: c.id, title: c.title })}>
                                <i className="ti tabler-trash me-2"></i>Delete Course
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
      {deleteTarget && (
        <div className="modal show d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0 pb-0">
                <button type="button" className="btn-close" onClick={() => setDeleteTarget(null)} />
              </div>
              <div className="modal-body px-5 pb-2 text-center">
                <div className="mb-4">
                  <span className="avatar avatar-lg bg-label-danger rounded-circle">
                    <i className="ti tabler-trash icon-28px text-danger" />
                  </span>
                </div>
                <h4 className="mb-2">Delete Course?</h4>
                <p className="text-body-secondary mb-1">You are about to permanently delete</p>
                <p className="fw-semibold mb-3">"{deleteTarget.title}"</p>
                <div className="alert alert-danger py-2 text-start small mb-0">
                  <i className="ti tabler-alert-triangle me-1" />
                  <strong>This cannot be undone.</strong> All modules, lessons, enrollments and data for this course will be permanently erased.
                </div>
              </div>
              <div className="modal-footer border-0 pt-3 justify-content-center gap-3">
                <button type="button" className="btn btn-label-secondary px-5" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger px-5"
                  disabled={deleteCourse.isLoading}
                  onClick={() => deleteCourse.mutate(deleteTarget.id)}
                >
                  {deleteCourse.isLoading
                    ? <span className="spinner-border spinner-border-sm me-2" />
                    : <i className="ti tabler-trash me-1" />
                  }
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  )
}
