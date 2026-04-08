'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import TutorLayout from '@/components/layouts/TutorLayout'
import api from '@/lib/api'

const AVATAR_COLORS = ['bg-label-primary','bg-label-success','bg-label-info','bg-label-warning','bg-label-danger']

function avatarColor(name: string) {
  const colors = ['primary', 'success', 'info', 'warning', 'danger']
  let hash = 0
  for (const ch of (name ?? '')) hash = (hash + ch.charCodeAt(0)) % colors.length
  return colors[hash]
}

function getInitials(name: string) {
  return (name ?? '?').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 1)   return `${Math.floor(diff / 60000)} min ago`
  if (hrs < 24)  return `${hrs} hr${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export default function DoubtsPage() {
  const qc = useQueryClient()
  const [expandedId,   setExpandedId]   = useState<string | null>(null)
  const [replyText,    setReplyText]    = useState<Record<string, string>>({})
  const [courseFilter, setCourseFilter] = useState('All')
  const [lessonFilter, setLessonFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('Unanswered')
  const [search,       setSearch]       = useState('')

  const { data: pendingData, isLoading: pendingLoading } = useQuery(
    'doubtsPending',
    () => api.get('/doubts?resolved=false').then((r) => r.data)
  )
  const { data: resolvedData } = useQuery(
    'doubtsResolved',
    () => api.get('/doubts?resolved=true').then((r) => r.data)
  )

  const answerMutation = useMutation(
    ({ id, answer }: { id: string; answer: string }) =>
      api.put(`/doubts/${id}/answer`, { answer }),
    {
      onSuccess: () => {
        qc.invalidateQueries('doubtsPending')
        qc.invalidateQueries('doubtsResolved')
      },
    }
  )

  const resolveMutation = useMutation(
    (id: string) => api.put(`/doubts/${id}/resolve`),
    {
      onSuccess: () => {
        qc.invalidateQueries('doubtsPending')
        qc.invalidateQueries('doubtsResolved')
      },
    }
  )

  const pendingDoubts:  any[] = pendingData?.doubts  ?? []
  const resolvedDoubts: any[] = resolvedData?.doubts ?? []
  const allDoubts = [...pendingDoubts, ...resolvedDoubts]

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const answeredThisWeek = resolvedDoubts.filter((d: any) => d.answeredAt && new Date(d.answeredAt) >= sevenDaysAgo).length
  const thisMonthStart   = new Date(); thisMonthStart.setDate(1); thisMonthStart.setHours(0, 0, 0, 0)
  const totalThisMonth   = allDoubts.filter((d: any) => new Date(d.createdAt) >= thisMonthStart).length

  // Filter options
  const courses = [...new Set(allDoubts.map((d: any) => d.lesson?.module?.course?.title).filter(Boolean))] as string[]
  const lessons = [...new Set(allDoubts.filter((d: any) => courseFilter === 'All' || d.lesson?.module?.course?.title === courseFilter).map((d: any) => d.lesson?.title).filter(Boolean))] as string[]

  const sourceList = statusFilter === 'Unanswered' ? pendingDoubts : statusFilter === 'Answered' ? resolvedDoubts : allDoubts

  const filtered = sourceList.filter((d: any) => {
    if (courseFilter !== 'All' && d.lesson?.module?.course?.title !== courseFilter) return false
    if (lessonFilter !== 'All' && d.lesson?.title !== lessonFilter) return false
    if (search && !d.question.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <TutorLayout title="Student Doubts" breadcrumb="Home / Student Doubts">

      {/* ── Stat Cards ── */}
      <div className="row g-6 mb-6">
        {[
          { icon: 'tabler-help-circle',  label: 'Pending Doubts',     value: pendingLoading ? '—' : String(pendingDoubts.length), sub: 'Needs reply',   color: 'bg-label-warning', iconColor: '#FF9F43' },
          { icon: 'tabler-circle-check', label: 'Answered This Week', value: String(answeredThisWeek),                             sub: 'Last 7 days',   color: 'bg-label-success', iconColor: '#28C76F' },
          { icon: 'tabler-clock',        label: 'Avg Response Time',  value: '—',                                                  sub: 'No data',       color: 'bg-label-info',    iconColor: '#00CFE8' },
          { icon: 'tabler-messages',     label: 'Total This Month',   value: String(totalThisMonth),                               sub: 'All doubts',    color: 'bg-label-primary', iconColor: '#7367F0' },
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

      {/* ── Filters ── */}
      <div className="row g-3 mb-4 align-items-center">
        <div className="col-md-3">
          <select className="form-select" value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setLessonFilter('All') }}>
            <option value="All">All Courses</option>
            {courses.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <select className="form-select" value={lessonFilter} onChange={(e) => setLessonFilter(e.target.value)}>
            <option value="All">All Lessons</option>
            {lessons.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Unanswered">Unanswered</option>
            <option value="Answered">Answered</option>
          </select>
        </div>
        <div className="col-md-4">
          <div className="input-group input-group-merge">
            <span className="input-group-text"><i className="ti tabler-search" /></span>
            <input className="form-control" placeholder="Search doubts..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Doubt Cards ── */}
      {pendingLoading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-5 text-body-secondary">
          <i className="ti tabler-check mb-2" style={{ fontSize: 36 }} />
          <p className="mb-0">No doubts found!</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {filtered.map((d: any) => {
            const isOpen   = expandedId === d.id
            const color    = avatarColor(d.student?.name ?? '')
            const resolved = d.isResolved

            return (
              <div key={d.id} className={`card ${isOpen ? 'border-primary shadow-sm' : ''}`}>
                <div className="card-body cursor-pointer py-4" onClick={() => setExpandedId(isOpen ? null : d.id)}>
                  <div className="d-flex gap-3 align-items-center">
                    <div className="avatar avatar-md flex-shrink-0">
                      <span className={`avatar-initial rounded-circle fw-bold bg-label-${color}`}>
                        {getInitials(d.student?.name ?? '?')}
                      </span>
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                        <h6 className="mb-0 fw-bold">{d.student?.name}</h6>
                        <span className={`badge bg-label-${resolved ? 'success' : 'warning'} small`}>
                          {resolved ? 'Answered' : 'Unanswered'}
                        </span>
                      </div>
                      <p className="text-heading small mb-1 fw-semibold lh-base">{d.question}</p>
                      <small className="text-body-secondary">
                        {d.lesson?.module?.course?.title && <><i className="ti tabler-book me-1 small" />{d.lesson.module.course.title} · </>}
                        {d.lesson?.title && <>{d.lesson.title}<span className="mx-2">·</span></>}
                        <i className="ti tabler-calendar-event me-1 small" />{timeAgo(d.createdAt)}
                      </small>
                    </div>
                    <i className={`ti tabler-chevron-${isOpen ? 'up' : 'down'} text-primary flex-shrink-0`} />
                  </div>
                </div>

                {isOpen && (
                  <div className="border-top p-4" style={{ borderTop: '3px solid #7367F0' }}>
                    <div className="row g-4 text-wrap">

                      {/* Left — Question */}
                      <div className="col-lg-5">
                        <div className="d-flex align-items-center gap-2 mb-3">
                          <div className="badge bg-label-primary rounded p-1_5">
                            <i className="ti tabler-help-circle icon-md" />
                          </div>
                          <span className="fw-bold small text-uppercase text-body-secondary">Student&apos;s Question</span>
                        </div>
                        <div className="d-flex align-items-center gap-3 mb-3 bg-white rounded p-3 shadow-sm">
                          <div className="avatar avatar-md flex-shrink-0">
                            <span className={`avatar-initial rounded-circle fw-bold bg-label-${color}`}>
                              {getInitials(d.student?.name ?? '?')}
                            </span>
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-0 fw-bold">{d.student?.name}</h6>
                            <small className="text-body-secondary">
                              {d.lesson?.module?.course?.title && <><i className="ti tabler-book me-1" />{d.lesson.module.course.title}</>}
                            </small>
                          </div>
                          <span className={`badge bg-label-${resolved ? 'success' : 'warning'}`}>
                            {resolved ? 'Answered' : 'Unanswered'}
                          </span>
                        </div>
                        <div className="rounded p-3 mb-3 small lh-base shadow-sm" style={{ background: '#fff', borderLeft: '4px solid #7367F0' }}>
                          <i className="ti tabler-quote fs-3 text-primary d-block mb-2" style={{ opacity: 0.4 }} />
                          <p className="mb-0 fw-semibold text-heading">{d.question}</p>
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {d.lesson?.title && (
                            <span className="badge bg-label-info rounded-pill">
                              <i className="ti tabler-book-2 me-1" />{d.lesson.title}
                            </span>
                          )}
                          <span className="badge bg-label-warning rounded-pill">
                            <i className="ti tabler-clock me-1" />{timeAgo(d.createdAt)}
                          </span>
                        </div>
                        {d.answer && (
                          <div className="mt-3 bg-body-tertiary rounded p-3">
                            <small className="text-body-secondary fw-semibold d-block mb-1">Your previous answer:</small>
                            <small>{d.answer}</small>
                          </div>
                        )}
                      </div>

                      {/* Right — Reply */}
                      <div className="col-lg-7">
                        <div className="d-flex align-items-center gap-2 mb-3">
                          <div className="badge bg-label-success rounded p-1_5">
                            <i className="ti tabler-message-2 icon-md" />
                          </div>
                          <span className="fw-bold small text-uppercase text-body-secondary">Your Reply</span>
                        </div>
                        <div className="rounded overflow-hidden mb-3 shadow-sm" style={{ border: '1px solid #e0deff' }}>
                          <div className="d-flex gap-1 p-2 border-bottom" style={{ background: '#f8f8fb' }}>
                            {['tabler-bold', 'tabler-italic', 'tabler-underline', 'tabler-link', 'tabler-photo'].map((icon) => (
                              <button key={icon} type="button" className="btn btn-sm btn-icon btn-text-secondary rounded">
                                <i className={`ti ${icon} fs-5`} />
                              </button>
                            ))}
                          </div>
                          <textarea
                            className="form-control border-0 rounded-0 p-3 small bg-white"
                            rows={6}
                            placeholder="Type your answer here..."
                            value={replyText[d.id] ?? (d.answer ?? '')}
                            onChange={(e) => setReplyText((prev) => ({ ...prev, [d.id]: e.target.value }))}
                          />
                        </div>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-primary flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                            disabled={answerMutation.isLoading}
                            onClick={() => {
                              const text = replyText[d.id] ?? d.answer ?? ''
                              if (text.trim().length < 5) return
                              answerMutation.mutate({ id: d.id, answer: text })
                            }}
                          >
                            {answerMutation.isLoading ? <span className="spinner-border spinner-border-sm" /> : <i className="ti tabler-send fs-5" />}
                            Submit Reply
                          </button>
                          {!resolved && (
                            <button
                              className="btn btn-label-success d-flex align-items-center gap-2"
                              disabled={resolveMutation.isLoading}
                              onClick={() => resolveMutation.mutate(d.id)}
                            >
                              <i className="ti tabler-circle-check fs-5" />Mark Resolved
                            </button>
                          )}
                          <button type="button" className="btn btn-outline-secondary" title="Save Draft">
                            <i className="ti tabler-device-floppy" />
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

    </TutorLayout>
  )
}
