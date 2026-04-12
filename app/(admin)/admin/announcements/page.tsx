'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AdminLayout from '@/components/layouts/AdminLayout'
import api from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Announcement {
  id:             string
  title:          string
  body:           string
  targetRole:     'STUDENT' | 'TUTOR' | null
  targetCourseId: string | null
  targetCourse:   { id: string; title: string } | null
  channels:       string[]
  status:         'DRAFT' | 'SCHEDULED' | 'SENT'
  scheduledAt:    string | null
  notifiedCount:  number
  createdAt:      string
}

interface Stats { sentThisMonth: number; totalReach: number; scheduled: number }
interface Course { id: string; title: string; _count?: { enrollments: number } }

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  SENT:      'bg-label-success',
  SCHEDULED: 'bg-label-info',
  DRAFT:     'bg-label-secondary',
}
const STATUS_LABEL: Record<string, string> = {
  SENT: 'Sent', SCHEDULED: 'Scheduled', DRAFT: 'Draft',
}

const CHANNEL_ICON:  Record<string, string> = { EMAIL: 'tabler-mail', APP: 'tabler-bell' }
const CHANNEL_COLOR: Record<string, string> = { EMAIL: 'primary',     APP: 'info'        }
const CHANNEL_LABEL: Record<string, string> = { EMAIL: 'Email',       APP: 'In-App'      }

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

// ── Form schema ────────────────────────────────────────────────────────────────

const formSchema = z.object({
  title:          z.string().min(2, 'Required'),
  body:           z.string().min(1, 'Required'),
  audience:       z.enum(['all', 'course']),
  targetCourseId: z.string().nullable().optional(),
  channelEmail:   z.boolean(),
  channelApp:     z.boolean(),
  scheduled:      z.boolean(),
  scheduledAt:    z.string().optional(),
}).refine((d) => d.channelEmail || d.channelApp, {
  message: 'Select at least one channel',
  path:    ['channelEmail'],
})

