'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import Link from 'next/link'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'

export default function LiveClassLessonPage() {
  const { id: courseId, lessonId } = useParams<{ id: string, lessonId: string }>()
  const qc = useQueryClient()

  // 1. Fetch Lesson Data (includes live class info)
  const { data: lessonData, isLoading: isLessonLoading } = useQuery(['lesson', lessonId], () =>
    api.get(`/lessons/${lessonId}`).then((r) => r.data)
  )

  const lesson = lessonData?.lesson
  const liveClass = lesson?.liveClass

  // 2. Progress Mutation
  const markComplete = useMutation((payload: any) =>
    api.post('/progress', { lessonId, ...payload }),
    { onSuccess: () => qc.invalidateQueries(['courseProgress', courseId]) }
  )

  if (isLessonLoading) return (
    <div className="d-flex justify-content-center py-10"><div className="spinner-border text-primary" /></div>
  )

  if (!lesson) return <div className="alert alert-danger">Lesson not found</div>

  return (
    <StudentLayout>
      <div className="mx-auto d-flex flex-column gap-6" style={{ maxWidth: 900 }}>
        {/* Header */}
        <div>
          <nav aria-label="breadcrumb" className="mb-3">
             <ol className="breadcrumb extra-small">
                <li className="breadcrumb-item"><Link href={`/courses/${courseId}`}>Curriculum</Link></li>
                <li className="breadcrumb-item active">Live Session</li>
             </ol>
          </nav>
          <div className="d-flex align-items-center gap-3">
             <div className="avatar avatar-md bg-label-success rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
                <i className="ti tabler-broadcast fs-3"></i>
             </div>
             <h4 className="fw-black text-heading mb-0">{lesson.title}</h4>
          </div>
        </div>

        {/* State 1: Upcoming Card */}
        <div className="card shadow-sm border-0 overflow-hidden">
           <div className="card-header bg-label-primary border-bottom border-primary border-opacity-10 py-3 px-5 d-flex align-items-center gap-2">
              <span className="dot dot-primary bg-primary rounded-circle" style={{ width: 8, height: 8 }}></span>
              <span className="extra-small fw-black text-primary text-uppercase tracking-widest">Upcoming Session</span>
           </div>
           <div className="card-body p-6">
              <div className="row g-6 align-items-center">
                 <div className="col-md-7 border-md-end pr-md-6">
                    <h5 className="fw-bold text-heading mb-4">{liveClass?.topic || 'Discussion & Case Analysis'}</h5>
                    <div className="d-flex flex-column gap-3 mb-6">
                       {[
                         { icon: 'ti tabler-user', label: 'Instructor', val: lesson.tutor?.name || 'Expert Faculty' },
                         { icon: 'ti tabler-calendar-event', label: 'Schedule', val: liveClass?.startTime ? new Date(liveClass.startTime).toLocaleString() : 'TBA' },
                         { icon: 'ti tabler-brand-zoom', label: 'Platform', val: 'In-app Video Hub' },
                       ].map(item => (
                         <div key={item.label} className="d-flex align-items-start gap-3 small">
                            <i className={`${item.icon} text-primary mt-1`}></i>
                            <div className="flex-grow-1">
                               <p className="extra-small text-body-secondary mb-0">{item.label}</p>
                               <p className="small fw-bold text-heading mb-0">{item.val}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                    <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2 px-4 fw-bold">
                       <i className="ti tabler-calendar-plus"></i> Add to Calendar
                    </button>
                 </div>
                 <div className="col-md-5 ps-md-6 text-center">
                    <p className="extra-small fw-black text-body-secondary text-uppercase tracking-tighter mb-4">Starts In</p>
                    <div className="d-flex justify-content-center gap-3 mb-4">
                       {[
                         { val: '00', label: 'Days' },
                         { val: '01', label: 'Hrs' },
                         { val: '24', label: 'Min' },
                       ].map(d => (
                         <div key={d.label}>
                            <div className="bg-label-primary rounded border border-primary border-opacity-10 d-flex align-items-center justify-content-center shadow-sm" style={{ width: 56, height: 56 }}>
                               <span className="h4 fw-black text-primary mb-0">{d.val}</span>
                            </div>
                            <p className="extra-small text-body-secondary mt-2 mb-0">{d.label}</p>
                         </div>
                       ))}
                    </div>
                    <span className="extra-small bg-label-secondary px-3 py-1 rounded-pill">Status: Scheduled</span>
                 </div>
              </div>
           </div>
        </div>

        {/* State 2: Live Now Card (Conditional) */}
        <div className="card shadow-md border-success border-2 bg-success bg-opacity-10">
           <div className="card-body p-6 d-flex flex-column flex-md-row align-items-md-center gap-6">
              <div className="avatar avatar-xl bg-success bg-opacity-15 rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 animate-pulse">
                 <i className="ti tabler-video text-success fs-1"></i>
              </div>
              <div className="flex-grow-1 border-md-end pr-md-6 border-success border-opacity-10">
                 <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="badge bg-success rounded-pill extra-small px-3">LIVE NOW</span>
                    <span className="extra-small text-success fw-bold">Join 128 other students</span>
                 </div>
                 <h5 className="fw-black text-heading mb-2">The session is currently in progress</h5>
                 <p className="small text-body-secondary mb-0 lh-base">Interactive live session with faculty. Have your questions ready!</p>
              </div>
              <div className="flex-shrink-0 text-center">
                 <button className="btn btn-success btn-lg px-8 py-3 fw-black shadow-sm mb-2 rounded-3">
                    <i className="ti tabler-broadcast me-2 fs-5"></i>Join Live Now
                 </button>
                 <p className="extra-small text-body-secondary mb-0">No login required for portal</p>
              </div>
           </div>
        </div>

        {/* State 3: Recording Holder */}
        <div className="card shadow-sm border-0 bg-body-tertiary">
           <div className="card-body p-6">
              <div className="d-flex align-items-center gap-3 mb-6">
                 <div className="avatar avatar-md bg-label-secondary rounded-circle"><i className="ti tabler-video-off fs-4"></i></div>
                 <div>
                    <h6 className="fw-black text-heading mb-0">Class Recording</h6>
                    <p className="extra-small text-body-secondary mb-0">Recordings are typically available within 2-4 hours after the class.</p>
                 </div>
              </div>
              <div className="bg-dark rounded-4 position-relative overflow-hidden d-flex align-items-center justify-content-center" style={{ aspectRatio: '21/9', opacity: 0.8 }}>
                 <div className="text-center text-white p-6">
                    <i className="ti tabler-lock fs-1 mb-3 opacity-50"></i>
                    <p className="fw-bold mb-0">Post-Session Recording Coming Soon</p>
                    <p className="extra-small opacity-75">Once the session ends, the full HD recording will be available here indefinitely.</p>
                 </div>
              </div>
           </div>
        </div>

        <style jsx>{`
          .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .7; } }
          .dot-primary { animation: dot-pulse 1.5s infinite; }
          @keyframes dot-pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(115,103,240,0.7); } 70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(115,103,240,0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(115,103,240,0); } }
        `}</style>
      </div>
    </StudentLayout>
  )
}
