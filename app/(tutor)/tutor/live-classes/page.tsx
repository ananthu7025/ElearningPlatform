'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import TutorLayout from '@/components/layouts/TutorLayout'
import api from '@/lib/api'

const scheduleSchema = z.object({
  title:       z.string().min(3, 'Required'),
  courseId:    z.string().uuid('Select a course'),
  scheduledAt: z.string().min(1, 'Select date and time'),
  duration:    z.coerce.number().int().positive(),
})
type ScheduleForm = z.infer<typeof scheduleSchema>

const COURSE_COLORS: Record<string, { color: string; hex: string }> = {}
const PALETTE = [
  { color: 'primary', hex: '#7367F0' },
  { color: 'success', hex: '#28C76F' },
  { color: 'danger',  hex: '#FF4C51' },
  { color: 'info',    hex: '#00CFE8' },
  { color: 'warning', hex: '#FF9F43' },
]
function getCourseColor(courseId: string) {
  if (!COURSE_COLORS[courseId]) {
    const idx = Object.keys(COURSE_COLORS).length % PALETTE.length
    COURSE_COLORS[courseId] = PALETTE[idx]
  }
  return COURSE_COLORS[courseId]
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function fmtDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtTime(date: string) {
  return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

// Build calendar events from live classes
function buildCalendarEvents(liveClasses: any[]) {
  const events: Record<number, { label: string; color: string }[]> = {}
  const now = new Date()
  liveClasses.forEach((lc: any) => {
    const d = new Date(lc.scheduledAt)
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
      const day = d.getDate()
      const cm  = getCourseColor(lc.courseId)
      if (!events[day]) events[day] = []
      events[day].push({
        label: `${fmtTime(lc.scheduledAt)} ${lc.course?.title ?? lc.title}`,
        color: cm.color,
      })
    }
  })
  return events
}

export default function TutorLiveClassesPage() {
  const qc = useQueryClient()
  const [view,         setView]         = useState<'cards' | 'calendar'>('cards')
  const [showSchedule, setShowSchedule] = useState(false)
  const [courseFilter, setCourseFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [search,       setSearch]       = useState('')

  const { data, isLoading } = useQuery('tutorLiveAll', () =>
    api.get('/live-classes').then((r) => r.data)
  )
  const { data: coursesData } = useQuery('tutorCourses', () =>
    api.get('/courses?limit=50').then((r) => r.data)
  )

  const schedule = useMutation(
    (d: ScheduleForm) => api.post('/live-classes', { ...d, scheduledAt: new Date(d.scheduledAt).toISOString() }),
    {
      onSuccess: () => { qc.invalidateQueries('tutorLiveAll'); setShowSchedule(false); reset() },
    }
  )
  const cancel = useMutation(
    (id: string) => api.delete(`/live-classes/${id}`),
    { onSuccess: () => qc.invalidateQueries('tutorLiveAll') }
  )

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
  })

  const allClasses: any[] = data?.liveClasses ?? []
  const courses:    any[] = coursesData?.courses ?? []

  const liveNow   = allClasses.filter((lc) => lc.status === 'live')
  const upcoming  = allClasses.filter((lc) => lc.status === 'scheduled' && new Date(lc.scheduledAt) > new Date())
  const completed = allClasses.filter((lc) => lc.status === 'ended'     || new Date(lc.scheduledAt) <= new Date())

  // Filtered for cards view
  const filtered = allClasses.filter((lc) => {
    if (courseFilter !== 'All' && lc.course?.id !== courseFilter) return false
    if (statusFilter !== 'All') {
      const s = lc.status === 'live' ? 'Live' : lc.status === 'ended' ? 'Completed' : new Date(lc.scheduledAt) > new Date() ? 'Upcoming' : 'Completed'
      if (s !== statusFilter) return false
    }
    if (search && !lc.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const filteredLive      = filtered.filter((lc) => lc.status === 'live')
  const filteredUpcoming  = filtered.filter((lc) => lc.status === 'scheduled' && new Date(lc.scheduledAt) > new Date())
  const filteredCompleted = filtered.filter((lc) => lc.status === 'ended' || (lc.status !== 'live' && new Date(lc.scheduledAt) <= new Date()))

  // Calendar
  const calEvents = buildCalendarEvents(allClasses)
  const now = new Date()
  const calYear  = now.getFullYear()
  const calMonth = now.getMonth()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDay    = new Date(calYear, calMonth, 1).getDay()
  const monthLabel  = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <TutorLayout title="Live Classes" breadcrumb="Home / Live Classes">

      {/* ── Stat Cards ── */}
      <div className="row g-6 mb-6">
        {[
          { label: 'Scheduled',  val: upcoming.length,  sub: 'Upcoming sessions', icon: 'tabler-calendar',     color: 'primary' },
          { label: 'Live Now',   val: liveNow.length,   sub: 'In progress',       icon: 'tabler-radio',        color: 'danger'  },
          { label: 'Upcoming',   val: upcoming.length,  sub: 'Next 7 days',       icon: 'tabler-clock',        color: 'info'    },
          { label: 'Completed',  val: completed.length, sub: 'This session',      icon: 'tabler-circle-check', color: 'success' },
        ].map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between">
                  <div className="content-left">
                    <span className="text-heading">{s.label}</span>
                    <div className="d-flex align-items-center my-1">
                      <h4 className="mb-0 me-2">{isLoading ? '—' : String(s.val)}</h4>
                    </div>
                    <small className="mb-0 text-body-secondary">{s.sub}</small>
                  </div>
                  <div className="avatar">
                    <span className={`avatar-initial rounded bg-label-${s.color}`}>
                      <i className={`icon-base ti ${s.icon} icon-26px`} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-5">
        <div className="d-flex flex-wrap gap-2">
          <select className="form-select form-select-sm" style={{ width: 200 }} value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option value="All">All Courses</option>
            {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select className="form-select form-select-sm" style={{ width: 140 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option>Live</option>
            <option>Upcoming</option>
            <option>Completed</option>
          </select>
          <div className="input-group input-group-sm" style={{ width: 210 }}>
            <span className="input-group-text"><i className="ti tabler-search" /></span>
            <input type="search" className="form-control" placeholder="Search class..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="d-flex gap-2">
          <div className="btn-group btn-group-sm">
            <button className={`btn btn-icon btn-outline-secondary${view === 'cards' ? ' active' : ''}`} onClick={() => setView('cards')} title="Cards">
              <i className="ti tabler-layout-grid" />
            </button>
            <button className={`btn btn-icon btn-outline-secondary${view === 'calendar' ? ' active' : ''}`} onClick={() => setView('calendar')} title="Calendar">
              <i className="ti tabler-calendar" />
            </button>
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => setShowSchedule(true)}>
            <i className="ti tabler-plus me-1" />Schedule Class
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-6"><div className="spinner-border text-primary" /></div>
      )}

      {/* ═══ CARDS VIEW ═══ */}
      {!isLoading && view === 'cards' && (
        <>
          {/* Live Now hero */}
          {filteredLive.length > 0 && (
            <div className="mb-6">
              <div className="d-flex align-items-center gap-2 mb-4">
                <span className="live-dot rounded-circle bg-danger d-inline-block" />
                <h6 className="fw-bold mb-0">Live Now</h6>
                <span className="badge bg-label-danger">{filteredLive.length}</span>
              </div>
              {filteredLive.map((lc: any) => {
                const cm = getCourseColor(lc.courseId)
                return (
                  <div key={lc.id} className="card p-0 mb-4 overflow-hidden">
                    <div className="card-body p-5" style={{ background: 'linear-gradient(135deg, #7367F0 0%, #9E95F5 100%)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: -40,  right: -40,  width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', bottom: -60, right: 100, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                      <div className="row align-items-center g-4 position-relative">
                        <div className="col-12 col-md">
                          <div className="d-flex align-items-center gap-2 mb-3">
                            <span className="live-dot rounded-circle bg-white d-inline-block" />
                            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Live Now</span>
                          </div>
                          <h4 className="fw-bold mb-1 text-white">{lc.title}</h4>
                          <p className="mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>{lc.course?.title}</p>
                          <div className="d-flex flex-wrap gap-2 mb-4">
                            {[
                              ['tabler-calendar', fmtDate(lc.scheduledAt)],
                              ['tabler-clock',    fmtTime(lc.scheduledAt)],
                              ['tabler-hourglass', `${lc.durationMinutes} min`],
                            ].map(([icon, val]) => (
                              <span key={val} className="d-flex align-items-center gap-1 rounded-pill px-3 py-1 small fw-medium" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12 }}>
                                <i className={`ti ${icon}`} style={{ fontSize: 12 }} />{val}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="col-12 col-md-auto d-flex flex-row flex-md-column align-items-center align-items-md-end gap-3">
                          <a href={`/tutor/live-classes/${lc.id}/start`} className="btn fw-semibold d-flex align-items-center gap-2" style={{ background: '#fff', color: '#7367F0', minWidth: 130, justifyContent: 'center' }}>
                            <i className="ti tabler-player-play" />Start Class
                          </a>
                          <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }} onClick={() => cancel.mutate(lc.id)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Upcoming */}
          {filteredUpcoming.length > 0 && (
            <div className="mb-6">
              <div className="d-flex align-items-center gap-2 mb-4">
                <i className="ti tabler-clock text-info" />
                <h6 className="fw-bold mb-0">Upcoming</h6>
                <span className="badge bg-label-info">{filteredUpcoming.length}</span>
              </div>
              <div className="row gy-6">
                {filteredUpcoming.map((lc: any) => {
                  const cm = getCourseColor(lc.courseId)
                  return (
                    <div key={lc.id} className="col-sm-6 col-xl-3">
                      <div className="card p-2 h-100 shadow-none border">
                        <div className="rounded-2 d-flex align-items-center justify-content-center overflow-hidden position-relative mb-3" style={{ height: 110, background: `${cm.hex}12` }}>
                          <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: 52, height: 52, background: `${cm.hex}22` }}>
                            <i className="ti tabler-video" style={{ fontSize: 26, color: cm.hex }} />
                          </div>
                          <span className={`badge bg-label-${cm.color} position-absolute`} style={{ top: 10, right: 10, fontSize: 11 }}>
                            {lc.course?.title?.split(' ').slice(0, 2).join(' ')}
                          </span>
                        </div>
                        <div className="card-body p-2 pt-0">
                          <h6 className="fw-bold mb-3 text-heading" style={{ lineHeight: 1.4 }}>{lc.title}</h6>
                          <div className="d-flex flex-wrap gap-1 mb-3">
                            {[
                              ['tabler-calendar', fmtDate(lc.scheduledAt)],
                              ['tabler-clock',    fmtTime(lc.scheduledAt)],
                              ['tabler-hourglass', `${lc.durationMinutes} min`],
                            ].map(([icon, val]) => (
                              <span key={val} className="badge bg-label-secondary d-flex align-items-center gap-1" style={{ fontSize: 11 }}>
                                <i className={`ti ${icon}`} style={{ fontSize: 10 }} />{val}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="card-footer border-top p-2 d-flex gap-2">
                          <a href={`/tutor/live-classes/${lc.id}/start`} className={`btn btn-sm btn-label-${cm.color} flex-grow-1`}>
                            <i className="ti tabler-player-play icon-xs me-1" />Start
                          </a>
                          <button className="btn btn-sm btn-label-secondary" onClick={() => cancel.mutate(lc.id)}>
                            <i className="ti tabler-x icon-xs" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Completed */}
          {filteredCompleted.length > 0 && (
            <div>
              <div className="d-flex align-items-center gap-2 mb-4">
                <i className="ti tabler-circle-check text-success" />
                <h6 className="fw-bold mb-0">Completed</h6>
                <span className="badge bg-label-success">{filteredCompleted.length}</span>
              </div>
              <div className="row gy-4">
                {filteredCompleted.map((lc: any) => {
                  const cm = getCourseColor(lc.courseId)
                  return (
                    <div key={lc.id} className="col-sm-6 col-xl-3">
                      <div className="card p-2 h-100 shadow-none border overflow-hidden">
                        <div style={{ height: 3, background: `linear-gradient(90deg, ${cm.hex}, ${cm.hex}55)`, borderRadius: '4px 4px 0 0', margin: '-8px -8px 12px -8px' }} />
                        <div className="card-body p-2">
                          <div className="d-flex align-items-start justify-content-between mb-2">
                            <span className={`badge bg-label-${cm.color}`} style={{ fontSize: 11 }}>
                              {lc.course?.title?.split(' ').slice(0, 2).join(' ')}
                            </span>
                          </div>
                          <h6 className="fw-semibold text-heading mb-2" style={{ fontSize: 13, lineHeight: 1.4 }}>{lc.title}</h6>
                          <div className="d-flex align-items-center gap-2 mb-3 text-body-secondary" style={{ fontSize: 12 }}>
                            <i className="ti tabler-calendar" style={{ fontSize: 12 }} />
                            <span>{fmtDate(lc.scheduledAt)}</span>
                            <span>·</span>
                            <span>{lc.durationMinutes} min</span>
                          </div>
                        </div>
                        <div className="card-footer border-top p-2">
                          {lc.recordingUrl
                            ? <a href={lc.recordingUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-label-secondary w-100"><i className="ti tabler-video icon-xs me-1" />View Recording</a>
                            : <button className="btn btn-sm btn-label-secondary w-100" disabled><i className="ti tabler-video-off icon-xs me-1" />No Recording</button>
                          }
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-6">
              <div className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3" style={{ width: 72, height: 72, background: '#7367F015' }}>
                <i className="ti tabler-video-off" style={{ fontSize: 32, color: '#7367F0' }} />
              </div>
              <p className="text-body-secondary">No classes found for the selected filters.</p>
            </div>
          )}
        </>
      )}

      {/* ═══ CALENDAR VIEW ═══ */}
      {!isLoading && view === 'calendar' && (
        <div className="card">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold mb-0">{monthLabel}</h5>
              <button className="btn btn-sm btn-outline-primary">Today</button>
            </div>
            <div className="row g-1 mb-1">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                <div key={d} className="col text-center py-2">
                  <small className="fw-bold text-body-secondary text-uppercase">{d}</small>
                </div>
              ))}
            </div>
            <div className="row g-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`pre${i}`} className="col" style={{ minHeight: 90 }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day    = i + 1
                const events = calEvents[day] ?? []
                const isToday = day === now.getDate()
                return (
                  <div key={day} className={`col rounded border p-1${events.length ? ' border-primary' : ''}`} style={{ minHeight: 90, background: isToday ? '#7367F010' : undefined }}>
                    <small className={`fw-bold d-block mb-1${isToday ? ' text-primary' : ' text-body-secondary'}`}>{day}</small>
                    {events.map((ev, j) => (
                      <div key={j} className={`badge bg-label-${ev.color} w-100 text-truncate d-block mb-1`} style={{ fontSize: 9 }} title={ev.label}>
                        {ev.label}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
            <div className="d-flex flex-wrap gap-3 mt-4 pt-3 border-top">
              {courses.slice(0, 4).map((c: any) => {
                const cm = getCourseColor(c.id)
                return (
                  <div key={c.id} className="d-flex align-items-center gap-2">
                    <span className={`badge bg-label-${cm.color} rounded-pill`} style={{ width: 10, height: 10, padding: 0 }} />
                    <small className="text-body-secondary">{c.title.split(' ').slice(0, 3).join(' ')}</small>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule Modal ── */}
      {showSchedule && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Schedule Live Class</h5>
                <button type="button" className="btn-close" onClick={() => { setShowSchedule(false); reset() }} />
              </div>
              <form onSubmit={handleSubmit((d) => schedule.mutate(d))} noValidate>
                <div className="modal-body">
                  <div className="row g-4">
                    <div className="col-12">
                      <label className="form-label">Title</label>
                      <input className={`form-control ${errors.title ? 'is-invalid' : ''}`} {...register('title')} placeholder="e.g. CLAT Mock Discussion" />
                      {errors.title && <div className="invalid-feedback">{errors.title.message}</div>}
                    </div>
                    <div className="col-12">
                      <label className="form-label">Course</label>
                      <select className={`form-select ${errors.courseId ? 'is-invalid' : ''}`} {...register('courseId')}>
                        <option value="">Select a course…</option>
                        {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                      {errors.courseId && <div className="invalid-feedback">{errors.courseId.message}</div>}
                    </div>
                    <div className="col-md-7">
                      <label className="form-label">Date &amp; Time</label>
                      <input type="datetime-local" className={`form-control ${errors.scheduledAt ? 'is-invalid' : ''}`} {...register('scheduledAt')} />
                      {errors.scheduledAt && <div className="invalid-feedback">{errors.scheduledAt.message}</div>}
                    </div>
                    <div className="col-md-5">
                      <label className="form-label">Duration (min)</label>
                      <input type="number" className="form-control" defaultValue={60} {...register('duration')} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-label-secondary" onClick={() => { setShowSchedule(false); reset() }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting && <span className="spinner-border spinner-border-sm me-2" />}
                    Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .live-dot {
          width: 8px; height: 8px; flex-shrink: 0;
          animation: livePulse 1.4s ease-in-out infinite;
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1;  transform: scale(1);   }
          50%       { opacity: .4; transform: scale(1.6); }
        }
      `}</style>

    </TutorLayout>
  )
}
