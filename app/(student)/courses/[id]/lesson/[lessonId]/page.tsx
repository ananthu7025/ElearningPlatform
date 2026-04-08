'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useState } from 'react'
import Link from 'next/link'
import MuxPlayer from '@mux/mux-player-react'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'

export default function VideoLessonPage() {
  const { id: courseId, lessonId } = useParams<{ id: string, lessonId: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('Overview')

  // 1. Fetch Lesson Data
  const { data: lessonData, isLoading: isLessonLoading } = useQuery(['lesson', lessonId], () =>
    api.get(`/lessons/${lessonId}`).then((r) => r.data)
  )

  // 2. Fetch Doubts (Q&A)
  const { data: doubtsData } = useQuery(['doubts', lessonId], () =>
    api.get(`/doubts?lessonId=${lessonId}`).then((r) => r.data)
  )

  const lesson = lessonData?.lesson
  const doubts = doubtsData?.doubts ?? []

  // 3. Progress Mutation
  const markComplete = useMutation((payload: any) =>
    api.post('/progress', { lessonId, ...payload }),
    { onSuccess: () => qc.invalidateQueries(['courseProgress', courseId]) }
  )

  if (isLessonLoading) return (
    <div className="d-flex justify-content-center py-10"><div className="spinner-border text-primary" /></div>
  )

  if (!lesson) return <div className="alert alert-danger">Lesson not found</div>

  return (
    <div className="min-vh-100 bg-body-tertiary">
      {/* Top bar */}
      <div className="sticky-top bg-white border-bottom shadow-sm d-flex align-items-center gap-3 px-4" style={{ height: 60, zIndex: 50 }}>
        <Link href={`/courses/${courseId}`} className="d-flex align-items-center gap-2 small text-body-secondary text-decoration-none hover-text-primary transition-all">
          <i className="ti tabler-arrow-left"></i>
          <span className="fw-medium">Back to Course</span>
        </Link>
        <div className="vr h-50 mx-2"></div>
        <span className="small fw-bold text-heading text-truncate" style={{ maxWidth: 300 }}>{lesson.title}</span>
        
        <div className="ms-auto d-flex align-items-center gap-3">
           <div className="d-none d-md-block text-end">
              <p className="extra-small text-body-secondary mb-0">Module Progress</p>
              <div className="progress rounded-pill bg-label-secondary mt-1" style={{ width: 120, height: 6 }}>
                 <div className="progress-bar bg-primary" style={{ width: '45%' }}></div>
              </div>
           </div>
           <button 
            className={`btn btn-sm ${markComplete.isSuccess ? 'btn-success' : 'btn-primary'} fw-bold px-4`}
            onClick={() => markComplete.mutate({ completed: true })}
            disabled={markComplete.isLoading}
           >
             {markComplete.isSuccess ? 'Completed ✓' : 'Mark Complete'}
           </button>
        </div>
      </div>

      <div className="d-flex flex-column flex-lg-row" style={{ minHeight: 'calc(100vh - 60px)' }}>
        {/* Left main content: Video Player */}
        <div className="flex-grow-1 overflow-auto bg-black d-flex flex-column">
          <div className="w-100 position-relative" style={{ aspectRatio: '16/9', maxHeight: '75vh' }}>
            {lesson.muxPlaybackId ? (
              <MuxPlayer
                playbackId={lesson.muxPlaybackId}
                metadata={{ video_title: lesson.title }}
                className="w-100 h-100"
                onEnded={() => markComplete.mutate({ completed: true })}
              />
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100 text-white opacity-50">
                 <div className="text-center">
                    <i className="ti tabler-video-off fs-1 mb-2"></i>
                    <p>Video is being processed...</p>
                 </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 border-bottom">
             <div className="d-flex align-items-center gap-3 mb-4">
                <button className="btn btn-outline-secondary btn-sm"><i className="ti tabler-chevron-left me-1"></i>Prev</button>
                <button className="btn btn-outline-secondary btn-sm">Next<i className="ti tabler-chevron-right ms-1"></i></button>
                <span className="badge bg-label-primary px-3 py-2 ms-auto">VIDEO LESSON</span>
             </div>
             <h4 className="fw-bold text-heading mb-2">{lesson.title}</h4>
             <p className="small text-body-secondary mb-0">
               {lesson.durationSeconds ? `${Math.round(lesson.durationSeconds / 60)} minutes` : '15 minutes'} duration · Free Preview Available
             </p>
          </div>
        </div>

        {/* Right sidebar: Tabs (Notes, Q&A) */}
        <div className="bg-white border-start d-flex flex-column flex-shrink-0 shadow-sm" style={{ width: 380 }}>
          <div className="d-flex border-bottom sticky-top bg-white" style={{ top: 0 }}>
            {['Overview', 'Q&A', 'Notes'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-grow-1 py-4 small fw-bold border-0 bg-transparent transition-all ${
                  activeTab === tab 
                    ? 'text-primary border-bottom border-2 border-primary active-tab shadow-inner' 
                    : 'text-body-secondary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-grow-1 overflow-auto p-5 pb-10">
            {activeTab === 'Overview' && (
              <div className="animate-in">
                 <p className="extra-small fw-bold text-body-secondary text-uppercase tracking-wider mb-4">Lesson Resources</p>
                 <div className="card bg-label-secondary border-0 mb-6">
                    <div className="card-body p-4 d-flex align-items-center gap-3">
                       <div className="avatar avatar-sm bg-label-danger rounded-circle d-flex align-items-center justify-content-center">
                          <i className="ti tabler-file-text"></i>
                       </div>
                       <div className="flex-grow-1">
                          <p className="small fw-bold text-heading mb-0">Case Briefs.pdf</p>
                          <p className="extra-small text-body-secondary mb-0">2.4 MB</p>
                       </div>
                       <i className="ti tabler-download text-body-secondary cursor-pointer hover-text-primary"></i>
                    </div>
                 </div>

                 <p className="extra-small fw-bold text-body-secondary text-uppercase tracking-wider mb-4">About the Lesson</p>
                 <div className="prose extra-small text-heading lh-base" dangerouslySetInnerHTML={{ __html: lesson.content || 'No detailed description available.' }} />
              </div>
            )}

            {activeTab === 'Q&A' && (
              <div className="animate-in">
                 <div className="mb-6">
                    <textarea 
                      className="form-control bg-body-tertiary border-0 small p-3" 
                      rows={3} 
                      placeholder="Ask a doubt about this lesson..."
                    />
                    <button className="btn btn-primary btn-sm w-100 mt-3 fw-bold">Post Question</button>
                 </div>

                 <p className="extra-small fw-bold text-body-secondary text-uppercase tracking-wider mb-4">Recent Discussions ({doubts.length})</p>
                 <div className="d-flex flex-column gap-4">
                    {doubts.length === 0 ? (
                      <div className="text-center py-6 opacity-50">
                        <i className="ti tabler-message-2 fs-2 mb-2"></i>
                        <p className="small mb-0">No questions yet. Be the first!</p>
                      </div>
                    ) : doubts.map((d: any) => (
                      <div key={d.id} className="border-bottom pb-4">
                         <div className="d-flex align-items-center gap-2 mb-2">
                            <div className="avatar avatar-xs bg-label-primary rounded-circle"><span className="extra-small fw-bold">U</span></div>
                            <span className="extra-small fw-bold text-heading">User · <span className="text-body-secondary fw-normal">2h ago</span></span>
                         </div>
                         <p className="extra-small text-heading mb-2">{d.question}</p>
                         <div className="ms-4 ps-3 border-start border-2 border-primary">
                            <p className="extra-small text-body-secondary fst-italic">Awaiting tutor response...</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {activeTab === 'Notes' && (
              <div className="animate-in">
                 <div className="bg-label-info p-4 rounded mb-6">
                    <p className="extra-small text-info mb-0">
                      <i className="ti tabler-info-circle me-1"></i> Personal notes are private and only visible to you.
                    </p>
                 </div>
                 <div className="border rounded p-3 mb-6 bg-white">
                    <textarea 
                      className="form-control border-0 p-0 shadow-none extra-small" 
                      rows={4} 
                      placeholder="Capture key points here..."
                    />
                    <div className="d-flex justify-content-between align-items-center border-top pt-3 mt-3">
                       <span className="extra-small text-body-secondary">Saving automatically...</span>
                       <button className="btn btn-primary btn-sm extra-small">Add Note</button>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        .active-tab { background-color: rgba(115,103,240,0.03) !important; }
        .animate-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
