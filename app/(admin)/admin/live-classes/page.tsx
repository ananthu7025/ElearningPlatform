'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AdminLayout from '@/components/layouts/AdminLayout'
import api from '@/lib/api'
import { usePlanFeatures } from '@/hooks/usePlanFeatures'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LiveClass {
  id: string
  title: string
  scheduledAt: string
  durationMinutes: number
  status: string
  agoraChannelId: string | null
  course: { id: string; title: string }
  tutor: { id: string; name: string }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { badge: string; label: string }> = {
  scheduled:  { badge: 'bg-label-info',      label: 'Scheduled'  },
  live:       { badge: 'bg-label-success',   label: 'Live'       },
  completed:  { badge: 'bg-label-secondary', label: 'Completed'  },
  cancelled:  { badge: 'bg-label-danger',    label: 'Cancelled'  },
}

// ── Schema ────────────────────────────────────────────────────────────────────

const createSchema = z.object({
  title:       z.string().min(3, 'Enter a title'),
  courseId:    z.string().uuid('Select a course'),
  scheduledAt: z.string().min(1, 'Pick a date & time'),
  duration:    z.coerce.number().int().min(15, 'Min 15 min').max(480, 'Max 8 hrs'),
})
type CreateForm = z.infer<typeof createSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function isUpcoming(s: string) {
  return new Date(s) > new Date()
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LiveClassesPage() {
  const qc = useQueryClient()
  const { hasFeature, planName } = usePlanFeatures()
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<LiveClass | null>(null)

  const { data, isLoading } = useQuery(
    ['live-classes', filter],
    () => {
      const params = new URLSearchParams()
      if (filter === 'upcoming') params.set('upcoming', 'true')
      return api.get(`/live-classes?${params}`).then((r) => r.data)
    }
  )

  const { data: coursesData } = useQuery('courses-all', () =>
    api.get('/courses?limit=100').then((r) => r.data)
  )

  const createClass = useMutation(
    (d: CreateForm) => api.post('/live-classes', d),
    {
      onSuccess: () => {
        qc.invalidateQueries('live-classes')
        setShowCreate(false)
        reset()
      },
    }
  )

  const deleteClass = useMutation(
    (id: string) => api.delete(`/live-classes/${id}`),
    {
      onSuccess: () => {
        qc.invalidateQueries('live-classes')
        setDeleteTarget(null)
      },
    }
  )

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { duration: 60 },
  })

  const allClasses: LiveClass[] = data?.liveClasses ?? []
  const displayed = filter === 'completed'
    ? allClasses.filter((c) => !isUpcoming(c.scheduledAt))
    : allClasses

  const upcomingCount  = allClasses.filter((c) => isUpcoming(c.scheduledAt)).length
  const completedCount = allClasses.filter((c) => !isUpcoming(c.scheduledAt)).length

  if (!hasFeature('live_classes')) {
    return (
      <AdminLayout title="Live Classes" breadcrumb="Home / Live Classes">
        <div className="card">
          <div className="card-body text-center py-6">
            <span className="avatar avatar-xl bg-label-warning rounded-circle mb-4 d-inline-flex align-items-center justify-content-center">
              <i className="ti tabler-lock icon-36px text-warning" />
            </span>
            <h4 className="mb-2">Live Classes — Not Available</h4>
            <p className="text-body-secondary mb-1">
              Your current plan <strong>({planName || '…'})</strong> does not include Live Classes.
            </p>
            <p className="text-body-secondary mb-4">Upgrade to <strong>Growth</strong> or <strong>Pro</strong> to schedule and host live sessions.</p>
            <a href="/admin/settings" className="btn btn-primary">
              <i className="ti tabler-arrow-up-circle me-1" />Upgrade Plan
            </a>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Live Classes" breadcrumb="Home / Live Classes">

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="row g-6 mb-6">
        {[
          { label: 'Total',     value: allClasses.length, icon: 'tabler-video',          color: 'bg-label-primary' },
          { label: 'Upcoming',  value: upcomingCount,     icon: 'tabler-calendar-event', color: 'bg-label-info'    },
          { label: 'Completed', value: completedCount,    icon: 'tabler-circle-check',   color: 'bg-label-success' },
        ].map((s) => (
          <div key={s.label} className="col-sm-4">
            <div className="card">
              <div className="card-body d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-body-secondary mb-1">{s.label}</p>
                  <h4 className="mb-0">{isLoading ? '—' : s.value}</h4>
                </div>
                <div className="avatar">
                  <span className={`avatar-initial rounded ${s.color}`}>
                    <i className={`ti ${s.icon} icon-26px`} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Card ────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-3">
          {/* Filter tabs */}
          <ul className="nav nav-pills mb-0">
            {(['all', 'upcoming', 'completed'] as const).map((f) => (
              <li key={f} className="nav-item">
                <button
                  className={`nav-link ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              </li>
            ))}
          </ul>

          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
          >
            <i className="ti tabler-plus me-1" />Schedule Class
          </button>
        </div>

        <div className="table-responsive text-nowrap">
          <table className="table table-hover align-middle">
            <thead className="border-top">
              <tr>
                <th>Title</th>
                <th>Course</th>
                <th>Tutor</th>
                <th>Scheduled At</th>
                <th>Duration</th>
                <th>Status</th>
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody className="table-border-bottom-0">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><span className="placeholder col-8" /></td>
                    ))}
                  </tr>
                ))
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-body-secondary">
                    <i className="ti tabler-video-off d-block icon-32px mb-2" />
                    No live classes found
                  </td>
                </tr>
              ) : displayed.map((lc) => {
                const sm = STATUS_META[lc.status] ?? { badge: 'bg-label-secondary', label: lc.status }
                const upcoming = isUpcoming(lc.scheduledAt)
                return (
                  <tr key={lc.id}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div className="avatar">
                          <span className={`avatar-initial rounded ${upcoming ? 'bg-label-info' : 'bg-label-secondary'}`}>
                            <i className="ti tabler-video icon-20px" />
                          </span>
                        </div>
                        <span className="fw-semibold">{lc.title}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-body-secondary">{lc.course.title}</span>
                    </td>
                    <td>{lc.tutor.name}</td>
                    <td>
                      <span className={upcoming ? 'text-info fw-semibold' : 'text-body-secondary'}>
                        {fmtDate(lc.scheduledAt)}
                      </span>
                    </td>
                    <td>{lc.durationMinutes} min</td>
                    <td>
                      <span className={`badge ${sm.badge} rounded-pill`}>{sm.label}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-icon btn-text-danger rounded-pill"
                        title="Delete"
                        onClick={() => setDeleteTarget(lc)}
                        data-bs-toggle="modal"
                        data-bs-target="#modalDeleteLC"
                      >
                        <i className="ti tabler-trash icon-md" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Schedule Modal ────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Schedule Live Class</h5>
                <button type="button" className="btn-close" onClick={() => { setShowCreate(false); reset() }} />
              </div>
              <form onSubmit={handleSubmit((d) => createClass.mutate(d))} noValidate>
                <div className="modal-body">
                  {createClass.isError && (
                    <div className="alert alert-danger py-2 small mb-3">
                      {(createClass.error as any)?.response?.data?.error?.message ?? 'Failed to schedule. Check your plan includes Live Classes.'}
                    </div>
                  )}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Title</label>
                    <input
                      type="text"
                      className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                      placeholder="e.g. Contract Law — Session 3"
                      {...register('title')}
                    />
                    {errors.title && <div className="invalid-feedback">{errors.title.message}</div>}
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold">Course</label>
                    <select
                      className={`form-select ${errors.courseId ? 'is-invalid' : ''}`}
                      {...register('courseId')}
                    >
                      <option value="">Select a course…</option>
                      {(coursesData?.courses ?? []).map((c: any) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                    {errors.courseId && <div className="invalid-feedback">{errors.courseId.message}</div>}
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold">Date & Time</label>
                    <input
                      type="datetime-local"
                      className={`form-control ${errors.scheduledAt ? 'is-invalid' : ''}`}
                      {...register('scheduledAt')}
                    />
                    {errors.scheduledAt && <div className="invalid-feedback">{errors.scheduledAt.message}</div>}
                  </div>

                  <div className="mb-2">
                    <label className="form-label fw-semibold">Duration (minutes)</label>
                    <div className="input-group">
                      <input
                        type="number"
                        min={15}
                        max={480}
                        className={`form-control ${errors.duration ? 'is-invalid' : ''}`}
                        {...register('duration')}
                      />
                      <span className="input-group-text">min</span>
                      {errors.duration && <div className="invalid-feedback">{errors.duration.message}</div>}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-label-secondary" onClick={() => { setShowCreate(false); reset() }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting || createClass.isLoading}>
                    {(isSubmitting || createClass.isLoading) && <span className="spinner-border spinner-border-sm me-2" />}
                    <i className="ti tabler-calendar-plus me-1" />Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ─────────────────────────────────────────────────── */}
      <div className="modal fade" id="modalDeleteLC" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header border-0 pb-0">
              <button type="button" className="btn-close" data-bs-dismiss="modal" onClick={() => setDeleteTarget(null)} />
            </div>
            <div className="modal-body px-5 pb-2 text-center">
              <div className="mb-4">
                <span className="avatar avatar-lg bg-label-danger rounded-circle">
                  <i className="ti tabler-trash icon-28px text-danger" />
                </span>
              </div>
              <h4 className="mb-2">Delete Live Class?</h4>
              <p className="text-body-secondary mb-0">
                <strong>{deleteTarget?.title}</strong> will be permanently removed.
              </p>
            </div>
            <div className="modal-footer border-0 justify-content-center gap-3">
              <button type="button" className="btn btn-label-secondary px-5" data-bs-dismiss="modal" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger px-5"
                data-bs-dismiss="modal"
                disabled={deleteClass.isLoading}
                onClick={() => deleteTarget && deleteClass.mutate(deleteTarget.id)}
              >
                {deleteClass.isLoading
                  ? <span className="spinner-border spinner-border-sm me-2" />
                  : <i className="ti tabler-trash me-1" />
                }
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      </div>

    </AdminLayout>
  )
}
