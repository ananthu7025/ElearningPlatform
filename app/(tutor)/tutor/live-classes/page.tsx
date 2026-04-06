'use client'

import { useState } from 'react'
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

export default function TutorLiveClassesPage() {
  const qc = useQueryClient()
  const [showSchedule, setShowSchedule] = useState(false)

  const { data, isLoading } = useQuery('tutorLiveAll', () =>
    api.get('/live-classes').then((r) => r.data)
  )

  const { data: coursesData } = useQuery('tutorCourses', () =>
    api.get('/courses?limit=50').then((r) => r.data)
  )

  const schedule = useMutation(
    (d: ScheduleForm) => api.post('/live-classes', { ...d, scheduledAt: new Date(d.scheduledAt).toISOString() }),
    {
      onSuccess: () => {
        qc.invalidateQueries('tutorLiveAll')
        setShowSchedule(false)
        reset()
      },
    }
  )

  const cancel = useMutation(
    (id: string) => api.delete(`/live-classes/${id}`),
    { onSuccess: () => qc.invalidateQueries('tutorLiveAll') }
  )

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
  })

  const liveClasses = data?.liveClasses ?? []
  const courses     = coursesData?.courses ?? []

  const upcoming = liveClasses.filter((lc: any) => !lc.isEnded && new Date(lc.scheduledAt) > new Date())
  const past     = liveClasses.filter((lc: any) => lc.isEnded || new Date(lc.scheduledAt) <= new Date())

  return (
    <TutorLayout title="Live Classes" breadcrumb="Home / Live Classes">

      <div className="d-flex justify-content-between align-items-center mb-6">
        <div>
          <h5 className="mb-1">Live Classes</h5>
          <p className="text-body-secondary small mb-0">Schedule and manage your live sessions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowSchedule(true)}>
          <i className="ti tabler-plus me-1" />Schedule Class
        </button>
      </div>

      {/* ── Upcoming ─────────────────────────────────────────────────── */}
      <div className="card mb-6">
        <div className="card-header">
          <h5 className="card-title mb-0">Upcoming <span className="badge bg-label-primary ms-1">{upcoming.length}</span></h5>
        </div>
        {isLoading ? (
          <div className="d-flex justify-content-center py-4"><div className="spinner-border text-primary" role="status" /></div>
        ) : upcoming.length === 0 ? (
          <div className="card-body text-body-secondary text-center py-4">No upcoming classes</div>
        ) : (
          <div className="list-group list-group-flush">
            {upcoming.map((lc: any) => (
              <div key={lc.id} className="list-group-item px-4 py-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-3">
                    <div className="avatar bg-label-primary rounded">
                      <i className="ti tabler-video avatar-initial" style={{ fontSize: 16 }} />
                    </div>
                    <div>
                      <span className="fw-medium d-block">{lc.title}</span>
                      <small className="text-body-secondary">
                        {new Date(lc.scheduledAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {' · '}{lc.duration} min · {lc.course?.title}
                      </small>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <a href={`/tutor/live-classes/${lc.id}/start`} className="btn btn-sm btn-success">
                      <i className="ti tabler-video me-1" />Start
                    </a>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => cancel.mutate(lc.id)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Past ─────────────────────────────────────────────────────── */}
      {past.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title mb-0">Past Classes</h5>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="border-top">
                <tr><th>Class</th><th>Course</th><th>Date</th><th>Recording</th></tr>
              </thead>
              <tbody>
                {past.map((lc: any) => (
                  <tr key={lc.id}>
                    <td className="fw-medium">{lc.title}</td>
                    <td><small className="text-body-secondary">{lc.course?.title}</small></td>
                    <td>
                      <small className="text-body-secondary">
                        {new Date(lc.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </small>
                    </td>
                    <td>
                      {lc.recordingUrl
                        ? <a href={lc.recordingUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-info">Watch</a>
                        : <span className="text-body-secondary small">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Schedule modal ─────────────────────────────────────────── */}
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
                      <label className="form-label">Date & Time</label>
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

    </TutorLayout>
  )
}