type FormValues = z.infer<typeof formSchema>

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
  const qc = useQueryClient()

  const [statusFilter, setStatusFilter] = useState('')
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [pageSize]                      = useState(20)
  const [selected,     setSelected]     = useState<Set<string>>(new Set())
  const [showCanvas,   setShowCanvas]   = useState(false)
  const [showModal,    setShowModal]    = useState(false)
  const [pendingForm,  setPendingForm]  = useState<FormValues | null>(null)

  // ── Data ────────────────────────────────────────────────────────────
  const params = new URLSearchParams({
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(search       ? { search }               : {}),
    page:  String(page),
    limit: String(pageSize),
  })

  const { data, isLoading } = useQuery(
    ['announcements', statusFilter, search, page],
    () => api.get(`/admin/announcements?${params}`).then((r) => r.data),
    { keepPreviousData: true },
  )

  const { data: coursesData } = useQuery(
    ['courses-list'],
    () => api.get('/courses?limit=100').then((r) => r.data),
    { staleTime: 60_000 },
  )

  const announcements: Announcement[] = data?.announcements ?? []
  const stats: Stats                  = data?.stats ?? { sentThisMonth: 0, totalReach: 0, scheduled: 0 }
  const total: number                 = data?.total ?? 0
  const courses: Course[]             = coursesData?.courses ?? []
  const totalPages                    = Math.ceil(total / pageSize)

  // ── Form ─────────────────────────────────────────────────────────────
  const {
    register, handleSubmit, watch, control, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      audience:     'all',
      channelEmail: true,
      channelApp:   true,
      scheduled:    false,
    },
  })

  const audience   = watch('audience')
  const scheduled  = watch('scheduled')
  const channelEmail = watch('channelEmail')
  const channelApp   = watch('channelApp')

  // ── Mutations ─────────────────────────────────────────────────────────
  const create = useMutation(
    (payload: any) => api.post('/admin/announcements', payload),
    {
      onSuccess: () => {
        qc.invalidateQueries('announcements')
        setShowCanvas(false)
        setShowModal(false)
        setPendingForm(null)
        reset()
      },
    },
  )

  const sendNow = useMutation(
    (id: string) => api.patch(`/admin/announcements/${id}`, { action: 'send' }),
    { onSuccess: () => qc.invalidateQueries('announcements') },
  )

  const deleteAnn = useMutation(
    (id: string) => api.delete(`/admin/announcements/${id}`),
    { onSuccess: () => qc.invalidateQueries('announcements') },
  )

  // ── Submit handler ────────────────────────────────────────────────────
  const onSubmit = (values: FormValues, submitStatus: 'DRAFT' | 'SCHEDULED' | 'SENT') => {
    if (submitStatus === 'SENT') {
      setPendingForm(values)
      setShowModal(true)
      return
    }
    const channels: string[] = []
    if (values.channelEmail) channels.push('EMAIL')
    if (values.channelApp)   channels.push('APP')

    create.mutate({
      title:          values.title,
      body:           values.body,
      targetRole:     values.audience === 'all' ? 'STUDENT' : null,
      targetCourseId: values.audience === 'course' ? values.targetCourseId : null,
      channels,
      status:         submitStatus,
      scheduledAt:    submitStatus === 'SCHEDULED' && values.scheduledAt ? values.scheduledAt : null,
    })
  }

  const confirmSend = () => {
    if (!pendingForm) return
    const channels: string[] = []
    if (pendingForm.channelEmail) channels.push('EMAIL')
    if (pendingForm.channelApp)   channels.push('APP')

    create.mutate({
      title:          pendingForm.title,
      body:           pendingForm.body,
      targetRole:     pendingForm.audience === 'all' ? 'STUDENT' : null,
      targetCourseId: pendingForm.audience === 'course' ? pendingForm.targetCourseId : null,
      channels,
      status:         'SENT',
    })
  }

  // ── Selection helpers ─────────────────────────────────────────────────
  const allChecked = announcements.length > 0 && announcements.every((a) => selected.has(a.id))
  const toggleAll  = (checked: boolean) =>
    setSelected(checked ? new Set(announcements.map((a) => a.id)) : new Set())
  const toggleOne  = (id: string, checked: boolean) => {
    const ns = new Set(selected); checked ? ns.add(id) : ns.delete(id); setSelected(ns)
  }

  const closeCanvas = () => { setShowCanvas(false); reset(); create.reset() }

  return (
    <AdminLayout title="Announcements" breadcrumb="Home / Announcements">

      {/* ── Stat Cards ──────────────────────────────────────────────── */}
      <div className="row g-6 mb-6">
        {[
          { label: 'Sent This Month', val: isLoading ? '—' : stats.sentThisMonth,            sub: 'Announcements sent',  icon: 'tabler-speakerphone', color: 'primary' },
          { label: 'Total Reach',     val: isLoading ? '—' : stats.totalReach.toLocaleString(), sub: 'Students notified',   icon: 'tabler-users',        color: 'info'    },
          { label: 'Scheduled',       val: isLoading ? '—' : stats.scheduled,                sub: 'Pending send',        icon: 'tabler-clock',        color: 'warning' },
          { label: 'Drafts',          val: isLoading ? '—' : announcements.filter((a) => a.status === 'DRAFT').length, sub: 'Unpublished',  icon: 'tabler-file-text', color: 'secondary' },
        ].map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between">
                  <div className="content-left">
                    <span className="text-heading">{s.label}</span>
                    <div className="d-flex align-items-center my-1">
                      <h4 className="mb-0 me-2">{s.val}</h4>
                    </div>
                    <small className="mb-0 text-body-secondary">{s.sub}</small>
                  </div>
                  <div className="avatar">
                    <span className={`avatar-initial rounded bg-label-${s.color}`}>
                      <i className={`icon-base ti ${s.icon} icon-26px`}></i>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Card ───────────────────────────────────────────────── */}
      <div className="card">

        {/* Filters */}
        <div className="card-header border-bottom">
          <h5 className="card-title mb-0">Filters</h5>
          <div className="row pt-4 gap-4 gap-md-0">
            <div className="col-md-6">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              >
                <option value="">All Status</option>
                <option value="SENT">Sent</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
            <div className="col-md-6">
              {/* placeholder for future audience filter */}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-3 border-bottom py-4">
          <div className="d-flex align-items-center gap-2">
            <label className="mb-0 text-nowrap small">Show</label>
            <select className="form-select form-select-sm" style={{ width: 70 }} defaultValue={20}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <label className="mb-0 text-nowrap small">entries</label>
          </div>
          <div className="d-flex align-items-center flex-wrap gap-2">
            <div className="input-group input-group-sm" style={{ width: 210 }}>
              <span className="input-group-text"><i className="ti tabler-search"></i></span>
              <input
                type="search"
                className="form-control"
                placeholder="Search announcement…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => setShowCanvas(true)}>
              <i className="ti tabler-plus me-1"></i>New Announcement
            </button>
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="px-4 py-2 bg-label-primary d-flex align-items-center gap-3 flex-wrap border-bottom">
            <span className="fw-semibold small">{selected.size} selected</span>
            <button
              className="btn btn-sm btn-outline-primary bg-white"
              onClick={() => {
                selected.forEach((id) => {
                  const a = announcements.find((x) => x.id === id)
                  if (a && a.status !== 'SENT') deleteAnn.mutate(id)
                })
                setSelected(new Set())
              }}
            >
              <i className="ti tabler-trash me-1"></i>Delete
            </button>
          </div>
        )}

        {/* Table */}
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="border-top">
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={allChecked}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th>Announcement</th>
                <th>Channels</th>
                <th>Reach</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}><span className="placeholder col-8"></span></td>
                    ))}
                  </tr>
                ))
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <img src="/img/illustrations/girl-app-academy.png" alt="No announcements" height={120} className="img-fluid mb-3" />
                    <p className="fw-semibold text-heading mb-1">No Announcements Found</p>
                    <p className="text-body-secondary small mb-0">Create an announcement to notify your students.</p>
                  </td>
                </tr>
              ) : (
                announcements.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selected.has(a.id)}
                        onChange={(e) => toggleOne(a.id, e.target.checked)}
                      />
                    </td>

                    {/* Title + audience */}
                    <td>
                      <div className="fw-semibold text-heading mb-1" style={{ maxWidth: 280 }}>{a.title}</div>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        {a.targetCourse ? (
                          <span className="badge bg-label-info" style={{ fontSize: 11 }}>
                            <i className="ti tabler-book me-1" style={{ fontSize: 10 }}></i>
                            {a.targetCourse.title}
                          </span>
                        ) : (
                          <span className="badge bg-label-primary" style={{ fontSize: 11 }}>
                            <i className="ti tabler-users me-1" style={{ fontSize: 10 }}></i>
                            All Students
                          </span>
                        )}
                        <small className="text-body-secondary">
                          {a.status === 'SCHEDULED' && a.scheduledAt
                            ? `Scheduled: ${fmtDate(a.scheduledAt)}`
                            : a.status === 'SENT'
                            ? fmtDate(a.createdAt)
                            : 'Draft'}
                        </small>
                      </div>
                    </td>

                    {/* Channels */}
                    <td>
                      <div className="d-flex gap-1">
                        {(a.channels as string[]).map((ch) => (
                          <span key={ch} className={`badge bg-label-${CHANNEL_COLOR[ch]} d-flex align-items-center gap-1`} style={{ fontSize: 11 }}>
                            <i className={`ti ${CHANNEL_ICON[ch]}`} style={{ fontSize: 10 }}></i>
                            {CHANNEL_LABEL[ch]}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Reach */}
                    <td>
                      {a.status === 'SENT' ? (
                        <div className="d-flex align-items-center gap-1">
                          <i className="ti tabler-users text-primary" style={{ fontSize: 13 }}></i>
                          <span className="fw-semibold text-heading">{a.notifiedCount.toLocaleString('en-IN')}</span>
                        </div>
                      ) : (
                        <small className="text-body-secondary">—</small>
                      )}
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`badge ${STATUS_BADGE[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="dropdown">
                        <button
                          className="btn btn-sm btn-icon btn-text-secondary rounded-pill dropdown-toggle hide-arrow"
                          data-bs-toggle="dropdown"
                        >
                          <i className="ti tabler-dots-vertical"></i>
                        </button>
                        <div className="dropdown-menu dropdown-menu-end">
                          {a.status === 'DRAFT' && (
                            <>
                              <button
                                className="dropdown-item text-primary"
                                onClick={() => sendNow.mutate(a.id)}
                              >
                                <i className="ti tabler-speakerphone me-2"></i>Send Now
                              </button>
                              <div className="dropdown-divider"></div>
                            </>
                          )}
                          <button
                            className="dropdown-item text-danger"
                            onClick={() => deleteAnn.mutate(a.id)}
                          >
                            <i className="ti tabler-trash me-2"></i>Delete
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="card-footer d-flex flex-wrap justify-content-between align-items-center gap-3 py-3">
          <small className="text-body-secondary">
            Showing {announcements.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} announcements
          </small>
          {totalPages > 1 && (
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(page - 1)}>‹</button>
                </li>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                  return (
                    <li key={p} className={`page-item ${page === p ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                    </li>
                  )
                })}
                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(page + 1)}>›</button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>

      {/* ── New Announcement Offcanvas ───────────────────────────────── */}
      {showCanvas && (
        <>
          <div className="offcanvas offcanvas-end show" style={{ visibility: 'visible', width: 440 }}>
            <div className="offcanvas-header border-bottom">
              <h5 className="offcanvas-title">
                <i className="ti tabler-speakerphone me-2 text-primary"></i>New Announcement
              </h5>
              <button type="button" className="btn-close" onClick={closeCanvas} />
            </div>
            <div className="offcanvas-body p-4">
              <p className="text-body-secondary mb-4">Compose and send an announcement to your students.</p>

              {create.isError && (
                <div className="alert alert-danger py-2 small mb-4">Something went wrong. Please try again.</div>
              )}

              <form noValidate>

                {/* Audience */}
                <div className="mb-4">
                  <label className="form-label fw-medium">Audience</label>
                  <div className="d-flex flex-column gap-2">
                    {([
                      ['all',    'tabler-users', 'All Students',    'Everyone in your institute'],
                      ['course', 'tabler-book',  'Specific Course', 'Students enrolled in a course'],
                    ] as const).map(([val, icon, label, sub]) => (
                      <label
                        key={val}
                        className={`d-flex align-items-center gap-3 p-3 rounded border${audience === val ? ' border-primary bg-label-primary' : ''}`}
                        style={{ cursor: 'pointer' }}
                      >
                        <input
                          type="radio"
                          className="form-check-input mt-0 flex-shrink-0"
                          value={val}
                          {...register('audience')}
                        />
                        <div className="avatar avatar-sm flex-shrink-0">
                          <span className={`avatar-initial rounded bg-label-${audience === val ? 'primary' : 'secondary'}`}>
                            <i className={`ti ${icon}`} style={{ fontSize: 14 }}></i>
                          </span>
                        </div>
                        <div>
                          <div className={`small fw-semibold${audience === val ? ' text-primary' : ' text-heading'}`}>{label}</div>
                          <small className="text-body-secondary">{sub}</small>
                        </div>
                      </label>
                    ))}
                  </div>
                  {audience === 'course' && (
                    <select className="form-select mt-2" {...register('targetCourseId')}>
                      <option value="">— Select course —</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Title */}
                <div className="mb-4">
                  <label className="form-label fw-medium">Title <span className="text-danger">*</span></label>
                  <input
                    className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                    placeholder="e.g. April Live Class Update"
                    {...register('title')}
                  />
                  {errors.title && <div className="invalid-feedback">{errors.title.message}</div>}
                </div>

                {/* Message */}
                <div className="mb-4">
                  <label className="form-label fw-medium">Message <span className="text-danger">*</span></label>
                  <textarea
                    rows={5}
                    className={`form-control ${errors.body ? 'is-invalid' : ''}`}
                    placeholder="Write your announcement here…"
                    {...register('body')}
                  />
                  {errors.body && <div className="invalid-feedback">{errors.body.message}</div>}
                </div>

                {/* Delivery channels */}
                <div className="mb-4">
                  <label className="form-label fw-medium">Delivery Channels</label>
                  <div className="d-flex gap-2">
                    {([
                      ['channelEmail', 'tabler-mail', 'Email',  'primary', 'EMAIL'],
                      ['channelApp',   'tabler-bell', 'In-App', 'info',    'APP'],
                    ] as const).map(([field, icon, label, color]) => (
                      <label
                        key={field}
                        className={`d-flex align-items-center gap-2 px-3 py-2 rounded border flex-grow-1${
                          (field === 'channelEmail' ? channelEmail : channelApp)
                            ? ` border-${color} bg-label-${color}`
                            : ''
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        <input type="checkbox" className="form-check-input mt-0" {...register(field)} />
                        <i className={`ti ${icon} text-${color}`} style={{ fontSize: 15 }}></i>
                        <small className="fw-medium">{label}</small>
                      </label>
                    ))}
                  </div>
                  {errors.channelEmail && (
                    <div className="text-danger small mt-1">{errors.channelEmail.message}</div>
                  )}
                </div>

                {/* Schedule toggle */}
                <div className="d-flex align-items-center justify-content-between py-3 border-top border-bottom mb-4">
                  <div>
                    <div className="fw-semibold small">Schedule for Later</div>
                    <small className="text-body-secondary">Send at a specific date and time</small>
                  </div>
                  <div className="form-check form-switch mb-0">
                    <input className="form-check-input" type="checkbox" {...register('scheduled')} />
                  </div>
                </div>
                {scheduled && (
                  <div className="mb-4">
                    <label className="form-label fw-medium">Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      {...register('scheduledAt')}
                    />
                  </div>
                )}

                <div className="d-flex gap-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={isSubmitting || create.isLoading}
                    onClick={handleSubmit((v) => onSubmit(v, 'DRAFT'))}
                  >
                    <i className="ti tabler-device-floppy me-1"></i>Save Draft
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary flex-grow-1"
                    disabled={isSubmitting || create.isLoading}
                    onClick={handleSubmit((v) => onSubmit(v, scheduled ? 'SCHEDULED' : 'SENT'))}
                  >
                    {(isSubmitting || create.isLoading) && (
                      <span className="spinner-border spinner-border-sm me-2" />
                    )}
                    <i className={`ti ${scheduled ? 'tabler-calendar' : 'tabler-speakerphone'} me-1`}></i>
                    {scheduled ? 'Schedule' : 'Send Now'}
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="offcanvas-backdrop fade show" onClick={closeCanvas}></div>
        </>
      )}

      {/* ── Confirm Send Modal ───────────────────────────────────────── */}
      {showModal && pendingForm && (
        <>
          <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-body text-center p-6">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-4"
                    style={{ width: 72, height: 72, background: '#7367F015' }}
                  >
                    <i className="ti tabler-speakerphone" style={{ fontSize: 34, color: '#7367F0' }}></i>
                  </div>
                  <h4 className="fw-bold mb-2">Confirm Announcement</h4>
                  <p className="text-body-secondary mb-3">You are about to send this announcement to:</p>
                  <h3 className="fw-bold text-primary mb-2">
                    {pendingForm.audience === 'all' ? 'All Students' : (
                      courses.find((c) => c.id === pendingForm.targetCourseId)?.title ?? 'Selected Course'
                    )}
                  </h3>
                  <div className="d-flex justify-content-center gap-2 mb-3">
                    {pendingForm.channelEmail && (
                      <span className="badge bg-label-primary d-flex align-items-center gap-1">
                        <i className="ti tabler-mail" style={{ fontSize: 11 }}></i>Email
                      </span>
                    )}
                    {pendingForm.channelApp && (
                      <span className="badge bg-label-info d-flex align-items-center gap-1">
                        <i className="ti tabler-bell" style={{ fontSize: 11 }}></i>In-App
                      </span>
                    )}
                  </div>
                  <small className="text-body-secondary">This action cannot be undone once sent.</small>
                </div>
                <div className="modal-footer gap-2">
                  <button
                    className="btn btn-outline-secondary flex-grow-1"
                    onClick={() => { setShowModal(false); setPendingForm(null) }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary flex-grow-1"
                    onClick={confirmSend}
                    disabled={create.isLoading}
                  >
                    {create.isLoading && <span className="spinner-border spinner-border-sm me-2" />}
                    <i className="ti tabler-check me-1"></i>Confirm &amp; Send
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

    </AdminLayout>
  )
}
